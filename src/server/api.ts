import { Router, Request, Response, NextFunction } from "express";
import Database from 'better-sqlite3';
import { db, dbPath, pruneBackups, backupDatabase } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Parser from "rss-parser";
import crypto from "crypto";
import path from "path";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
// `sharp` is optional at runtime; dynamically import when needed to avoid startup failure

export const apiRouter = Router();
console.log("[API] apiRouter initialized and loaded");

// Simple request logger to help diagnose if the server is alive
apiRouter.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

apiRouter.get("/public/admin-challenge", (req, res) => {
  // We don't send the secret, we just check it via POST. 
  res.json({ enabled: true });
});

apiRouter.post("/public/admin-challenge/verify", (req, res) => {
  const { answer } = req.body;
  const secretRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_secret') as any;
  const storedSecret = (secretRow?.value || "waynee").toString();
  
  const normalizedAnswer = (answer || "").toLowerCase().trim();
  const normalizedSecret = storedSecret.toLowerCase().trim();
  const isMatch = normalizedAnswer === normalizedSecret;
  
  if (isMatch) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Incorrect answer" });
  }
});

// Admin only update
apiRouter.get("/admin/settings/secret", authMiddleware, authorizeRole('admin'), (req, res) => {
  const secretRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_secret') as any;
  res.json({ secret: secretRow?.value || "waynee" });
});

apiRouter.post("/admin/settings/secret", authMiddleware, authorizeRole('admin'), (req, res) => {
  const { secret } = req.body;
  if (!secret) return res.status(400).json({ error: "Secret required" });
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(secret, 'admin_secret');
  logAction(req, 'UPDATE', 'admin_secret');
  res.json({ success: true });
});

// Fallback secret only for development
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("FATAL: JWT_SECRET environment variable is not set in production!");
  process.exit(1);
}
const ACTUAL_SECRET = JWT_SECRET || "dev_only_secret_123456789";

// Check Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = req.cookies.admin_token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
  
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, ACTUAL_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Role Authorization Middleware
function authorizeRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden: You do not have permission to perform this action." });
    }
  };
}

// Audit Logging Helper
function logAction(req: any, action: string, resource: string, resource_id?: string | number | bigint, details?: any) {
  try {
    const username = req.user?.username || 'unknown';
    const role = req.user?.role || 'unknown';
    const detailsStr = details ? JSON.stringify(details) : null;
    
    db.prepare(`
      INSERT INTO audit_logs (username, role, action, resource, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, role, action, resource, resource_id?.toString() || null, detailsStr);
  } catch (err) {
    console.error("[AuditLog] Failed to record log:", err);
  }
}

// Configure Multer for secure image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "upl-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  }
});

// Specific Limiters for high-value targets
const authLimiter = (req: Request, res: Response, next: NextFunction) => next(); // Disabled for diagnostics
/*
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 attempts per hour
  message: { error: "Too many login attempts. Please try again in an hour." }
});
*/

const shoutoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 shoutouts per minute
  message: { error: "Whoa there! Too many shoutouts. Take a breather." }
});

// Global error handler wrapper for async routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const toSlug = (value: string) => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `post-${Date.now()}`;
};

const uniqueBlogSlug = (title: string, currentId?: string) => {
  const baseSlug = toSlug(title);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = db.prepare("SELECT id FROM blogs WHERE slug = ?").get(slug) as { id: string } | undefined;
    if (!existing || existing.id === currentId) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const cleanBlogInput = (body: any) => {
  const title = (body.title || "").toString().trim();
  const content = (body.content || "").toString().trim();
  const excerpt = (body.excerpt || "").toString().trim();
  const image_url = (body.image_url || "").toString().trim();
  const is_published = body.is_published === false || body.is_published === 0 || body.is_published === "0" ? 0 : 1;

  return { title, content, excerpt, image_url, is_published };
};

const BlogSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  is_published: z.union([z.boolean(), z.number()]).transform(v => !!v)
});

// ------ PUBLIC ROUTES ------

apiRouter.get("/public/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {key: string, value: string}[];
  const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(settings);
});

apiRouter.get("/public/popups", (req, res) => {
  try {
    const popups = db.prepare("SELECT * FROM popups WHERE is_active = 1 AND type = 'permanent' ORDER BY created_at DESC").all();
    res.json(popups || []);
  } catch (err) {
    console.error("[API] Failed to fetch public popups:", err);
    res.json([]); // Return empty array instead of 500 to keep the frontend working
  }
});

apiRouter.get("/public/djs", (req, res) => {
  const djs = db.prepare("SELECT * FROM djs").all();
  res.json(djs);
});

apiRouter.get("/public/schedule", (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, d.name as dj_name, d.image_url as dj_photo, d.bio as dj_bio,
           d.instagram, d.soundcloud, d.mixcloud
    FROM schedule s
    JOIN djs d ON s.dj_id = d.id
    ORDER BY s.day_of_week, s.start_time
  `).all();
  res.json(schedule);
});

import { getPodcastFeed, clearPodcastCache } from "./utils.js";

apiRouter.get("/public/podcasts", asyncHandler(async (req: Request, res: Response) => {
  const feed = await getPodcastFeed();
  res.json(feed);
}));

