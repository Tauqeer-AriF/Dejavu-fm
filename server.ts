import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./src/server/api.ts";
import { initDb, db, backupDatabase } from "./src/server/db.ts";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

let __filename = "";
let __dirname = "";

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  // Fallback for CommonJS/Bundled environments
  __filename = (global as any).__filename || "";
  __dirname = (global as any).__dirname || process.cwd();
}

import fs from "fs";
import { getPodcastFeed } from "./src/server/utils.ts";

async function startServer() {
  const app = express();
  
  // High-level request logging for diagnostics
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip} - UA: ${req.headers['user-agent']?.substring(0, 50)}`);
    next();
  });

  // Trust all proxies for dynamic environments
  app.set('trust proxy', true);

  const requestedPort = Number(process.env.PORT || 3000);
  const hasExplicitPort = Boolean(process.env.PORT);
  const server = http.createServer(app);
  
  // Explicitly serve public folder for manifest.json and icons
  app.use(express.static(path.join(process.cwd(), "public")));

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
  }));

  const io = new SocketIOServer(server, {
    cors: { 
      origin: true, // Allow same origin and common proxy setups
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  app.set('io', io);

  // Helper for meta tag injection
  let indexHtmlCache: string | null = null;

  async function getDynamicHtml(reqPath: string) {
    const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
    const indexPath = isProduction
      ? path.join(process.cwd(), "dist", "index.html")
      : path.join(process.cwd(), "index.html");
    
    if (!indexHtmlCache && !fs.existsSync(indexPath)) {
      console.warn(`[getDynamicHtml] Index file not found at ${indexPath}`);
      return "<html><body>App loading... Please refresh.</body></html>";
    }
    
    if (!indexHtmlCache || !isProduction) {
      indexHtmlCache = fs.readFileSync(indexPath, "utf8");
    }
    
    let html = indexHtmlCache;
    
    // Default meta tags
    let title = "Dejavu FM | The Sound of London";
    let description = "Direct from the heart of the capital. Since 2005, Dejavu FM has been the heartbeat of the underground.";
    let image = "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?q=80&w=1200";

    // Podcast detail dynamic tags
    if (reqPath.startsWith("/podcasts/")) {
      const id = reqPath.split("/").pop();
      const feed = await getPodcastFeed();
      const podcast = feed?.items?.find((i: any) => {
        try {
          const idStr = i.guid || i.link || "";
          return btoa(idStr).replace(/=/g, '') === id;
        } catch (e) { return false; }
      });

      if (podcast) {
        title = `${podcast.title} | Dejavu FM Catch Up`;
        description = (podcast.contentSnippet || podcast.content || description).substring(0, 160).replace(/<[^>]*>/g, '') + "...";
        image = podcast.itunes?.image || image;
      }
    } 
    // DJ detail dynamic tags
    else if (reqPath.startsWith("/djs/")) {
      const id = reqPath.split("/").pop();
      const dj = db.prepare("SELECT * FROM djs WHERE id = ?").get(id) as any;
      if (dj) {
        title = `${dj.name} | Dejavu FM Resident`;
        description = (dj.bio || description).substring(0, 160);
        image = dj.image_url || image;
      }
    }

    const metaTags = `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${image}" />
    `;

    // Replace the default title or insert before </head>
    html = html.replace("<title>Dejavu FM</title>", metaTags);
    if (!html.includes(metaTags)) {
      html = html.replace("</head>", `${metaTags}</head>`);
    }
    
    return html;
  }

  // Configurable limit for chat history to prevent memory issues
  const MAX_CHAT_HISTORY = 50;
  const chatHistory: any[] = [];

  io.on('connection', (socket) => {
    const emitCounts = () => {
      const count = io.sockets.sockets.size;
      io.emit('onlineCount', count);
      io.emit('stats_update', { realtimeListeners: count });
    };

    emitCounts();

    socket.on('disconnect', () => {
      // Small delay on disconnect helps avoid flickering when refreshing
      setTimeout(emitCounts, 1000);
    });

    // Send history on connect
    socket.emit('chatHistory', chatHistory);

    socket.on('chatMessage', (msg) => {
       const newMsg = { ...msg, timestamp: Date.now(), id: crypto.randomUUID() };
       chatHistory.push(newMsg);
       
       // Efficiently maintain maximum history size
       while (chatHistory.length > MAX_CHAT_HISTORY) {
         chatHistory.shift();
       }
       
       io.emit('chatMessage', newMsg);
    });
  });

  // Periodically broadcast counts to ensure all clients are synced
  setInterval(() => {
    if (io) {
      try {
        const count = io.sockets.sockets.size;
        io.emit('onlineCount', count);
        io.emit('stats_update', { realtimeListeners: count });
      } catch (e) {
        console.error("[Socket.IO Interval Error]", e);
      }
    }
  }, 30000);

  // Initialize DB
  initDb();

  // Automated Database Backups with Dynamic Frequency
  const performAutoBackup = async () => {
    try {
      const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'backup_enabled'").get() as {value: string};
      if (enabledRow?.value === '0') return;

      const row = db.prepare("SELECT value FROM settings WHERE key = 'backup_frequency_hours'").get() as {value: string};
      const freqHours = parseInt(row?.value || "24");
      
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) {
        await backupDatabase();
        return;
      }

      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup-'));
      if (files.length === 0) {
        await backupDatabase();
        return;
      }

      const latestFile = files.map(f => fs.statSync(path.join(backupDir, f)).mtime.getTime()).sort((a,b) => b-a)[0];
      if (Date.now() - latestFile >= freqHours * 60 * 60 * 1000) {
        await backupDatabase();
      }
    } catch (e) { console.error("[Backup Task] Error:", e); }
  };

  const backupCheckInterval = 60 * 60 * 1000; // Check every hour
  setInterval(performAutoBackup, backupCheckInterval);
  setTimeout(performAutoBackup, 5000); // Initial check 5 seconds after startup

  // Background task to reset shoutouts when DJ changes
  let lastScheduledDjId: string | null = null;
  const CHECK_INTERVAL = 30000; // Check every 30 seconds

  setInterval(() => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); 
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      const currentSlot = db.prepare("SELECT dj_id FROM schedule WHERE day_of_week = ? AND start_time <= ? AND end_time > ?")
        .get(dayOfWeek, time, time) as { dj_id: string } | undefined;

      const currentDjId = currentSlot?.dj_id || null;

      if (currentDjId !== lastScheduledDjId && lastScheduledDjId !== null) {
        console.log(`[Shift Change] DJ changed from ${lastScheduledDjId} to ${currentDjId}. Clearing shoutouts.`);
        db.prepare("DELETE FROM shoutouts").run();
        io.emit('shoutouts_cleared');
      }
      
      lastScheduledDjId = currentDjId;
    } catch (err) {
      console.error("[Shift Check Cache Error]", err);
    }
  }, CHECK_INTERVAL);

  // Middleware
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use("/api", apiRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Dynamic preview routes for social sharing (mostly for production or crawlers)
  const dynamicPreviewRoutes = ["/", "/podcasts/:id", "/djs/:id", "/blog/:slug"];
  
  const isBot = (ua: string) => {
    if (!ua) return false;
    const bots = ["twitterbot", "facebookexternalhit", "linkedinbot", "whatsapp", "telegrambot", "slackbot", "discordbot"];
    return bots.some(bot => ua.toLowerCase().includes(bot));
  };

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));

  if (!isProduction) {
    // In dev, only serve dynamic HTML to bots to avoid breaking Vite client
    app.get(dynamicPreviewRoutes, async (req, res, next) => {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        try {
          const html = await getDynamicHtml(req.path);
          return res.send(html);
        } catch (e) {
          return next();
        }
      }
      next();
    });

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dynamic HTML for these specific routes
    app.get(dynamicPreviewRoutes, async (req, res, next) => {
      try {
        const html = await getDynamicHtml(req.path);
        res.send(html);
      } catch (e) {
        next();
      }
    });

    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false })); // don't serve index.html automatically
    
    app.get("*", async (req, res) => {
      // Ensure that requests for assets/files (containing a dot) that were not served
      // by static middleware return a proper 404 instead of the SPA's HTML index.
      if (req.path.startsWith('/src/') || (req.path.includes('.') && !req.path.endsWith('.html'))) {
        console.warn(`[404] Resource not found: ${req.path}`);
        return res.status(404).json({ error: "Not Found", path: req.path });
      }

      try {
        const html = await getDynamicHtml(req.path);
        res.send(html);
      } catch (e) {
        if (fs.existsSync(path.join(distPath, "index.html"))) {
          res.sendFile(path.join(distPath, "index.html"));
        } else {
          res.status(500).send("App not built correctly");
        }
      }
    });
  }

  // Global Error Handler for final catch
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[CRITICAL ERROR] ${req.method} ${req.url}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });

  const listen = (port: number) => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && !hasExplicitPort && port < requestedPort + 10) {
        console.warn(`Port ${port} is already in use. Trying ${port + 1}...`);
        listen(port + 1);
        return;
      }

      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing dev server or run with a different port, for example: $env:PORT=${port + 1}; npm run dev`);
        process.exit(1);
      }

      throw err;
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
  };

  listen(requestedPort);
}

startServer();
