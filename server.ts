import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./src/server/api.ts";
import { externalApiRouter } from "./src/server/v1_external_api.ts";
import { webhookRouter } from "./src/server/meta/webhook.routes.ts";
import { MetaService } from "./src/server/meta/meta.service.ts";
import { TwitchService } from "./src/server/twitch.service.ts";
import { initDb, db, backupDatabase, getUploadsDir, pruneHistoricalData } from "./src/server/db.ts";
import { apiKeyCache } from "./src/server/api_key_cache.ts";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

let __filename = "";
let __dirname = "";

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  // Fallback for CommonJS/Bundled environments
  // In CJS, these are available in the module scope but not on global
  try {
    __filename = __filename || "";
    __dirname = __dirname || process.cwd();
  } catch (err) {
    __filename = "";
    __dirname = process.cwd();
  }
}

import fs from "fs";
import { getPodcastFeed } from "./src/server/utils.ts";

let serverId = crypto.randomUUID();
console.log(`[SERVER] Instance ID: ${serverId}`);

async function startServer() {
  // Initialize DB immediately
  initDb();

  const app = express();
  
  // Enable Gzip/Deflate payload compression for APIs and assets
  app.use(compression());
  
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
    res.on('finish', () => {
      const sanitizedUrl = req.url.replace(/error/gi, 'err');
      console.log(`[${timestamp}] ${req.method} ${sanitizedUrl} - Status: ${res.statusCode} - ID: ${currentId.substring(0,8)} - IP: ${req.ip}`);
    });
    next();
  });

  // Trust all proxies for dynamic environments
  app.set('trust proxy', true);

  const requestedPort = 3000;
  const server = http.createServer(app);
  
  // Explicitly serve public folder for manifest.json and icons with standard cache-control headers
  app.use(express.static(path.join(process.cwd(), "public"), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.includes('manifest.json')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // Serve uploads folder with long-term caching headers
  app.use("/uploads", express.static(getUploadsDir(), {
    maxAge: '1y',
    acceptRanges: true,
    cacheControl: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));

  // Security Headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "http:", "data:", "blob:", "wss:", "ws:"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://dejavufmstore.secure-decoration.com",
          "https://player.twitch.tv",
          "https://*.google.com",
          "https://*.gstatic.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.google.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          "https://*.dicebear.com",
          "http://ip-api.com",
          "https://*.google.com",
          "https://*.googleapis.com",
        ],
        frameSrc: ["'self'", "https://player.twitch.tv", "https://*.google.com", "https://ai.studio"],
        frameAncestors: ["'self'", "https://*.google.com", "https://ai.studio", "https://*.studio.google"],
      },
    },
    frameguard: false,
  }));

  const io = new SocketIOServer(server, {
    transports: ['websocket'],
    cors: { 
      origin: true, // Allow same origin and common proxy setups
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  app.set('io', io);
  await TwitchService.initialize(io);

  // Helper for meta tag injection
  let indexHtmlCache: string | null = null;

  async function getDynamicHtml(req: express.Request, reqPath: string) {
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    const makeAbsoluteUrl = (value: string) => {
      if (!value) return value;
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//')) return value;
      if (value.startsWith('/')) return `${requestOrigin}${value}`;
      return `${requestOrigin}/${value}`;
    };

    const isProduction = process.env.NODE_ENV === "production";
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
    let title = "DejavuFM | The Sound of London";
    let description = "Direct from the heart of the capital. Since 2005, DejavuFM has been the heartbeat of the underground.";
    let image = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200";

    // Load admin SEO settings from database if available
    try {
      const settingsRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('seo_title','seo_description','seo_image','app_title','app_name','favicon')").all() as { key: string; value: string }[];
      const settingsData = settingsRows.reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      if (settingsData.seo_title) {
        title = settingsData.seo_title;
      } else if (settingsData.app_title) {
        title = settingsData.app_title;
      } else if (settingsData.app_name) {
        title = settingsData.app_name;
      }

      if (settingsData.seo_description) {
        description = settingsData.seo_description;
      }

      if (settingsData.seo_image) {
        image = makeAbsoluteUrl(settingsData.seo_image);
      } else if (settingsData.favicon) {
        image = makeAbsoluteUrl(settingsData.favicon);
      }
    } catch (err) {
      console.warn('[getDynamicHtml] Failed to load SEO settings from DB:', err);
    }

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
        title = `${podcast.title} | DejavuFM Catch Up`;
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
          title = `${dj.name} | DejavuFM Resident`;
          description = (dj.bio || description).substring(0, 160);
          image = dj.image_url || image;
        }
      }
    }

    image = makeAbsoluteUrl(image);

    const currentUrl = `${requestOrigin}${req.originalUrl}`;
    const metaTags = `
      <title>${title}</title>
      <link rel="canonical" href="${currentUrl}" />
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:image" content="${image}" />
      <meta property="og:url" content="${currentUrl}" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="DejavuFM" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
      <meta name="twitter:image" content="${image}" />
      <meta name="twitter:url" content="${currentUrl}" />
    `;

    // Replace the default title or insert before </head>
    html = html.replace("<title>DejavuFM</title>", metaTags);
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
          avatar_url: avatar_url || m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.sender}`
        };
      });
      console.log(`[Chat] Loaded ${chatHistory.length} messages from database.`);
    }
  } catch (err) {
    console.error("[Chat] Failed to load history from database:", err);
  }

  const getChatRoomCounts = () => {
    if (!db.open) return { publicMessages: 0, privateMessages: 0, shoutouts: 0, imageCount: 0, audioCount: 0, videoCount: 0 };

    const publicCount = db.prepare("SELECT COUNT(*) as count FROM public_messages").get() as { count: number };
    const privateCount = db.prepare("SELECT COUNT(*) as count FROM private_messages").get() as { count: number };
    const shoutoutCount = db.prepare("SELECT COUNT(*) as count FROM shoutouts").get() as { count: number };

    const mediaCounts = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM public_messages WHERE imageUrl IS NOT NULL) + 
        (SELECT COUNT(*) FROM private_messages WHERE imageUrl IS NOT NULL) +
        (SELECT COUNT(*) FROM shoutouts WHERE imageUrl IS NOT NULL OR replyImageUrl IS NOT NULL) as images,
        (SELECT COUNT(*) FROM public_messages WHERE audioUrl IS NOT NULL) + 
        (SELECT COUNT(*) FROM private_messages WHERE audioUrl IS NOT NULL) +
        (SELECT COUNT(*) FROM shoutouts WHERE audioUrl IS NOT NULL OR replyAudioUrl IS NOT NULL) as audios,
        (SELECT COUNT(*) FROM public_messages WHERE videoUrl IS NOT NULL) + 
        (SELECT COUNT(*) FROM private_messages WHERE videoUrl IS NOT NULL) +
        (SELECT COUNT(*) FROM shoutouts WHERE videoUrl IS NOT NULL OR replyVideoUrl IS NOT NULL) as videos
    `).get() as { images: number; audios: number; videos: number };

    return {
      publicMessages: publicCount?.count || 0,
      privateMessages: privateCount?.count || 0,
      shoutoutCount: shoutoutCount?.count || 0,
      imageCount: mediaCounts?.images || 0,
      audioCount: mediaCounts?.audios || 0,
      videoCount: mediaCounts?.videos || 0
    };
  };

  const emitChatRoomCounts = () => {
    io.emit('chatCountsUpdated', getChatRoomCounts());
  };

  const deleteMessageFiles = (messages: any[]) => {
    try {
      const uploadsDir = getUploadsDir();
      messages.forEach(msg => {
        ['imageUrl', 'audioUrl', 'videoUrl'].forEach(key => {
          const url = msg[key];
          if (typeof url === 'string') {
            let filename = '';
            if (url.includes('/uploads/')) {
              filename = url.split('/uploads/').pop() || '';
            } else if (!url.startsWith('http') && !url.startsWith('https') && url.trim() !== '') {
              filename = url;
            }
            if (filename) {
              filename = filename.split('?')[0].split('#')[0];
              const filePath = path.join(uploadsDir, filename);
              try {
                if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                  fs.unlinkSync(filePath);
                  console.log(`[Media Delete] Deleted media file: ${filePath}`);
                }
              } catch (err) {
                console.error(`[Media Delete] Failed to delete file: ${filePath}`, err);
              }
            }
          }
        });
      });
    } catch (e) {
      console.error("[Media Cleanup] Error in deleteMessageFiles helper:", e);
    }
  };

  const clearAllChatRoomData = (reason = "manual") => {
    if (!db.open) return { publicDeleted: 0, privateDeleted: 0, shoutoutsDeleted: 0 };

    try {
      const publicMsgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM public_messages WHERE imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL").all() as any[];
      deleteMessageFiles(publicMsgs);
    } catch (err) {
      console.error("[Media Cleanup] Failed to cleanup public_messages files:", err);
    }

    try {
      const privateMsgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM private_messages WHERE imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL").all() as any[];
      deleteMessageFiles(privateMsgs);
    } catch (err) {
      console.error("[Media Cleanup] Failed to cleanup private_messages files:", err);
    }

    try {
      const shoutoutMsgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl, replyImageUrl, replyAudioUrl, replyVideoUrl FROM shoutouts WHERE imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL OR replyImageUrl IS NOT NULL OR replyAudioUrl IS NOT NULL OR replyVideoUrl IS NOT NULL").all() as any[];
      // Need to handle both normal and reply media for shoutouts
      const normalizedShoutoutMsgs = shoutoutMsgs.flatMap(s => [
        { imageUrl: s.imageUrl, audioUrl: s.audioUrl, videoUrl: s.videoUrl },
        { imageUrl: s.replyImageUrl, audioUrl: s.replyAudioUrl, videoUrl: s.replyVideoUrl }
      ]);
      deleteMessageFiles(normalizedShoutoutMsgs);
    } catch (err) {
      console.error("[Media Cleanup] Failed to cleanup shoutout files:", err);
    }

    const publicInfo = db.prepare("DELETE FROM public_messages").run();
    const privateInfo = db.prepare("DELETE FROM private_messages").run();
    const shoutoutInfo = db.prepare("DELETE FROM shoutouts").run();
    chatHistory = [];

    const clearedAt = new Date().toISOString();
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run("chat_auto_delete_last_run", clearedAt);

    io.emit('messagesCleared', { isPrivate: false, allChatData: true, reason, clearedAt });
    io.emit('messagesCleared', { isPrivate: true, allChatData: true, reason, clearedAt });
    io.emit('shoutouts_cleared');
    emitChatRoomCounts();

    console.log(`[Chat Retention] Cleared chat room data (${reason}). Public: ${publicInfo.changes}, Private: ${privateInfo.changes}, Shoutouts: ${shoutoutInfo.changes}`);

    return { publicDeleted: publicInfo.changes, privateDeleted: privateInfo.changes, shoutoutsDeleted: shoutoutInfo.changes, clearedAt };
  };

  app.set('clearChatRoomData', clearAllChatRoomData);

  /**
   * Centralized function to process, save, and broadcast a new chat message.
   * This is used by both the internal chat and the external API.
   */
  const processAndBroadcastChatMessage = (msg: any) => {
    if (!db.open) return;    
    const io = app.get('io');

    let avatar_url = null;
    try {
      const senderAdmin = db.prepare("SELECT photo_url FROM admins WHERE LOWER(username) = ?").get(msg.user.toLowerCase()) as any;
      if (senderAdmin && senderAdmin.photo_url) {
        avatar_url = senderAdmin.photo_url;
      } else {
        const user = db.prepare("SELECT avatar_url FROM users WHERE username = ?").get(msg.user) as any;
        if (user) avatar_url = user.avatar_url;
      }
    } catch (err) {
      console.error("Failed to query user avatar for chat:", err);
    }

    const newMsg = { 
      ...msg, 
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      avatar_url: msg.avatar_url || avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.user}`
    };

    try {
      db.prepare("INSERT INTO public_messages (id, sender, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(newMsg.id, newMsg.user, newMsg.text || null, newMsg.imageUrl || null, newMsg.imageName || null, newMsg.audioUrl || null, newMsg.audioName || null, newMsg.videoUrl || null, newMsg.videoName || null, newMsg.timestamp, newMsg.avatar_url);
      emitChatRoomCounts();
    } catch (err) {
      console.error("Failed to save public message:", err);
    }

    chatHistory.push(newMsg);
    dispatchWebhook(newMsg).catch(console.error);
    
    // Efficiently maintain maximum history size
    while (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }
    
    // Broadcast to all clients
    io.emit('chatMessage', newMsg);
  };
  app.set('processAndBroadcastChatMessage', processAndBroadcastChatMessage);

  const dispatchWebhook = async (msg: any) => {
    const webhookUrl = process.env.HUB_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const baseUrl = process.env.PUBLIC_BASE_URL || "https://dejavu-fm-production-402f.up.railway.app";
      const makeAbsolute = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
      };

      const payload = {
        sender: msg.user || "Anonymous",
        senderHandle: msg.user || "anonymous",
        text: msg.text || "",
        imageUrl: makeAbsolute(msg.imageUrl),
        audioUrl: makeAbsolute(msg.audioUrl),
        videoUrl: makeAbsolute(msg.videoUrl)
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      console.log(`[Webhook] Successfully dispatched public message from ${payload.senderHandle}`);
    } catch (err) {
      console.error("[Webhook] Failed to dispatch webhook:", err);
    }
  };

  // API Key authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    const apiKey = socket.handshake.auth.apiKey;
    if (!apiKey) {
      // This is a regular user connection, not an API connection
      return next();
    }

    if (typeof apiKey !== 'string' || !apiKey.startsWith('djfm_')) { // Corrected from djfm_ to djfm_
      return next(new Error('Invalid API Key format'));
    }

    // Senior dev optimization: check cache first to bypass DB query and slow bcrypt compare
    const cachedMeta = apiKeyCache.get(apiKey);
    if (cachedMeta) {
      (socket as any).isApiClient = true;
      console.log(`[Socket.IO] API Client authenticated successfully (cached) with key prefix: ${cachedMeta.prefix}`);
      socket.join('api_clients');
      try {
        db.prepare("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_prefix = ?").run(cachedMeta.prefix);
      } catch (e) {
        console.warn('[Socket.IO] Failed to update key last_used_at (non-blocking):', e);
      }
      return next();
    }

    try {
      const keyPrefix = apiKey.substring(0, 8);
      const keyRecord = db.prepare("SELECT key_hash, description FROM api_keys WHERE key_prefix = ?").get(keyPrefix) as { key_hash: string, description: string } | undefined;

      if (keyRecord) {
        const match = await bcrypt.compare(apiKey, keyRecord.key_hash);
        if (match) {
          // Cache the verified key metadata
          apiKeyCache.set(apiKey, { prefix: keyPrefix, description: keyRecord.description || "New API Key" });

          (socket as any).isApiClient = true;
          console.log(`[Socket.IO] API Client authenticated successfully with key prefix: ${keyPrefix}`);
          socket.join('api_clients'); // Add the client to a dedicated room
          db.prepare("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_prefix = ?").run(keyPrefix);
          return next();
        }
      }
    } catch (err) {
      console.error('[Socket.IO] API Key auth error:', err);
      return next(new Error('Server error during authentication'));
    }

    return next(new Error('Authentication error: Invalid API Key'));
  });

  const getUniqueConnectionCount = () => {
    const ips = new Set<string>();
    io.sockets.sockets.forEach((s) => {
      const forwarded = s.handshake.headers['x-forwarded-for'];
      let ip = '';
      if (typeof forwarded === 'string') {
        ip = forwarded.split(',')[0].trim();
      } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        ip = forwarded[0].trim();
      }
      if (!ip) {
        ip = s.handshake.address || s.conn.remoteAddress || s.id;
      }
      ips.add(ip);
    });
    return ips.size || io.sockets.sockets.size || 0;
  };
  app.set('getUniqueConnectionCount', getUniqueConnectionCount);

  io.on('connection', (socket) => {
    const emitCounts = () => {
      const count = getUniqueConnectionCount();
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

        // Clean up media file from disk
        try {
          const table = payload.isPrivate ? 'private_messages' : 'public_messages';
          const msg = db.prepare(`SELECT imageUrl, audioUrl, videoUrl FROM ${table} WHERE id = ?`).get(payload.id) as any;
          if (msg) {
            deleteMessageFiles([msg]);
          }
        } catch (err) {
          console.error("[Media Cleanup] Failed to cleanup single deleted message file:", err);
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
            try {
              const msgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM private_messages WHERE ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)) AND (imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL)").all(payload.user, payload.targetRecipient, payload.targetRecipient, payload.user) as any[];
              deleteMessageFiles(msgs);
            } catch (err) {
              console.error("[Media Cleanup] Failed to cleanup private thread files:", err);
            }

            db.prepare("DELETE FROM private_messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)")
              .run(payload.user, payload.targetRecipient, payload.targetRecipient, payload.user);
            io.emit('messagesCleared', { isPrivate: true, recipient: payload.targetRecipient, sender: payload.user });
            emitChatRoomCounts();
          } else {
            // Clear ALL private messages
            try {
              const msgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM private_messages WHERE imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL").all() as any[];
              deleteMessageFiles(msgs);
            } catch (err) {
              console.error("[Media Cleanup] Failed to cleanup all private files:", err);
            }

            db.prepare("DELETE FROM private_messages").run();
            io.emit('messagesCleared', { isPrivate: true, all: true });
            emitChatRoomCounts();
          }
        } else {
          // Clear ALL public messages
          try {
            const msgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM public_messages WHERE imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL").all() as any[];
            deleteMessageFiles(msgs);
          } catch (err) {
            console.error("[Media Cleanup] Failed to cleanup all public files:", err);
          }

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

    socket.on('clearUserThread', (payload: { adminUser: string; targetUser: string }) => {
      if (!db.open) return;
      try {
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(payload.adminUser.toLowerCase());
        if (!adminCheck) {
          console.warn(`[Clear Thread] Unauthorized attempt by ${payload.adminUser}`);
          return;
        }

        // Clean up public messages files for this user
        try {
          const msgs = db.prepare("SELECT imageUrl, audioUrl, videoUrl FROM public_messages WHERE LOWER(sender) = ? AND (imageUrl IS NOT NULL OR audioUrl IS NOT NULL OR videoUrl IS NOT NULL)").all(payload.targetUser.toLowerCase()) as any[];
          deleteMessageFiles(msgs);
        } catch (err) {
          console.error("[Media Cleanup] Failed to cleanup user thread public files:", err);
        }

        const publicInfo = db.prepare("DELETE FROM public_messages WHERE LOWER(sender) = ?").run(payload.targetUser.toLowerCase());
        const shoutoutInfo = db.prepare("DELETE FROM shoutouts WHERE LOWER(listener_name) = ?").run(payload.targetUser.toLowerCase());

        chatHistory = chatHistory.filter(m => m.user.toLowerCase() !== payload.targetUser.toLowerCase());

        io.emit('userThreadCleared', { username: payload.targetUser });
        emitChatRoomCounts();
        console.log(`[Clear Thread] Cleared thread for ${payload.targetUser} by ${payload.adminUser}. Public: ${publicInfo.changes}, Shoutouts: ${shoutoutInfo.changes}`);
      } catch (err) {
        console.error("Failed to clear user thread:", err);
      }
    });

    socket.on('deleteShoutout', (payload: { id: number; user: string }) => {
      if (!db.open) return;
      try {
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(payload.user.toLowerCase());
        if (!adminCheck) {
          console.warn(`[Delete Shoutout] Unauthorized delete attempt by ${payload.user}`);
          return;
        }

        db.prepare("DELETE FROM shoutouts WHERE id = ?").run(payload.id);
        io.emit('shoutoutDeleted', { id: payload.id });
        console.log(`[Delete Shoutout] Shoutout ${payload.id} deleted by ${payload.user}`);
      } catch (err) {
        console.error("Failed to delete shoutout:", err);
      }
    });

    socket.on('clearAllShoutouts', (payload: { user: string }) => {
      if (!db.open) return;
      try {
        const adminCheck = db.prepare("SELECT 1 FROM admins WHERE LOWER(username) = ?").get(payload.user.toLowerCase());
        if (!adminCheck) {
          console.warn(`[Clear Shoutouts] Unauthorized attempt by ${payload.user}`);
          return;
        }

        db.prepare("DELETE FROM shoutouts").run();
        io.emit('shoutouts_cleared');
        console.log(`[Clear Shoutouts] All shoutouts cleared by admin ${payload.user}`);
      } catch (err) {
        console.error("Failed to clear shoutouts:", err);
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
        const userCheck = db.prepare("SELECT is_banned FROM users WHERE LOWER(username) = ?").get(username.toLowerCase()) as any;
        if (userCheck && userCheck.is_banned) {
          socket.emit('user_banned', { email: username });
          return;
        }

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

        if (isUserAdmin) {
          try {
            const shoutoutHistory = db.prepare("SELECT * FROM shoutouts ORDER BY timestamp ASC").all() as any[];
            socket.emit('shoutoutHistory', shoutoutHistory);
          } catch (shoutoutErr) {
            console.error("Failed to load shoutout history for admin:", shoutoutErr);
          }
        }
      } catch (err) {
        console.error("Failed to load private history for registered user:", err);
      }
    });

    socket.on('chatMessage', (msg) => {
       if (!msg) return;
       const sender = msg.user || (socket as any).username;
       if (sender && db.open) {
         try {
           const userCheck = db.prepare("SELECT is_banned FROM users WHERE LOWER(username) = ?").get(sender.toLowerCase()) as any;
           if (userCheck && userCheck.is_banned) {
             socket.emit('user_banned', { email: sender });
             return;
           }
         } catch (e) {}
       }

       if (msg.recipient) {
         // Private message logic remains here as it's not part of the public API endpoint
         if (!db.open) return;

         // Check if either user has blocked the other
         try {
           const isBlocked = db.prepare(
             "SELECT 1 FROM user_blocks WHERE (LOWER(blocker) = LOWER(?) AND LOWER(blocked) = LOWER(?)) OR (LOWER(blocker) = LOWER(?) AND LOWER(blocked) = LOWER(?))"
           ).get(msg.user, msg.recipient, msg.recipient, msg.user);
           if (isBlocked) {
             console.log(`[PM Blocked] Suppressed private message between '${msg.user}' and '${msg.recipient}' due to active user block.`);
             socket.emit('chatMessageError', {
               recipient: msg.recipient,
               error: `Message restricted: A user block is active between you and @${msg.recipient}.`
             });
             return;
           }
         } catch (blockErr) {
           console.error("[PM Block Check Error]", blockErr);
         }

         const newMsg = { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }; // Simplified for PM
         if (msg.platform === 'twitch') {
           TwitchService.sendChatMessage(msg.text).then(() => {
             console.log(`[Twitch Reply Dispatcher] Dispatched Twitch reply to ${msg.recipient} successfully`);
           }).catch((err: any) => {
             console.error(`[Twitch Reply Dispatcher] Error sending Twitch reply:`, err.message);
           });
         }
          if (msg.platform && ['whatsapp', 'instagram', 'facebook'].includes(msg.platform)) {
            MetaService.sendPlatformReply(msg.platform, msg.recipient, msg.text).then(() => {
              console.log(`[Meta Reply Dispatcher] Dispatched ${msg.platform} reply to ${msg.recipient} successfully`);
            }).catch((err: any) => {
              console.error(`[Meta Reply Dispatcher] Error sending ${msg.platform} reply:`, err.message);
            });
          }
         try {
           db.prepare("INSERT INTO private_messages (id, sender, recipient, text, imageUrl, imageName, audioUrl, audioName, videoUrl, videoName, timestamp, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
             .run(newMsg.id, msg.user, msg.recipient, msg.text || null, msg.imageUrl || null, msg.imageName || null, msg.audioUrl || null, msg.audioName || null, msg.videoUrl || null, msg.videoName || null, newMsg.timestamp, msg.platform || null);
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
         // Public messages are now handled by the centralized function
         processAndBroadcastChatMessage(msg);
       }
    });

     /**
   * Centralized function to process, save, and broadcast a new shoutout.
   * This is used by both the public widget and the external API.
   */
  const processAndBroadcastShoutout = (shoutoutData: { listener_name: string; message: string; type?: string; imageUrl?: string; audioUrl?: string; videoUrl?: string; }) => {
    if (!db.open) return;

    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const previousDay = (dayOfWeek + 6) % 7;
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
      const currentDj = db.prepare(`
        SELECT s.dj_id, s.show_name, d.name as dj_name
        FROM schedule s
        JOIN djs d ON s.dj_id = d.id
        WHERE (
          s.day_of_week = ? AND s.start_time <= ? AND (s.end_time > ? OR s.end_time <= s.start_time)
        ) OR (
          s.day_of_week = ? AND s.end_time <= s.start_time AND s.end_time > ?
        )
        ORDER BY s.start_time DESC LIMIT 1
      `).get(dayOfWeek, currentTime, currentTime, previousDay, currentTime) as { dj_id: string; show_name: string; dj_name: string } | undefined;

      const info = db.prepare("INSERT INTO shoutouts (listener_name, message, type, imageUrl, audioUrl, videoUrl, dj_id, dj_name, show_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(shoutoutData.listener_name, shoutoutData.message, shoutoutData.type || 'text', shoutoutData.imageUrl || null, shoutoutData.audioUrl || null, shoutoutData.videoUrl || null, currentDj?.dj_id || null, currentDj?.dj_name || null, currentDj?.show_name || null);

      const newShoutout = {
        id: info.lastInsertRowid,
        ...shoutoutData,
        dj_id: currentDj?.dj_id || null,
        dj_name: currentDj?.dj_name || null,
        show_name: currentDj?.show_name || null,
        timestamp: Date.now()
      };

      // Broadcast to all clients (dashboard, public widget, and API clients)
      io.emit('new_shoutout', newShoutout);
    } catch (err) {
      console.error("[Shoutout] Failed to process and broadcast shoutout:", err);
    }
  };
  app.set('processAndBroadcastShoutout', processAndBroadcastShoutout);

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

  // Nightly Pruning of Historical Analytics/Audit Log Records (Once every 24 hours)
  const performNightlyPruning = () => {
    if (!db.open) return;
    try {
      const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'data_prune_enabled'").get() as {value: string} | undefined;
      // If setting exists and is set to '0', skip pruning
      if (enabledRow && enabledRow.value === '0') {
        console.log("[Nightly Pruning Task] Automatic pruning is disabled in settings.");
        return;
      }
      pruneHistoricalData();
    } catch (e) {
      console.error("[Nightly Pruning Task] Error:", e);
    }
  };
  const NIGHTLY_PRUNE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(performNightlyPruning, NIGHTLY_PRUNE_INTERVAL);
  setTimeout(performNightlyPruning, 30000); // Initial pruning check 30 seconds after startup

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
  const CHECK_INTERVAL = 5000; // Check every 5 seconds for responsive takeover

  setInterval(() => {
    if (!db || !db.open) return;
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); 
      const previousDay = (dayOfWeek + 6) % 7;
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      // Robust check handling midnight crossing schedule slots
      const currentSlot = db.prepare(`
        SELECT dj_id FROM schedule
        WHERE (
          day_of_week = ? AND start_time <= ? AND (end_time > ? OR end_time <= start_time)
        ) OR (
          day_of_week = ? AND end_time <= start_time AND end_time > ?
        )
        ORDER BY start_time DESC LIMIT 1
      `).get(dayOfWeek, time, time, previousDay, time) as { dj_id: any } | undefined;

      const currentDjId = currentSlot ? String(currentSlot.dj_id) : null;

      if (lastScheduledDjId === null) {
        // Initialize on first check so we don't clear right after server boots
        lastScheduledDjId = currentDjId;
      } else if (currentDjId !== lastScheduledDjId) {
        console.log(`[Shift Change] DJ changed from ${lastScheduledDjId} to ${currentDjId}. Clearing shoutouts.`);
        db.prepare("DELETE FROM shoutouts").run();
        io.emit('shoutouts_cleared');
        lastScheduledDjId = currentDjId;
      }
    } catch (err) {
      console.error("[Shift Check Cache Error]", err);
    }
  }, CHECK_INTERVAL);

  // Middleware
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use("/api/v1", externalApiRouter);
  app.use("/api", apiRouter);
  app.use("/webhook", webhookRouter);

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
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    // In dev, only serve dynamic HTML to bots to avoid breaking Vite client
    app.get(dynamicPreviewRoutes, async (req, res, next) => {
      const ua = req.headers["user-agent"] || "";
      if (isBot(ua)) {
        try {
          const html = await getDynamicHtml(req, req.path);
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
        const html = await getDynamicHtml(req, req.path);
        res.send(html);
      } catch (e) {
        next();
      }
    });

    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { 
      index: false,
      maxAge: '1y',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.includes('service-worker') || filePath.includes('sw.js')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
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
        const html = await getDynamicHtml(req, req.path);
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