apiRouter.get("/public/blogs", (req, res) => {
  const blogs = db.prepare(`
    SELECT id, slug, title, excerpt, image_url, content, created_at, updated_at
    FROM blogs
    WHERE is_published = 1
    ORDER BY datetime(created_at) DESC
  `).all();
  res.json(blogs);
});

apiRouter.get("/public/blogs/:slug", (req, res) => {
  const blog = db.prepare(`
    SELECT id, slug, title, excerpt, image_url, content, created_at, updated_at
    FROM blogs
    WHERE slug = ? AND is_published = 1
  `).get(req.params.slug);

  if (!blog) return res.status(404).json({ error: "Blog post not found" });
  res.json(blog);
});

apiRouter.get("/public/status", (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("is_on_air") as {value: string};
  res.json({ is_on_air: row?.value === '1' });
});

apiRouter.post("/public/book-artist", (req, res) => {
  const { dj_id, client_name, client_email, event_date, message } = req.body;
  if (!dj_id || !client_name || !client_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // Senior Dev: Use randomUUID with a fallback for older Node versions
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  db.prepare("INSERT INTO bookings (id, dj_id, client_name, client_email, event_date, message) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, dj_id, client_name, client_email, event_date, message);
  res.json({ success: true, id });
});

apiRouter.post("/public/shoutout", shoutoutLimiter, (req, res) => {
  const { email, message, type } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: "Email and message required" });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Automatically save shoutout users as chat users if they don't exist
  const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(email);
  if (!existingUser) {
    try {
      const placeholderPass = crypto.randomBytes(16).toString('hex');
      const hash = bcrypt.hashSync(placeholderPass, 10);
      db.prepare("INSERT INTO users (username, password_hash, source) VALUES (?, ?, ?)").run(email, hash, 'shoutout');
    } catch (err) {
      // Silently ignore unique constraint race conditions
    }
  }

  const info = db.prepare("INSERT INTO shoutouts (listener_name, message, type) VALUES (?, ?, ?)").run(email, message, type || 'text');
  
  const io = req.app.get('io');
  if (io) {
    io.emit('new_shoutout', { id: info.lastInsertRowid, listener_name: email, message, type });
  }
  
  res.json({ success: true });
});

// ------ PUBLIC AUTH ROUTES ------

