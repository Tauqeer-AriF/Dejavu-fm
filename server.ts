import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./src/server/api.js";
import { initDb, db } from "./src/server/db.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";

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
import { getPodcastFeed } from "./src/server/utils.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);
  
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });
  app.set('io', io);

  // Helper for meta tag injection
  async function getDynamicHtml(reqPath: string) {
    const indexPath = process.env.NODE_ENV === "production" 
      ? path.join(process.cwd(), "dist", "index.html")
      : path.join(process.cwd(), "index.html");
    
    let html = fs.readFileSync(indexPath, "utf8");
    
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
    const count = io.sockets.sockets.size;
    io.emit('onlineCount', count);
    io.emit('stats_update', { realtimeListeners: count });
  }, 30000);

  // Initialize DB
  initDb();

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
  const dynamicPreviewRoutes = ["/", "/podcasts/:id", "/djs/:id"];
  
  const isBot = (ua: string) => {
    if (!ua) return false;
    const bots = ["twitterbot", "facebookexternalhit", "linkedinbot", "whatsapp", "telegrambot", "slackbot", "discordbot"];
    return bots.some(bot => ua.toLowerCase().includes(bot));
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
      try {
        const html = await getDynamicHtml(req.path);
        res.send(html);
      } catch (e) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
