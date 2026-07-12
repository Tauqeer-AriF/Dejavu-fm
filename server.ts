import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./src/server/api.ts";
import { initDb, db, backupDatabase, getUploadsDir } from "./src/server/db.ts";
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

let serverId = crypto.randomUUID();
console.log(`[SERVER] Instance ID: ${serverId}`);

async function startServer() {
  // Initialize DB immediately
  initDb();

  const app = express();
  
  app.set('serverId', serverId);
  app.set('regenerateServerId', () => {
    serverId = crypto.randomUUID();
    app.set('serverId', serverId);
    console.log(`[SERVER] Regenerated Instance ID: ${serverId}`);
  });

  // High-level request logging for diagnostics
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const currentId = req.app.get('serverId') || serverId;
    console.log(`[${timestamp}] ${req.method} ${req.url} - ID: ${currentId.substring(0,8)} - IP: ${req.ip}`);
    next();
  });

  // Trust all proxies for dynamic environments
  app.set('trust proxy', true);

  const requestedPort = 3000;
  const server = http.createServer(app);
  
  // Explicitly serve public folder for manifest.json and icons
  app.use(express.static(path.join(process.cwd(), "public")));

  // Serve uploads folder from persistent or local uploads directory dynamically
  app.use("/uploads", express.static(getUploadsDir(), {
    maxAge: '1y',
    acceptRanges: true,
    cacheControl: true
  }));

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
    let image = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200";

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
      if (db.open) {
        const dj = db.prepare("SELECT * FROM djs WHERE id = ?").get(id) as any;
        if (dj) {
          title = `${dj.name} | Dejavu FM Resident`;
          description = (dj.bio || description).substring(0, 160);
          image = dj.image_url || image;
        }
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
  const MAX_CHAT_HISTORY = 100;
  let chatHistory: any[] = [];

  try {
    if (db.open) {
      const history = db.prepare("SELECT * FROM public_messages ORDER BY timestamp DESC LIMIT ?").all(MAX_CHAT_HISTORY) as any[];
      chatHistory = history.reverse().map(m => {
        let avatar_url = null;
        try {
          const senderAdmin = db.prepare("SELECT photo_url FROM admins WHERE LOWER(username) = ?").get(m.sender.toLowerCase()) as any;
          if (senderAdmin && senderAdmin.photo_url) {
            avatar_url = senderAdmin.photo_url;
          } else {
            const u = db.prepare("SELECT avatar_url FROM users WHERE username = ?").get(m.sender) as any;
            if (u) avatar_url = u.avatar_url;
          }
        } catch {}
        return {
          ...m,
          user: m.sender,
          avatar_url: avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.sender}`
        };
      });
      console.log(`[Chat] Loaded ${chatHistory.length} messages from database.`);
    }
  } catch (err) {
    console.error("[Chat] Failed to load history from database:", err);
  }

  const getChatRoomCounts = () => {
    if (!db.open) return { publicMessages: 0, privateMessages: 0 };

    const publicCount = db.prepare("SELECT COUNT(*) as count FROM public_messages").get() as { count: number };
    const privateCount = db.prepare("SELECT COUNT(*) as count FROM private_messages").get() as { count: number };

    return {
      publicMessages: publicCount?.count || 0,
      privateMessages: privateCount?.count || 0
    };
  };

  const emitChatRoomCounts = () => {
    io.emit('chatCountsUpdated', getChatRoomCounts());
  };

  const clearAllChatRoomData = (reason = "manual") => {
    if (!db.open) return { publicDeleted: 0, privateDeleted: 0 };

    const publicInfo = db.prepare("DELETE FROM public_messages").run();
    const privateInfo = db.prepare("DELETE FROM private_messages").run();
    chatHistory = [];

    const clearedAt = new Date().toISOString();
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run("chat_auto_delete_last_run", clearedAt);

    io.emit('messagesCleared', { isPrivate: false, allChatData: true, reason, clearedAt });
    io.emit('messagesCleared', { isPrivate: true, allChatData: true, reason, clearedAt });
    emitChatRoomCounts();
    console.log(`[Chat Retention] Cleared chat room data (${reason}). Public: ${publicInfo.changes}, Private: ${privateInfo.changes}`);

    return { publicDeleted: publicInfo.changes, privateDeleted: privateInfo.changes, clearedAt };
  };

  app.set('clearChatRoomData', clearAllChatRoomData);

  io.on('connection', (socket) => {
    const emitCounts = () => {
      const count = io.sockets.sockets.size;
      io.emit('onlineCount', count);
      io.emit('stats_update', { realtimeListeners: count });
    };

    emitCounts();
    socket.emit('chatCountsUpdated', getChatRoomCounts());

    socket.on('deleteMessage', (payload: { id: string; user: string; isPrivate: boolean }) => {
      if (!db.open) return;
      try {
        // Authorization check: Only sender or admin can delete
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(payload.user.toLowerCase());
        const isUserAdmin = !!adminCheck;

        // Verify ownership if not admin
        if (!isUserAdmin) {
          const table = payload.isPrivate ? 'private_messages' : 'public_messages';
          const msg = db.prepare(`SELECT sender FROM ${table} WHERE id = ?`).get(payload.id) as any;
          if (!msg || msg.sender !== payload.user) {
            console.warn(`[Delete] Unauthorized delete attempt by ${payload.user} for message ${payload.id}`);
            return;
          }
        }

        if (payload.isPrivate) {
          db.prepare("DELETE FROM private_messages WHERE id = ?").run(payload.id);
        } else {
          db.prepare("DELETE FROM public_messages WHERE id = ?").run(payload.id);
          // Update memory cache for public messages
          chatHistory = chatHistory.filter(m => m.id !== payload.id);
        }
        
        // Notify all clients to remove the message from their UI
        io.emit('messageDeleted', { id: payload.id, isPrivate: payload.isPrivate });
        emitChatRoomCounts();
        console.log(`[Delete] Message ${payload.id} deleted by ${payload.user}`);
      } catch (err) {
        console.error("Failed to delete message:", err);
      }
    });

    socket.on('clearAllMessages', (payload: { user: string; isPrivate: boolean; targetRecipient?: string }) => {
      if (!db.open) return;
      try {
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(payload.user.toLowerCase());
        if (!adminCheck) {
          console.warn(`[Clear] Unauthorized clear attempt by ${payload.user}`);
          return;
        }

        if (payload.isPrivate) {
          if (payload.targetRecipient) {
            // Clear conversation between payload.user and targetRecipient
            db.prepare("DELETE FROM private_messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)")
              .run(payload.user, payload.targetRecipient, payload.targetRecipient, payload.user);
            io.emit('messagesCleared', { isPrivate: true, recipient: payload.targetRecipient, sender: payload.user });
            emitChatRoomCounts();
          }
        } else {
          db.prepare("DELETE FROM public_messages").run();
          chatHistory = [];
          io.emit('messagesCleared', { isPrivate: false });
          emitChatRoomCounts();
        }
        console.log(`[Clear] Messages cleared by admin ${payload.user}`);
      } catch (err) {
        console.error("Failed to clear messages:", err);
      }
    });

    socket.on('disconnect', () => {
      // Small delay on disconnect helps avoid flickering when refreshing
      setTimeout(emitCounts, 1000);
    });

    // Send history on connect
    socket.emit('chatHistory', chatHistory);

    socket.on('getChatHistory', () => {
      socket.emit('chatHistory', chatHistory);
    });

    socket.on('registerUser', (username) => {
      (socket as any).username = username;
      if (!db.open) return;
      try {
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(username.toLowerCase());
        const isUserAdmin = !!adminCheck;

        let privateHistory;
        if (isUserAdmin) {
          // Admins can see all private messages in the system
          privateHistory = db.prepare("SELECT * FROM private_messages ORDER BY timestamp ASC").all() as any[];
        } else {
          privateHistory = db.prepare("SELECT * FROM private_messages WHERE sender = ? OR recipient = ? ORDER BY timestamp ASC").all(username, username) as any[];
        }

        const enrichedHistory = privateHistory.map(m => {
          let avatar_url = null;
          try {
            const senderAdmin = db.prepare("SELECT photo_url FROM admins WHERE LOWER(username) = ?").get(m.sender.toLowerCase()) as any;
            if (senderAdmin && senderAdmin.photo_url) {
              avatar_url = senderAdmin.photo_url;
            } else {
              const u = db.prepare("SELECT avatar_url FROM users WHERE username = ?").get(m.sender) as any;
              if (u) avatar_url = u.avatar_url;
            }
          } catch {}
          return {
            ...m,
            user: m.sender,
            avatar_url: avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.sender}`
          };
        });
        socket.emit('privateHistory', enrichedHistory);
        socket.emit('chatHistory', chatHistory);
      } catch (err) {
        console.error("Failed to load private history for registered user:", err);
      }
    });

    socket.on('chatMessage', (msg) => {
       if (!db.open) return;
       let avatar_url = null;
       try {
         const senderAdmin = db.prepare("SELECT photo_url FROM admins WHERE LOWER(username) = ?").get(msg.user.toLowerCase()) as any;
         if (senderAdmin && senderAdmin.photo_url) {
           avatar_url = senderAdmin.photo_url;
         } else {
           const user = db.prepare("SELECT avatar_url FROM users WHERE username = ?").get(msg.user) as any;
           if (user) {
             avatar_url = user.avatar_url;
           }
         }
       } catch (err) {
         console.error("Failed to query user avatar for chat:", err);
       }
       const newMsg = { 
         ...msg, 
         avatar_url: avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`,
         timestamp: Date.now(), 
         id: crypto.randomUUID() 
       };

       if (msg.recipient) {
         try {
           db.prepare("INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
             .run(newMsg.id, msg.user, msg.recipient, msg.text || null, msg.imageUrl || null, msg.imageName || null, msg.audioUrl || null, msg.audioName || null, msg.videoUrl || null, msg.videoName || null, newMsg.timestamp);
           emitChatRoomCounts();
         } catch (err) {
           console.error("Failed to save private message:", err);
         }

         // Emit to matching sockets (sender, recipient, and any admins)
         for (const [_, s] of io.sockets.sockets) {
           const socketUser = (s as any).username;
           if (socketUser) {
             const isRecipientOrSender = socketUser === msg.user || socketUser === msg.recipient;
             let isSocketUserAdmin = false;
             try {
               const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(socketUser.toLowerCase());
               if (adminCheck) isSocketUserAdmin = true;
             } catch (e) {}

             if (isRecipientOrSender || isSocketUserAdmin) {
               s.emit('privateMessage', newMsg);
             }
           }
         }
       } else {
         try {
           db.prepare("INSERT INTO public_messages (id, sender, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
             .run(newMsg.id, msg.user, msg.text || null, msg.imageUrl || null, msg.imageName || null, msg.audioUrl || null, msg.audioName || null, msg.videoUrl || null, msg.videoName || null, newMsg.timestamp);
           emitChatRoomCounts();
         } catch (err) {
           console.error("Failed to save public message:", err);
         }
         chatHistory.push(newMsg);
         
         // Efficiently maintain maximum history size
         while (chatHistory.length > MAX_CHAT_HISTORY) {
           chatHistory.shift();
         }
         
         io.emit('chatMessage', newMsg);
       }
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

  // Automated Database Backups with Dynamic Frequency
  const performAutoBackup = async () => {
    if (!db.open) return;
    try {
      const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'backup_enabled'").get() as {value: string};
      if (enabledRow?.value === '0') return;

      const row = db.prepare("SELECT value FROM settings WHERE key = 'backup_frequency_hours'").get() as {value: string};
      const freqHours = Math.max(1, parseInt(row?.value || "24") || 24);

      const lastAttemptRow = db.prepare("SELECT value FROM settings WHERE key = 'backup_last_attempt'").get() as {value: string};
      const lastAttemptTime = lastAttemptRow?.value ? new Date(lastAttemptRow.value).getTime() : 0;

      // If we've never backed up or the frequency interval has passed, trigger a new backup
      if (!lastAttemptTime || isNaN(lastAttemptTime) || (Date.now() - lastAttemptTime >= freqHours * 60 * 60 * 1000)) {
        await backupDatabase();
      }
    } catch (e) { console.error("[Backup Task] Error:", e); }
  };

  const backupCheckInterval = 15 * 60 * 1000; // Check every 15 minutes for better responsiveness to setting changes
  setInterval(performAutoBackup, backupCheckInterval);
  setTimeout(performAutoBackup, 5000); // Initial check 5 seconds after startup

  const performChatRetentionCheck = () => {
    if (!db.open) return;
    try {
      const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'chat_auto_delete_enabled'").get() as {value: string} | undefined;
      if (enabledRow?.value !== '1') return;

      const hoursRow = db.prepare("SELECT value FROM settings WHERE key = 'chat_auto_delete_hours'").get() as {value: string} | undefined;
      const intervalHours = Math.max(1, parseInt(hoursRow?.value || "24", 10) || 24);

      const lastRunRow = db.prepare("SELECT value FROM settings WHERE key = 'chat_auto_delete_last_run'").get() as {value: string} | undefined;
      const lastRunTime = lastRunRow?.value ? new Date(lastRunRow.value).getTime() : Date.now();

      if (!lastRunRow?.value) {
        db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
          .run("chat_auto_delete_last_run", new Date().toISOString());
        return;
      }

      if (isNaN(lastRunTime) || Date.now() - lastRunTime >= intervalHours * 60 * 60 * 1000) {
        clearAllChatRoomData("timer");
      }
    } catch (e) {
      console.error("[Chat Retention Task] Error:", e);
    }
  };

  setInterval(performChatRetentionCheck, 60 * 1000);
  setTimeout(performChatRetentionCheck, 10000);

  // Background task to reset shoutouts when DJ changes
  let lastScheduledDjId: string | null = null;
  const CHECK_INTERVAL = 30000; // Check every 30 seconds

  setInterval(() => {
    if (!db.open) return;
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
    const currentId = req.app.get('serverId') || serverId;
    if (!db || !db.open) {
      return res.status(503).json({ 
        status: "maintenance", 
        db: "closed", 
        serverId: currentId,
        timestamp: new Date().toISOString() 
      });
    }
    res.json({ 
      status: "ok", 
      db: "open", 
      serverId: currentId,
      timestamp: new Date().toISOString() 
    });
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

    // Prevent Vite from returning index.html for unmatched API routes
    app.use('/api', (req, res, next) => {
      res.status(404).json({ error: "API route not found", path: req.originalUrl });
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
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found", path: req.path });
      }

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
      if (err.code === "EADDRINUSE" && port < requestedPort + 10) {
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