apiRouter.post("/public/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email address" });
  
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username, password_hash, source) VALUES (?, ?, ?)").run(email, hash, 'register');
    const token = jwt.sign({ userId: info.lastInsertRowid, username: email }, ACTUAL_SECRET, { expiresIn: "7d" });
    res.cookie("user_token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true, username: email });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

apiRouter.post("/public/auth/login", authLimiter, (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(email) as any;
  
  if (user && user.is_banned) {
    return res.status(403).json({ error: "This account has been suspended." });
  }

  if (user && bcrypt.compareSync(password, user.password_hash)) {
    const token = jwt.sign({ userId: user.id, username: user.username }, ACTUAL_SECRET, { expiresIn: "7d" });
    res.cookie("user_token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true, username: user.username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

apiRouter.post("/public/auth/logout", (req, res) => {
  res.clearCookie("user_token", { sameSite: "none", secure: true });
  res.json({ success: true });
});

apiRouter.get("/public/auth/check", (req, res) => {
  const token = req.cookies.user_token;
  if (!token) return res.json({ loggedIn: false });
  try {
    const decoded = jwt.verify(token, ACTUAL_SECRET) as any;
    res.json({ loggedIn: true, username: decoded.username });
  } catch(e) {
    res.json({ loggedIn: false });
  }
});

async function trackGeo(req: any) {
  try {
    // Get IP from headers (behind proxy)
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    
    if (ip && ip !== '::1' && ip !== '127.0.0.1') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for geo lookup
      
      try {
        const resp = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === 'success') {
            // Legacy counters
            db.prepare(`
              INSERT INTO geo_stats (country_code, country_name, count)
              VALUES (?, ?, 1)
              ON CONFLICT(country_code) DO UPDATE SET count = geo_stats.count + 1
            `).run(data.countryCode, data.country);

            // New event log
            db.prepare("INSERT INTO analytics_events (category, event_key) VALUES (?, ?)").run('geo_view', data.country);
          }
        }
      } catch (innerErr) {
        clearTimeout(timeoutId);
        console.warn(`[Geo] Lookup failed for ${ip}: ${innerErr instanceof Error ? innerErr.message : 'timeout'}`);
      }
    }
  } catch (e) {
    console.error("Geo tracking wrapper failed:", e);
  }
}

apiRouter.post("/public/analytics/track", (req: any, res: any) => {
  const { category } = req.body;
  
  if (['page_views', 'stream_starts'].includes(category)) {
    // Only track page_views once per session (15 mins) to keep visits accurate
    if (category === 'page_views') {
      const lastTracked = req.cookies.last_visit_track;
      const now = Date.now();
      
      if (lastTracked && (now - parseInt(lastTracked)) < 15 * 60 * 1000) {
        return res.json({ success: true, skipped: true });
      }
      
      res.cookie('last_visit_track', now.toString(), { maxAge: 15 * 60 * 1000, httpOnly: true, sameSite: 'none', secure: true });
      trackGeo(req);
    }

    // Legacy counters
    db.prepare("UPDATE site_stats SET count = count + 1 WHERE category = ?").run(category);
    
    // New event log
    db.prepare("INSERT INTO analytics_events (category) VALUES (?)").run(category);
  }
  res.json({ success: true });
});

apiRouter.post("/public/analytics/podcast-play", (req: any, res: any) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  
  // Prevent double counting of the same podcast in the same session (1 hour)
  const sessionKey = `play_${Buffer.from(title).toString('base64').substring(0, 32)}`;
  if (req.cookies[sessionKey]) {
    return res.json({ success: true, skipped: true });
  }

  res.cookie(sessionKey, '1', { maxAge: 60 * 60 * 1000, httpOnly: true, sameSite: 'none', secure: true });

  // Legacy counters
  db.prepare(`
    INSERT INTO podcast_analytics (title, plays, last_played) 
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(title) DO UPDATE SET plays = plays + 1, last_played = CURRENT_TIMESTAMP
  `).run(title);
  
  // New event log
  db.prepare("INSERT INTO analytics_events (category, event_key) VALUES (?, ?)").run('podcast_play', title);

  res.json({ success: true });
});

// ------ ADMIN AUTH ROUTES ------

apiRouter.post("/admin/login", authLimiter, (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[Admin Login] ATTEMPT | User: "${username}" | IP: ${ip}`);
  
  if (!username || !password) {
    console.warn(`[Admin Login] FAILED | Missing credentials | IP: ${ip}`);
    return res.status(400).json({ error: "Username and password are required" });
  }
  
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username) as any;
  
  if (admin) {
    const isMatched = bcrypt.compareSync(password, admin.password_hash);
    console.log(`[Admin Login] INFO | User found | Password Match: ${isMatched}`);
    
    if (isMatched) {
      console.log(`[Admin Login] SUCCESS | User: ${username} | IP: ${ip}`);
      const token = jwt.sign({ username: admin.username, role: admin.role }, ACTUAL_SECRET, { expiresIn: "1d" });
      res.cookie("admin_token", token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        path: '/' 
      });
      return res.json({ success: true, token, user: { username: admin.username, role: admin.role } });
    } else {
      console.warn(`[Admin Login] FAILED | Invalid password | User: ${username} | IP: ${ip}`);
    }
  } else {
    console.warn(`[Admin Login] FAILED | User not found | User: "${username}" | IP: ${ip}`);
  }
  
  res.status(401).json({ error: "Invalid credentials" });
});

apiRouter.post("/admin/logout", (req, res) => {
  res.clearCookie("admin_token", { sameSite: "none", secure: true, path: '/' });
  res.json({ success: true });
});

apiRouter.get("/admin/check", authMiddleware, (req: any, res: any) => {
  res.json({ loggedIn: true, user: req.user });
});

// ------ ADMIN PROTECTED ROUTES ------

apiRouter.use("/admin", authMiddleware);

apiRouter.post("/admin/upload", upload.single("image"), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  
  const processedFilename = `opt-${req.file.filename.split('.')[0]}.webp`;
  const outputPath = path.join(process.cwd(), "public", "uploads", processedFilename);

  // Secure local cleanup
  const oldUrl = req.body.oldUrl;
  if (oldUrl && typeof oldUrl === 'string' && oldUrl.startsWith('/uploads/')) {
    try {
      const fileName = path.basename(oldUrl);
      const filePath = path.join(process.cwd(), "public", "uploads", fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[API] Replaced and deleted old image: ${fileName}`);
      }
    } catch (err) {
      console.error(`[API] Error cleaning up old image ${oldUrl}:`, err);
      // We don't block the new upload if deletion fails, just log it
    }
  }

  try {
    let sharpLib = null;
    try {
      // @ts-ignore: optional dependency, may not be installed in all environments
      const mod: any = await import('sharp');
      sharpLib = mod.default || mod;
    } catch (e) {
      console.warn('[API] sharp is not installed; skipping image optimization');
    }

    if (sharpLib) {
      await sharpLib(req.file.path)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      // Remove original unoptimized file
      fs.unlinkSync(req.file.path);
      res.json({ url: `/uploads/${processedFilename}` });
    } else {
      // Move the uploaded file to the intended optimized filename as a fallback
      const fallbackDest = outputPath.replace(/\.webp$/, path.extname(req.file.originalname) || '.png');
      fs.copyFileSync(req.file.path, fallbackDest);
      fs.unlinkSync(req.file.path);
      const fallbackName = path.basename(fallbackDest);
      res.json({ url: `/uploads/${fallbackName}`, notice: 'Image uploaded without optimization (sharp missing)' });
    }
  } catch (err) {
    res.status(500).json({ error: "Image optimization failed" });
  }
});

