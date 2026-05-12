import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Parser from "rss-parser";
import crypto from "crypto";
import path from "path";

export const apiRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_super_secret_for_demo";

// Check Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Global error handler wrapper for async routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ------ PUBLIC ROUTES ------

apiRouter.get("/public/settings", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings").all() as {key: string, value: string}[];
  const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json(settings);
});

apiRouter.get("/public/djs", (req, res) => {
  const djs = db.prepare("SELECT * FROM djs").all();
  res.json(djs);
});

apiRouter.get("/public/schedule", (req, res) => {
  const schedule = db.prepare(`
    SELECT s.*, d.name as dj_name, d.image_url as dj_photo 
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

apiRouter.get("/public/status", (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("is_on_air") as {value: string};
  res.json({ is_on_air: row?.value === '1' });
});

apiRouter.post("/public/book-artist", (req, res) => {
  const { dj_id, client_name, client_email, event_date, message } = req.body;
  if (!dj_id || !client_name || !client_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO bookings (id, dj_id, client_name, client_email, event_date, message) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, dj_id, client_name, client_email, event_date, message);
  res.json({ success: true, id });
});

apiRouter.post("/public/shoutout", (req, res) => {
  const { listener_name, message, type } = req.body;
  if (!listener_name || !message) {
    return res.status(400).json({ error: "Name and message required" });
  }
  const info = db.prepare("INSERT INTO shoutouts (listener_name, message, type) VALUES (?, ?, ?)").run(listener_name, message, type || 'text');
  
  const io = req.app.get('io');
  if (io) {
    io.emit('new_shoutout', { id: info.lastInsertRowid, listener_name, message, type });
  }
  
  res.json({ success: true });
});

// ------ PUBLIC AUTH ROUTES ------

apiRouter.post("/public/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
  
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
    const token = jwt.sign({ userId: info.lastInsertRowid, username }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("user_token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true, username });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

apiRouter.post("/public/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
      const resp = await fetch(`http://ip-api.com/json/${ip}`);
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
    }
  } catch (e) {
    console.error("Geo tracking failed:", e);
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

apiRouter.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`[Admin Login] Attempt for user: ${username}`);
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username) as any;
  
  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    console.log(`[Admin Login] Success for user: ${username}`);
    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: "1d" });
    res.cookie("admin_token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ success: true });
  } else {
    console.warn(`[Admin Login] Failed for user: ${username} - ${!admin ? 'User not found' : 'Invalid password'}`);
    res.status(401).json({ error: "Invalid credentials" });
  }
});

apiRouter.post("/admin/logout", (req, res) => {
  res.clearCookie("admin_token", { sameSite: "none", secure: true });
  res.json({ success: true });
});

apiRouter.get("/admin/check", authMiddleware, (req: any, res: any) => {
  res.json({ loggedIn: true, user: req.user });
});

// ------ ADMIN PROTECTED ROUTES ------

apiRouter.use("/admin", authMiddleware);

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

apiRouter.delete("/admin/analytics/purge", (req: any, res: any) => {
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
  res.json({ success: true, id });
});

apiRouter.put("/admin/djs/:id", (req, res) => {
  const { name, bio, image_url, instagram, soundcloud, mixcloud } = req.body;
  db.prepare("UPDATE djs SET name = ?, bio = ?, image_url = ?, instagram = ?, soundcloud = ?, mixcloud = ? WHERE id = ?")
    .run(name, bio, image_url, instagram, soundcloud, mixcloud, req.params.id);
  res.json({ success: true });
});

apiRouter.delete("/admin/djs/:id", (req, res) => {
  // First clear schedule entries
  try { db.prepare("DELETE FROM schedule WHERE dj_id = ?").run(req.params.id); } catch(e) {}
  db.prepare("DELETE FROM djs WHERE id = ?").run(req.params.id);
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

apiRouter.delete("/admin/shoutouts/:id", (req, res) => {
  db.prepare("DELETE FROM shoutouts WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

apiRouter.delete("/admin/shoutouts/all", (req, res) => {
  db.prepare("DELETE FROM shoutouts").run();
  res.json({ success: true });
});

apiRouter.put("/admin/settings", (req, res) => {
  const updateStmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  
  const allowedKeys = [
    "stream_url", "stream_url_low", "stream_url_medium", "stream_url_high", 
    "rss_feed_url", "studio_video_url", "app_name", "logo_url", "app_tagline", 
    "app_title", "font_sans", "font_display", "is_on_air", "primary_color", 
    "secondary_color", "feat_chat", "feat_shoutouts", "feat_cinematic", 
    "feat_pwa", "feat_bookings", "feat_live_tools", "feat_stream_quality"
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
  res.json({ id: info.lastInsertRowid });
});

apiRouter.put("/admin/schedule/:id", (req, res) => {
  const { dj_id, day_of_week, start_time, end_time, show_name } = req.body;
  db.prepare("UPDATE schedule SET dj_id=?, day_of_week=?, start_time=?, end_time=?, show_name=? WHERE id=?").run(
    dj_id, day_of_week, start_time, end_time, show_name, req.params.id
  );
  res.json({ success: true });
});

apiRouter.delete("/admin/schedule/:id", (req, res) => {
  db.prepare("DELETE FROM schedule WHERE id=?").run(req.params.id);
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

apiRouter.get("/admin/users", (req, res) => {
  const users = db.prepare("SELECT username FROM admins").all();
  res.json(users);
});

apiRouter.post("/admin/users", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Username might already exist" });
  }
});

apiRouter.put("/admin/users/:username", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE admins SET password_hash = ? WHERE username = ?").run(hash, req.params.username);
  res.json({ success: true });
});

apiRouter.delete("/admin/users/:username", (req, res) => {
  // Prevent deleting oneself might be good, but at least protect 'admin'
  if (req.params.username === 'admin') {
    return res.status(400).json({ error: "Cannot delete the default admin" });
  }
  db.prepare("DELETE FROM admins WHERE username = ?").run(req.params.username);
  res.json({ success: true });
});

apiRouter.get("/admin/chat_users", (req, res) => {
  const users = db.prepare("SELECT id, username, created_at FROM users").all();
  res.json(users);
});

apiRouter.post("/admin/chat_users", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
  
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
    res.json({ success: true, id: info.lastInsertRowid, username });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

apiRouter.put("/admin/chat_users/:id", (req, res) => {
  const { username, password } = req.body;
  
  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET username=?, password_hash=? WHERE id=?").run(username, hash, req.params.id);
    } else {
      db.prepare("UPDATE users SET username=? WHERE id=?").run(username, req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Update failed, username might already exist." });
  }
});

apiRouter.delete("/admin/chat_users/:id", (req, res) => {
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// Global Error Handler Middleware
apiRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});
