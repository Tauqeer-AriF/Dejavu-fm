import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { db, getUploadsDir } from "./db.ts";
import bcrypt from "bcryptjs";
import { apiKeyCache } from "./api_key_cache.ts";

export const externalApiRouter = Router();

// Middleware for API Key Authentication
const authenticateApiKey = async (req: any, res: any, next: any) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('djfm_')) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }

  // Senior dev optimization: Check in-memory cache first to avoid slow bcrypt.compare (~50-100ms)
  const cachedMeta = apiKeyCache.get(apiKey);
  if (cachedMeta) {
    req.apiKeyMeta = cachedMeta;
    try {
      db.prepare("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_prefix = ?").run(cachedMeta.prefix);
    } catch (e) {
      console.warn('[External API] Failed to update key last_used_at (non-blocking):', e);
    }
    return next();
  }

  try {
    const keyPrefix = apiKey.substring(0, 8);
    const keyRecord = db.prepare("SELECT key_hash, description FROM api_keys WHERE key_prefix = ?").get(keyPrefix) as { key_hash: string, description: string } | undefined;
    if (keyRecord) {
        const match = await bcrypt.compare(apiKey, keyRecord.key_hash);
        if (match) {
          const meta = { prefix: keyPrefix, description: keyRecord.description };
          // Cache the authenticated key metadata
          apiKeyCache.set(apiKey, meta);
          
          req.apiKeyMeta = meta;
          db.prepare("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_prefix = ?").run(keyPrefix);
          return next();
        }
    }
  } catch (err) {
    console.error('[External API] Key auth error:', err);
    return res.status(500).json({ error: 'Server error during authentication' });
  }

  return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
};

externalApiRouter.use(authenticateApiKey);

// Configure Multer for Media Uploads
// We save files to the uploads directory which is served statically
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadsDir();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, "hub-media-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Endpoint: POST /api/v1/media/upload
externalApiRouter.post("/media/upload", upload.single("file"), (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Construct public URL
    // Depending on deployment, it might be served from /uploads/...
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://dejavu-fm-production-402f.up.railway.app";
    const publicUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error("[External API] Media upload error:", error);
    res.status(500).json({ error: "Internal server error during upload" });
  }
});

// Endpoint: POST /api/v1/chat/messages
externalApiRouter.post("/chat/messages", (req: any, res: any) => {
  const { text, sender, imageUrl, audioUrl, videoUrl } = req.body;

  if (!text && !imageUrl && !audioUrl && !videoUrl) {
    return res.status(400).json({ error: "Message must contain text or a media URL" });
  }

  const processAndBroadcastChatMessage = req.app.get('processAndBroadcastChatMessage');
  if (!processAndBroadcastChatMessage) {
    return res.status(503).json({ error: "Chat service is currently unavailable" });
  }

  // Use the API key's description as the sender, or a fallback.
  const senderName = sender || req.apiKeyMeta?.description || "API Client";

  const newMsg = {
    id: randomUUID(),
    user: senderName,
    text: text || null,
    imageUrl: imageUrl || null,
    audioUrl: audioUrl || null,
    videoUrl: videoUrl || null,
    timestamp: Date.now(),
    isSystem: false,
    // We can add a special property to identify API-sent messages
    via: 'api' 
  };

  // The main server `chatMessage` handler will persist this to the DB and broadcast it.
  // This keeps logic centralized.
  processAndBroadcastChatMessage(newMsg);

  res.status(202).json({ 
    success: true, 
    message: "Message accepted for delivery",
    messageId: newMsg.id
  });
});

// Endpoint: POST /api/v1/shoutouts
externalApiRouter.post("/shoutouts", (req: any, res: any) => {
  const { message, listener_name, type, imageUrl, audioUrl, videoUrl } = req.body;

  if (!listener_name || (!message && !imageUrl && !audioUrl && !videoUrl)) {
    return res.status(400).json({ error: "A listener_name and either a message or a media URL are required" });
  }

  const processAndBroadcastShoutout = req.app.get('processAndBroadcastShoutout');
  if (!processAndBroadcastShoutout) {
    return res.status(503).json({ error: "Interaction service is currently unavailable" });
  }

  // This uses the same logic as the public shoutout endpoint to assign it to the current DJ
  const shoutoutData = {
    id: 0, // Will be assigned by the database
    listener_name: listener_name,
    message: message,
    type: type || 'text',
    imageUrl: imageUrl || null,
    audioUrl: audioUrl || null,
    videoUrl: videoUrl || null,
    // We can add a special property to identify API-sent shoutouts
    via: 'api' 
  };

  // The main server `new_shoutout` handler will persist this to the DB and broadcast it.
  // This keeps logic centralized.
  processAndBroadcastShoutout(shoutoutData);

  res.status(202).json({ 
    success: true, 
    message: "Shoutout accepted for delivery"
  });
});


// Endpoint: POST /api/v1/messages
externalApiRouter.post("/messages", (req: any, res: any) => {
  try {
    const { text, sender, roomId, imageUrl, audioUrl, videoUrl } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    if (!text && !imageUrl && !audioUrl && !videoUrl) {
      return res.status(400).json({ error: "Message must contain text or media" });
    }

    const senderName = sender || "Anonymous Hub User";
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO room_messages (id, room_id, sender_name, text, image_url, audio_url, video_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      roomId,
      senderName,
      text || null,
      imageUrl || null,
      audioUrl || null,
      videoUrl || null,
      timestamp
    );

    const newMessage = {
      id,
      room_id: roomId,
      sender_name: senderName,
      text: text || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      video_url: videoUrl || null,
      created_at: timestamp
    };

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("[External API] Error creating message:", error);
    res.status(500).json({ error: "Internal server error saving message" });
  }
});

// Endpoint: GET /api/v1/messages/:roomId
externalApiRouter.get("/messages/:roomId", (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = db.prepare(`
      SELECT id, room_id, sender_name, text, image_url, audio_url, video_url, created_at
      FROM room_messages
      WHERE room_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(roomId, limit);

    res.status(200).json(messages);
  } catch (error) {
    console.error("[External API] Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error fetching messages" });
  }
});