apiRouter.get("/admin/analytics", (req: any, res: any) => {
  const { range } = req.query; // 'today', '7d', '30d', 'all'
  const io = req.app.get('io');
  const realtimeListeners = io?.engine.clientsCount || 0;

  let timeFilter = "";
  if (range === 'today') timeFilter = " AND timestamp >= date('now')";
  else if (range === '7d') timeFilter = " AND timestamp >= date('now', '-7 days')";
  else if (range === '30d') timeFilter = " AND timestamp >= date('now', '-30 days')";

  try {
    // Site visits (page_views)
    const pageViewsRow = db.prepare(`SELECT COUNT(*) as count FROM analytics_events WHERE category = 'page_views' ${timeFilter}`).get() as any;
    const pageViews = pageViewsRow?.count || 0;
    
    // Podcast Plays
    const podcastPlaysRow = db.prepare(`SELECT COUNT(*) as count FROM analytics_events WHERE category = 'podcast_play' ${timeFilter}`).get() as any;
    const podcastPlays = podcastPlaysRow?.count || 0;

    // Top Podcasts for the range
    const topPodcasts = db.prepare(`
      SELECT event_key as name, COUNT(*) as plays 
      FROM analytics_events 
      WHERE category = 'podcast_play' ${timeFilter}
      GROUP BY event_key 
      ORDER BY plays DESC 
      LIMIT 5
    `).all();

    // Geo Data for the range
    const geoStats = db.prepare(`
      SELECT event_key as name, COUNT(*) as count 
      FROM analytics_events 
      WHERE category = 'geo_view' ${timeFilter}
      GROUP BY event_key 
      ORDER BY count DESC 
      LIMIT 5
    `).all() as {name: string, count: number}[];

    const totalGeo = geoStats.reduce((sum, g) => sum + g.count, 0) || 1;
    const geoData = geoStats.map((g, i) => ({
      name: g.name,
      value: Math.round((g.count / totalGeo) * 100),
      color: ['#B026FF', '#00d2ff', '#facc15', '#10b981', '#6b7280'][i % 5]
    }));

    // Range-aware Hourly Pattern (Page Views as proxy for activity level)
    const retentionRows = db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as activity 
      FROM analytics_events 
      WHERE category = 'page_views' ${timeFilter}
      GROUP BY hour
      ORDER BY hour ASC
    `).all() as {hour: string, activity: number}[];

    const retentionData = Array.from({length: 24}, (_, i) => {
      const hourStr = i.toString().padStart(2, '0');
      const found = retentionRows.find(r => r.hour === hourStr);
      return {
        time: `${hourStr}:00`,
        listeners: found ? found.activity : 0
      };
    });

    // Peak listeners (overall)
    const peakRow = db.prepare("SELECT count FROM site_stats WHERE category = 'peak_listeners'").get() as {count: number};
    const peakListenersOverall = peakRow?.count || 0;

    res.json({
      realtimeListeners,
      monthlyListeners: pageViews,
      peakListeners: Math.max(realtimeListeners, peakListenersOverall),
      totalPodcastPlays: podcastPlays,
      topPodcasts: topPodcasts.map((p: any, i: number) => ({
        ...p,
        color: ['#B026FF', '#00d2ff', '#facc15', '#10b981', '#6b7280'][i % 5]
      })),
      geoData,
      retentionData 
    });

    const currentHour = new Date().getHours();
    // Update overall peak
    const overallPeak = peakListenersOverall;
    if (realtimeListeners > overallPeak) {
      db.prepare("INSERT INTO site_stats (category, count) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET count = excluded.count")
        .run('peak_listeners', realtimeListeners);
    }
    // Update hourly peak
    db.prepare("UPDATE hourly_stats SET peak_listeners = ? WHERE hour = ? AND peak_listeners < ?")
      .run(realtimeListeners, currentHour, realtimeListeners);
  } catch (err) {
    console.error("Analytics fetch error:", err);
    res.status(500).json({ error: "Failed to process analytics data" });
  }
});

apiRouter.delete("/admin/analytics/purge", authorizeRole('admin'), (req: any, res: any) => {
  logAction(req, 'PURGE', 'analytics');
  db.prepare("DELETE FROM analytics_events").run();
  db.prepare("DELETE FROM geo_stats").run();
  db.prepare("DELETE FROM podcast_analytics").run();
  db.prepare("UPDATE site_stats SET count = 0").run();
  // Reset peak listeners specifically
  db.prepare("INSERT INTO site_stats (category, count) VALUES (?, ?) ON CONFLICT(category) DO UPDATE SET count = 0").run('peak_listeners', 0);
  db.prepare("UPDATE hourly_stats SET peak_listeners = 0").run();
  res.json({ success: true });
});

apiRouter.get("/admin/profile", (req: any, res: any) => {
  const admin = db.prepare("SELECT username, bio, photo_url FROM admins WHERE username = ?").get(req.user.username);
  res.json(admin);
});

apiRouter.put("/admin/profile", (req: any, res: any) => {
  const { bio, photo_url } = req.body;
  db.prepare("UPDATE admins SET bio=?, photo_url=? WHERE username=?").run(bio || "", photo_url || "", req.user.username);
  res.json({ success: true });
});

apiRouter.get("/admin/djs", (req, res) => {
  const djs = db.prepare("SELECT * FROM djs").all();
  res.json(djs);
});

apiRouter.post("/admin/djs", (req, res) => {
  const { name, bio, image_url, instagram, soundcloud, mixcloud } = req.body;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO djs (id, name, bio, image_url, instagram, soundcloud, mixcloud) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, name, bio, image_url, instagram, soundcloud, mixcloud);
  logAction(req, 'CREATE', 'dj', id, { name });
  res.json({ success: true, id });
});

apiRouter.put("/admin/djs/:id", (req, res) => {
  const { name, bio, image_url, instagram, soundcloud, mixcloud } = req.body;
  db.prepare("UPDATE djs SET name = ?, bio = ?, image_url = ?, instagram = ?, soundcloud = ?, mixcloud = ? WHERE id = ?")
    .run(name, bio, image_url, instagram, soundcloud, mixcloud, req.params.id);
  logAction(req, 'UPDATE', 'dj', req.params.id, { name });
  res.json({ success: true });
});

apiRouter.delete("/admin/djs/:id", (req, res) => {
  // Professional cleanup: Delete the image file from disk if it's a local upload
  const dj = db.prepare("SELECT image_url FROM djs WHERE id = ?").get(req.params.id) as any;
  if (dj?.image_url?.startsWith('/uploads/')) {
    try {
      const filePath = path.join(process.cwd(), "public", "uploads", path.basename(dj.image_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[API] Failed to cleanup DJ image on deletion:", e);
    }
  }

  // First clear schedule entries
  try { db.prepare("DELETE FROM schedule WHERE dj_id = ?").run(req.params.id); } catch(e) {}
  db.prepare("DELETE FROM djs WHERE id = ?").run(req.params.id);
  logAction(req, 'DELETE', 'dj', req.params.id);
  res.json({ success: true });
});

apiRouter.get("/admin/popups", (req, res) => {
  const popups = db.prepare("SELECT * FROM popups ORDER BY created_at DESC").all();
  res.json(popups);
});

apiRouter.post("/admin/popups", (req, res) => {
  const { heading, text, btn_text, btn_link, type, is_active } = req.body;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO popups (id, heading, text, btn_text, btn_link, type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, heading, text, btn_text, btn_link, type, is_active ? 1 : 0);
  logAction(req, 'CREATE', 'popup', id, { heading });
  res.json({ success: true, id });
});

apiRouter.delete("/admin/popups/:id", (req, res) => {
  db.prepare("DELETE FROM popups WHERE id = ?").run(req.params.id);
  logAction(req, 'DELETE', 'popup', req.params.id);
  res.json({ success: true });
});

apiRouter.post("/admin/push-popup", authorizeRole('admin'), (req, res) => {
  const { heading, text, btnText, btnLink } = req.body;
  const io = req.app.get('io');
  if (io) {
    io.emit('show_popup', { heading, text, btnText, btnLink });
  }
  logAction(req, 'PUSH_POPUP', 'popup', null, { heading });
  res.json({ success: true });
});

apiRouter.get("/admin/blogs", (req, res) => {
  const blogs = db.prepare(`
    SELECT *
    FROM blogs
    ORDER BY datetime(created_at) DESC
  `).all();
  res.json(blogs);
});

apiRouter.post("/admin/blogs", (req, res) => {
  const { title, content, excerpt, image_url, is_published } = cleanBlogInput(req.body);

  if (!title || !content) {
    return res.status(400).json({ error: "Title and post text are required" });
  }

  const id = crypto.randomUUID();
  const slug = uniqueBlogSlug(title);

  db.prepare(`
    INSERT INTO blogs (id, slug, title, excerpt, image_url, content, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, slug, title, excerpt, image_url, content, is_published);
  logAction(req, 'CREATE', 'blog', id, { title });

  res.json({ success: true, id, slug });
});

apiRouter.put("/admin/blogs/:id", (req, res) => {
  const existing = db.prepare("SELECT id FROM blogs WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Blog post not found" });

  const { title, content, excerpt, image_url, is_published } = cleanBlogInput(req.body);
  if (!title || !content) {
    return res.status(400).json({ error: "Title and post text are required" });
  }

  const slug = uniqueBlogSlug(title, req.params.id);
  db.prepare(`
    UPDATE blogs
    SET slug = ?, title = ?, excerpt = ?, image_url = ?, content = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(slug, title, excerpt, image_url, content, is_published, req.params.id);
  logAction(req, 'UPDATE', 'blog', req.params.id, { title });

  res.json({ success: true, slug });
});

apiRouter.delete("/admin/blogs/:id", (req, res) => {
  // Professional cleanup: Delete the blog image from disk if it's a local upload
  const blog = db.prepare("SELECT image_url FROM blogs WHERE id = ?").get(req.params.id) as any;
  if (blog?.image_url?.startsWith('/uploads/')) {
    try {
      const filePath = path.join(process.cwd(), "public", "uploads", path.basename(blog.image_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[API] Failed to cleanup blog image on deletion:", e);
    }
  }

  db.prepare("DELETE FROM blogs WHERE id = ?").run(req.params.id);
  logAction(req, 'DELETE', 'blog', req.params.id);
  res.json({ success: true });
});

apiRouter.get("/admin/bookings", (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, d.name as dj_name 
    FROM bookings b 
    JOIN djs d ON b.dj_id = d.id 
    ORDER BY created_at DESC
  `).all();
  res.json(bookings);
});

