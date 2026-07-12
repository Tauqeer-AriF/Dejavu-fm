import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { db, getUploadsDir } from "./db.ts";

export const externalApiRouter = Router();

// Middleware for API Key Authentication
const authenticateApiKey = (req: any, res: any, next: any) => {
  const apiKey = req.headers["x-api-key"];
  
  // In a real application, you might check this against a database of valid keys
  const validKey = process.env.EXTERNAL_API_KEY || "dejavu-hub-secret-key-2024";
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }
  next();
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