apiRouter.put("/admin/bookings/:id/status", (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

apiRouter.delete("/admin/bookings/:id", (req, res) => {
  db.prepare("DELETE FROM bookings WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

apiRouter.get("/admin/shoutouts", (req, res) => {
  const shoutouts = db.prepare("SELECT * FROM shoutouts ORDER BY timestamp DESC LIMIT 100").all();
  res.json(shoutouts);
});

apiRouter.delete("/admin/shoutouts/all", authorizeRole('admin'), (req, res) => {
  db.prepare("DELETE FROM shoutouts").run();

  // Notify all connected clients in real-time that interactions are gone
  const io = req.app.get('io');
  if (io) {
    io.emit('shoutouts_cleared');
  }

  logAction(req, 'PURGE', 'shoutouts');
  res.json({ success: true });
});

apiRouter.delete("/admin/shoutouts/:id", (req, res) => {
  db.prepare("DELETE FROM shoutouts WHERE id = ?").run(req.params.id);
  logAction(req, 'DELETE', 'shoutout', req.params.id);
  res.json({ success: true });
});

apiRouter.put("/admin/settings", authorizeRole('admin'), (req, res) => {
  const updateStmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  
  const allowedKeys = [
    "stream_url", "stream_url_low", "stream_url_medium", "stream_url_high", 
    "rss_feed_url", "studio_video_url", "app_name", "logo_url", "app_tagline", 
    "app_title", "font_sans", "font_display", "is_on_air", "primary_color", 
    "secondary_color", "feat_chat", "feat_shoutouts", "feat_cinematic", 
    "feat_pwa", "feat_bookings", "feat_live_tools", "feat_stream_quality",
    "logo_dark", "logo_light", "backup_retention_days",
    "backup_frequency_hours", "backup_enabled"
  ];
  
  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      if (key === 'is_on_air') {
        updateStmt.run(key, req.body[key] ? '1' : '0');
      } else {
        updateStmt.run(key, req.body[key].toString());
      }
      if (key === 'rss_feed_url') {
        clearPodcastCache();
      }
    }
  }

  logAction(req, 'UPDATE', 'settings', null, req.body);
  res.json({ success: true });
});

apiRouter.post("/admin/podcasts/refresh", (req, res) => {
  clearPodcastCache();
  res.json({ success: true });
});

apiRouter.post("/admin/schedule", (req, res) => {
  const { dj_id, day_of_week, start_time, end_time, show_name } = req.body;
  const info = db.prepare("INSERT INTO schedule (dj_id, day_of_week, start_time, end_time, show_name) VALUES (?, ?, ?, ?, ?)").run(
    dj_id, day_of_week, start_time, end_time, show_name
  );
  logAction(req, 'CREATE', 'schedule', info.lastInsertRowid, { show_name });
  res.json({ id: info.lastInsertRowid });
});

apiRouter.put("/admin/schedule/:id", (req, res) => {
  const { dj_id, day_of_week, start_time, end_time, show_name } = req.body;
  db.prepare("UPDATE schedule SET dj_id=?, day_of_week=?, start_time=?, end_time=?, show_name=? WHERE id=?").run(
    dj_id, day_of_week, start_time, end_time, show_name, req.params.id
  );
  logAction(req, 'UPDATE', 'schedule', req.params.id, { show_name });
  res.json({ success: true });
});

apiRouter.delete("/admin/schedule/:id", (req, res) => {
  db.prepare("DELETE FROM schedule WHERE id=?").run(req.params.id);
  logAction(req, 'DELETE', 'schedule', req.params.id);
  res.json({ success: true });
});

apiRouter.post("/admin/push-track", (req, res) => {
  const { artist, title } = req.body;
  if (!artist || !title) return res.status(400).json({ error: "Artist and title required" });
  
  const io = req.app.get('io');
  if (io) {
    // Alert in chat
    const newMsg = {
      id: crypto.randomUUID(), 
      user: "SYSTEM", 
      text: `NOW PLAYING: ${artist} - ${title}`, 
      timestamp: Date.now(), 
      isSystem: true 
    };
    io.emit('chatMessage', newMsg);
    
    // Alert on video
    io.emit('pushTrack', { artist, title });
  }
  
  res.json({ success: true, artist, title });
});

apiRouter.get("/admin/users", authMiddleware, authorizeRole('admin'), (req, res) => {
  const users = db.prepare("SELECT username, role FROM admins").all();
  res.json(users);
});

apiRouter.post("/admin/users", authMiddleware, authorizeRole('admin'), (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (!['admin', 'dj'].includes(role)) return res.status(400).json({ error: "Invalid role specified" });
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);
    logAction(req, 'CREATE', 'admin_user', username, { role });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Username might already exist" });
  }
});

apiRouter.put("/admin/users/:username", authorizeRole('admin'), (req, res) => {
  const { password } = req.body; // Role changes are not requested here, only password
  if (!password) return res.status(400).json({ error: "Password required" });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE admins SET password_hash = ? WHERE username = ?").run(hash, req.params.username);
  logAction(req, 'UPDATE_PASSWORD', 'admin_user', req.params.username);
  res.json({ success: true });
});

apiRouter.delete("/admin/users/:username", authorizeRole('admin'), (req, res) => {
  // Protect 'admin' user from being deleted
  if (req.params.username === 'admin') {
    return res.status(400).json({ error: "Cannot delete the default admin" });
  }
  db.prepare("DELETE FROM admins WHERE username = ?").run(req.params.username);
  logAction(req, 'DELETE', 'admin_user', req.params.username);
  res.json({ success: true });
});

apiRouter.get("/admin/chat_users", authorizeRole('admin'), (req, res) => {
  const users = db.prepare("SELECT id, username, source, is_banned, created_at FROM users").all();
  res.json(users);
});

apiRouter.post("/admin/chat_users", authorizeRole('admin'), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Invalid email format" });
  
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username, password_hash, source) VALUES (?, ?, ?)").run(email, hash, 'admin');
    logAction(req, 'CREATE', 'chat_user', email);
    res.json({ success: true, id: info.lastInsertRowid, username: email });
  } catch (err) {
    res.status(400).json({ error: "User with this email already exists" });
  }
});

apiRouter.post("/admin/chat_users/ban", authorizeRole('admin'), (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  db.prepare("UPDATE users SET is_banned = 1 WHERE username = ?").run(email);

  const io = req.app.get('io');
  if (io) {
    io.emit('user_banned', { email });
  }

  logAction(req, 'BAN', 'chat_user', email);
  res.json({ success: true });
});

apiRouter.post("/admin/chat_users/unban", authorizeRole('admin'), (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  db.prepare("UPDATE users SET is_banned = 0 WHERE username = ?").run(email);

  // Note: We don't need a socket broadcast for unbanning as it simply allows 
  // the user to log back in normally.
  logAction(req, 'UNBAN', 'chat_user', email);
  res.json({ success: true });
});

apiRouter.put("/admin/chat_users/:id", authorizeRole('admin'), (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET username=?, password_hash=? WHERE id=?").run(email, hash, req.params.id);
    } else {
      db.prepare("UPDATE users SET username=? WHERE id=?").run(email, req.params.id);
    }
    logAction(req, 'UPDATE', 'chat_user', req.params.id, { email });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Update failed, email might already be in use." });
  }
});

apiRouter.delete("/admin/chat_users/:id", authorizeRole('admin'), (req, res) => {
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  logAction(req, 'DELETE', 'chat_user', req.params.id);
  res.json({ success: true });
});

apiRouter.get("/admin/audit-logs", authorizeRole('admin'), (req, res) => {
  const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200").all();
  res.json(logs);
});

apiRouter.delete("/admin/audit-logs", authorizeRole('admin'), (req, res) => {
  db.prepare("DELETE FROM audit_logs").run();
  logAction(req, 'PURGE', 'audit_logs');
  res.json({ success: true });
});

apiRouter.get("/admin/database/list-backups", authorizeRole('admin'), (req, res) => {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);

  try {
    const metadata = db.prepare("SELECT * FROM backup_metadata").all() as any[];
    const files = fs.readdirSync(backupDir)
      .filter(f => (f.startsWith('backup-') || f.startsWith('manual-backup-')) && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        const m = metadata.find(x => x.filename === f);
        return {
          name: f,
          size: stats.size,
          createdAt: stats.mtime,
          label: m ? m.label : null
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 15);

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Failed to list backups" });
  }
});

apiRouter.get("/admin/database/download-file/:filename", authorizeRole('admin'), (req, res) => {
  const { filename } = req.params;
  // Security check: only allow files from the backup directory with the correct naming convention
  if (!(filename.startsWith('backup-') || filename.startsWith('manual-backup-')) || !filename.endsWith('.db') || filename.includes('..')) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(process.cwd(), 'backups', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found" });
  }

  res.download(filePath, filename);
});

apiRouter.get("/admin/database/stats", authorizeRole('admin'), (req, res) => {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    return res.json({ totalSize: 0, fileCount: 0 });
  }

  try {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
    let totalSize = 0;
    files.forEach(f => {
      try {
        const stats = fs.statSync(path.join(backupDir, f));
        totalSize += stats.size;
      } catch (e) {}
    });

    res.json({ 
      totalSize, 
      fileCount: files.length 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to calculate storage stats" });
  }
});

apiRouter.delete("/admin/database/backups/all", authorizeRole('admin'), (req, res) => {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) return res.json({ success: true });
  
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
    files.forEach(f => {
      try { fs.unlinkSync(path.join(backupDir, f)); } catch (e) {}
    });
    logAction(req, 'PURGE_BACKUPS', 'database');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to purge backups" });
  }
});

apiRouter.post("/admin/database/trigger-check", authorizeRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  await backupDatabase();
  logAction(req, 'TRIGGER_BACKUP_CHECK', 'database');
  res.json({ success: true });
}));

apiRouter.post("/admin/database/prune", authorizeRole('admin'), (req, res) => {
  try {
    pruneBackups();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Maintenance task failed" });
  }
});

apiRouter.post("/admin/database/restore-file/:filename", authorizeRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  // Security check: only allow files from the backup directory with the correct naming convention
  if (!(filename.startsWith('backup-') || filename.startsWith('manual-backup-')) || !filename.endsWith('.db') || filename.includes('..')) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(process.cwd(), 'backups', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found" });
  }

  const absoluteDbPath = path.resolve(process.cwd(), dbPath);
  const backupPath = absoluteDbPath + ".pre-restore.bak";

  try {
    // 1. Verify the snapshot before touching the live database
    let checkDb;
    try {
      checkDb = new Database(filePath, { readonly: true });
      const settingsTable = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
      if (!settingsTable) throw new Error("Invalid database schema: 'settings' table missing.");
      const integrity = checkDb.pragma('integrity_check', { simple: true });
      if (integrity !== 'ok') throw new Error(`Database integrity check failed: ${integrity}`);
    } finally {
      if (checkDb) checkDb.close();
    }

    logAction(req, 'RESTORE_DATABASE_SNAPSHOT', 'database', null, { filename });

    // Close connection and swap files
    db.close();
    if (fs.existsSync(absoluteDbPath)) {
      fs.renameSync(absoluteDbPath, backupPath);
    }
    fs.copyFileSync(filePath, absoluteDbPath);

    res.json({ success: true, message: "Database restored from snapshot. Server is restarting..." });

    setTimeout(() => {
      console.log("[DB] Restarting process to apply restored snapshot...");
      process.exit(0);
    }, 1000);
  } catch (err: any) {
    console.error("[API] Snapshot restore failed:", err);
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
}));

apiRouter.delete("/admin/database/delete-backup/:filename", authorizeRole('admin'), (req, res) => {
  const { filename } = req.params;
  // Security check: only allow files from the backup directory with the correct naming convention
  if (!(filename.startsWith('backup-') || filename.startsWith('manual-backup-')) || !filename.endsWith('.db') || filename.includes('..')) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(process.cwd(), 'backups', filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      db.prepare("DELETE FROM backup_metadata WHERE filename = ?").run(filename);
      logAction(req, 'DELETE_BACKUP', 'database', null, { filename });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Backup file not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to delete backup" });
  }
});

apiRouter.post("/admin/database/snapshot", authorizeRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { label } = req.body;
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `manual-backup-${timestamp}.db`;
  const filePath = path.join(backupDir, filename);

  try {
    console.log(`[DB] Creating manual snapshot: ${filename}`);
    await db.backup(filePath);
    
    if (label) {
      db.prepare("INSERT INTO backup_metadata (filename, label) VALUES (?, ?)").run(filename, label);
    }
    
    logAction(req, 'CREATE_SNAPSHOT', 'database', null, { filename, label });
    res.json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate snapshot" });
  }
}));

apiRouter.get("/admin/database/download", authorizeRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `manual-backup-${timestamp}.db`;
  const filePath = path.join(backupDir, filename);

  try {
    // Perform an atomic backup to a temporary file
    await db.backup(filePath);
    
    logAction(req, 'DOWNLOAD_BACKUP', 'database', null, { filename });

    res.download(filePath, filename, (err) => {
      if (err) console.error("[API] Backup download failed:", err);
      
      // Cleanup: remove the temporary manual backup file after download finishes
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {}
    });
  } catch (err) {
    console.error("[API] Manual backup failed:", err);
    res.status(500).json({ error: "Failed to generate database backup" });
  }
}));

const restoreStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    cb(null, backupDir);
  },
  filename: (req, file, cb) => {
    cb(null, "restore-pending.db");
  }
});
const restoreUpload = multer({ storage: restoreStorage });

apiRouter.post("/admin/database/restore", authorizeRole('admin'), restoreUpload.single('database'), asyncHandler(async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "No database file provided" });

  const tempPath = req.file.path;
  const absoluteDbPath = path.resolve(process.cwd(), dbPath);
  const backupPath = absoluteDbPath + ".pre-restore.bak";

  try {
    // 1. Verify the uploaded file before touching the live database
    console.log(`[DB] Verifying uploaded database file...`);
    let checkDb;
    try {
      checkDb = new Database(tempPath, { readonly: true });
      
      // Check for core table existence to ensure it's a Dejavu FM database
      const settingsTable = checkDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
      if (!settingsTable) {
        throw new Error("Invalid database schema: 'settings' table missing. Is this a Dejavu FM backup?");
      }
      
      // Perform integrity check
      const integrity = checkDb.pragma('integrity_check', { simple: true });
      if (integrity !== 'ok') {
        throw new Error(`Database integrity check failed: ${integrity}`);
      }
    } catch (verifErr: any) {
      if (checkDb) checkDb.close();
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(400).json({ error: `Validation failed: ${verifErr.message}` });
    } finally {
      if (checkDb) checkDb.close();
    }

    console.log(`[DB] Verification successful. Initiating restore and closing connection...`);
    
    logAction(req, 'RESTORE_DATABASE', 'database', null, { original_file: req.file.originalname });

    // 1. Close the current connection
    db.close();

    // 2. Backup current live DB just in case
    if (fs.existsSync(absoluteDbPath)) {
      fs.renameSync(absoluteDbPath, backupPath);
    }

    // 3. Move uploaded file to live location
    fs.renameSync(tempPath, absoluteDbPath);

    res.json({ success: true, message: "Database replaced. Server is restarting..." });

    // 4. Exit process to trigger restart (Singleton reload)
    setTimeout(() => {
      console.log("[DB] Restarting process to apply restored database...");
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error("[API] Restore failed:", err);
    res.status(500).json({ error: "Critical failure during database restoration" });
  }
}));

// Global Error Handler Middleware
apiRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});
