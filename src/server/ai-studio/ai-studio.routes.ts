import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { z } from "zod";
import { db, getUploadsDir } from "../db.ts";
import { authMiddleware, authorizeRole, logAction } from "../api.ts";
import {
  createAndStartAIJob,
  cancelAIJob,
  deleteAIJob,
  retryAIJob,
  deleteSingleReel,
  autoDeleteExpiredReels
} from "./job-queue.service.ts";
import { getAIStudioSettingsFromDb } from "./gemini.service.ts";
import { checkAndTriggerCompletedShowReels, getLiveOnAirShowStatus } from "./schedule-listener.service.ts";
import {
  getAIStudioStorageDir,
  sliceAudioChunk,
  renderVerticalSocialReel,
  pruneAIStudioDiskAssets,
  VisualizerTheme,
  AspectRatioOption
} from "./ffmpeg.service.ts";
import { createRequire } from "module";
import * as archiverModule from "archiver";

function createZipArchive(format = 'zip', options = { zlib: { level: 6 } }): any {
  let archiverObj: any = null;
  try {
    const req = createRequire(import.meta.url);
    archiverObj = req("archiver");
  } catch (e) {
    console.warn("[AI Studio] createRequire archiver failed, falling back to ES import", e);
  }

  if (!archiverObj) {
    archiverObj = archiverModule;
  }

  if (archiverObj) {
    // archiver v8 exports class constructors ZipArchive, TarArchive, JsonArchive
    if (format === 'zip' && archiverObj.ZipArchive) {
      return new archiverObj.ZipArchive(options);
    }
    if (format === 'tar' && archiverObj.TarArchive) {
      return new archiverObj.TarArchive(options);
    }
    if (format === 'json' && archiverObj.JsonArchive) {
      return new archiverObj.JsonArchive(options);
    }
    if (archiverObj.default && format === 'zip' && archiverObj.default.ZipArchive) {
      return new archiverObj.default.ZipArchive(options);
    }
    if (archiverObj.default && format === 'tar' && archiverObj.default.TarArchive) {
      return new archiverObj.default.TarArchive(options);
    }

    // archiver v7/v6 style function exports
    if (typeof archiverObj === 'function') {
      return archiverObj(format, options);
    }
    if (typeof archiverObj.default === 'function') {
      return archiverObj.default(format, options);
    }
    if (typeof archiverObj.create === 'function') {
      return archiverObj.create(format, options);
    }
    if (typeof archiverObj.default?.create === 'function') {
      return archiverObj.default.create(format, options);
    }
  }

  throw new Error("Could not initialize archiver zip instance");
}

function resolveLocalFilePath(fileUrl?: string): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const storageDir = getAIStudioStorageDir();
  const uploadsDir = getUploadsDir();
  
  const cleanPath = fileUrl.replace(/^https?:\/\/[^\/]+/, '').split('?')[0];
  const relStudio = cleanPath.split('/uploads/ai-studio/').pop() || cleanPath.split('/uploads/').pop();
  if (relStudio) {
    const candidates = [
      path.join(storageDir, relStudio),
      path.join(uploadsDir, relStudio),
      path.join(storageDir, path.basename(relStudio)),
      path.join(uploadsDir, path.basename(relStudio))
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

export const aiStudioRouter = Router();

// Strict Admin-Only Authorization across ALL AI Studio endpoints
// Only 'admin' and 'owner' are allowed. DJs and regular users are strictly blocked with 403 Forbidden.
aiStudioRouter.use(authMiddleware, authorizeRole('admin'));

// Multer storage for custom DJ audio/video uploads
const aiStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getAIStudioStorageDir();
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp3";
    const uniqueName = `upload_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadSource = multer({
  storage: aiStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'video/mp4', 'audio/aac', 'audio/ogg', 'audio/m4a'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|mp4|aac|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and MP4 video recordings are supported.'));
    }
  }
});

// ----------------------------------------------------
// 1. STATS & ANALYTICS
// ----------------------------------------------------
aiStudioRouter.get("/stats", (req: Request, res: Response) => {
  try {
    const totalJobs = db.prepare("SELECT COUNT(*) as count FROM ai_jobs").get() as { count: number };
    const activeJobs = db.prepare("SELECT COUNT(*) as count FROM ai_jobs WHERE status IN ('QUEUED', 'CAPTURING', 'ANALYZING', 'GENERATING')").get() as { count: number };
    const totalReels = db.prepare("SELECT COUNT(*) as count FROM ai_reels").get() as { count: number };
    const pendingReview = db.prepare("SELECT COUNT(*) as count FROM ai_reels WHERE status = 'PENDING_REVIEW'").get() as { count: number };
    const approvedReels = db.prepare("SELECT COUNT(*) as count FROM ai_reels WHERE status = 'APPROVED'").get() as { count: number };
    const rejectedReels = db.prepare("SELECT COUNT(*) as count FROM ai_reels WHERE status = 'REJECTED'").get() as { count: number };
    const avgVirality = db.prepare("SELECT AVG(virality_score) as avgScore FROM ai_reels").get() as { avgScore: number | null };

    res.json({
      totalJobs: totalJobs?.count || 0,
      activeJobs: activeJobs?.count || 0,
      totalReels: totalReels?.count || 0,
      pendingReview: pendingReview?.count || 0,
      approvedReels: approvedReels?.count || 0,
      rejectedReels: rejectedReels?.count || 0,
      avgViralityScore: Math.round(avgVirality?.avgScore || 88)
    });
  } catch (err: any) {
    console.error("[AI Studio] Error getting stats:", err);
    res.status(500).json({ error: "Failed to fetch AI Studio statistics" });
  }
});

// ----------------------------------------------------
// 2. JOBS PIPELINE
// ----------------------------------------------------
aiStudioRouter.get("/jobs", (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT j.*, 
        (SELECT COUNT(*) FROM ai_reels r WHERE r.job_id = j.id) as reels_count
      FROM ai_jobs j
    `;
    const params: any[] = [];

    if (status) {
      query += " WHERE j.status = ?";
      params.push(status);
    }

    query += " ORDER BY j.created_at DESC LIMIT 50";
    const jobs = db.prepare(query).all(...params);
    res.json(jobs);
  } catch (err: any) {
    console.error("[AI Studio] Error fetching jobs:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

aiStudioRouter.get("/jobs/:id", (req: Request, res: Response) => {
  try {
    const job = db.prepare("SELECT * FROM ai_jobs WHERE id = ?").get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    const reels = db.prepare("SELECT * FROM ai_reels WHERE job_id = ? ORDER BY start_seconds ASC").all(req.params.id);
    res.json({ job, reels });
  } catch (err: any) {
    console.error("[AI Studio] Error fetching job details:", err);
    res.status(500).json({ error: "Failed to fetch job details" });
  }
});

const createJobSchema = z.object({
  show_name: z.string().min(1, "Show name is required"),
  dj_name: z.string().min(1, "DJ name is required"),
  dj_id: z.string().optional().nullable(),
  source_type: z.enum(['live_stream', 'stream_url', 'podcast', 'upload', 'schedule_slot']),
  source_url: z.string().optional().nullable(),
  custom_prompt: z.string().optional().nullable(),
  preset_id: z.string().optional().nullable(),
  template: z.enum(['neon_cyber', 'minimal_studio', 'retro_vinyl', 'waveform_pulse']).optional().default('neon_cyber'),
  aspect_ratio: z.enum(['9:16', '1:1', '16:9']).optional().default('9:16'),
  target_reels_count: z.number().int().min(1).max(6).optional().default(3),
  duration_seconds: z.number().int().min(15).max(300).optional().default(60)
});

aiStudioRouter.post("/jobs", async (req: any, res: Response) => {
  try {
    const parsed = createJobSchema.parse(req.body);
    const createdBy = req.user?.username || 'Admin';

    const job = await createAndStartAIJob({
      show_name: parsed.show_name,
      dj_name: parsed.dj_name,
      dj_id: parsed.dj_id || undefined,
      source_type: parsed.source_type,
      source_url: parsed.source_url || undefined,
      custom_prompt: parsed.custom_prompt || undefined,
      preset_id: parsed.preset_id || undefined,
      template: parsed.template,
      aspect_ratio: parsed.aspect_ratio,
      target_reels_count: parsed.target_reels_count,
      duration_seconds: parsed.duration_seconds,
      created_by: createdBy
    });

    logAction(req, 'CREATE', 'ai_job', job.id, { show: parsed.show_name, dj: parsed.dj_name });
    res.status(201).json({ success: true, job });
  } catch (err: any) {
    console.error("[AI Studio] Error creating job:", err);
    res.status(400).json({ error: err.message || "Failed to create AI Studio job" });
  }
});

aiStudioRouter.post("/jobs/:id/cancel", (req: any, res: Response) => {
  try {
    const job = cancelAIJob(req.params.id);
    logAction(req, 'CANCEL', 'ai_job', req.params.id);
    res.json({ success: true, job });
  } catch (err: any) {
    console.error("[AI Studio] Error cancelling job:", err);
    res.status(500).json({ error: "Failed to cancel job" });
  }
});

aiStudioRouter.post("/jobs/:id/retry", (req: any, res: Response) => {
  try {
    const job = retryAIJob(req.params.id);
    logAction(req, 'RETRY', 'ai_job', req.params.id);
    res.json({ success: true, job });
  } catch (err: any) {
    console.error("[AI Studio] Error retrying job:", err);
    res.status(500).json({ error: err.message || "Failed to retry job" });
  }
});

aiStudioRouter.delete("/jobs/:id", (req: any, res: Response) => {
  try {
    deleteAIJob(req.params.id);
    logAction(req, 'DELETE', 'ai_job', req.params.id);
    res.json({ success: true, message: "Job and all generated assets deleted." });
  } catch (err: any) {
    console.error("[AI Studio] Error deleting job:", err);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// ----------------------------------------------------
// 3. REELS MANAGEMENT & REVIEW
// ----------------------------------------------------
aiStudioRouter.get("/reels", (req: Request, res: Response) => {
  try {
    const { status, category, search, job_id, sort } = req.query;
    let query = `
      SELECT r.*, j.show_name, j.dj_name, j.dj_id
      FROM ai_reels r
      JOIN ai_jobs j ON r.job_id = j.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += " AND r.status = ?";
      params.push(status);
    }

    if (category && category !== 'ALL') {
      query += " AND r.category = ?";
      params.push(category);
    }

    if (job_id) {
      query += " AND r.job_id = ?";
      params.push(job_id);
    }

    if (search) {
      query += " AND (r.title LIKE ? OR r.hook LIKE ? OR j.dj_name LIKE ? OR j.show_name LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (sort === 'virality') {
      query += " ORDER BY r.virality_score DESC, r.created_at DESC";
    } else {
      query += " ORDER BY r.created_at DESC";
    }

    query += " LIMIT 100";

    const reels = db.prepare(query).all(...params);
    res.json(reels);
  } catch (err: any) {
    console.error("[AI Studio] Error fetching reels:", err);
    res.status(500).json({ error: "Failed to fetch social reels" });
  }
});

aiStudioRouter.get("/reels/:id", (req: Request, res: Response) => {
  try {
    const reel = db.prepare(`
      SELECT r.*, j.show_name, j.dj_name, j.dj_id, j.source_type
      FROM ai_reels r
      JOIN ai_jobs j ON r.job_id = j.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    res.json(reel);
  } catch (err: any) {
    console.error("[AI Studio] Error fetching reel:", err);
    res.status(500).json({ error: "Failed to fetch reel" });
  }
});

const updateReelSchema = z.object({
  title: z.string().optional(),
  hook: z.string().optional(),
  summary: z.string().optional(),
  category: z.enum(['Drop', 'Transition', 'Banter', 'Shoutout', 'Exclusive', 'CrowdHype']).optional(),
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPORTED', 'PUBLISHED']).optional(),
  social_copy: z.string().optional(),
  hashtags: z.string().optional(),
  admin_notes: z.string().optional().nullable()
});

aiStudioRouter.patch("/reels/:id", (req: any, res: Response) => {
  try {
    const parsed = updateReelSchema.parse(req.body);
    const reel = db.prepare("SELECT * FROM ai_reels WHERE id = ?").get(req.params.id) as any;
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    if ((reel.status === 'APPROVED' || reel.status === 'EXPORTED' || reel.status === 'PUBLISHED') && parsed.status === 'REJECTED') {
      return res.status(400).json({ error: "Approved reels cannot be rejected." });
    }

    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(parsed).forEach(([key, val]) => {
      if (val !== undefined) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    });

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(req.params.id);
      db.prepare(`UPDATE ai_reels SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare("SELECT * FROM ai_reels WHERE id = ?").get(req.params.id);
    const actionName = parsed.status === 'APPROVED' ? 'APPROVE' : parsed.status === 'REJECTED' ? 'REJECT' : 'UPDATE';
    logAction(req, actionName, 'ai_reel', req.params.id, { title: reel.title, changes: parsed });
    res.json({ success: true, reel: updated });
  } catch (err: any) {
    console.error("[AI Studio] Error updating reel:", err);
    res.status(400).json({ error: err.message || "Failed to update reel" });
  }
});

// Trim / Re-render Video with updated start/end timestamps
aiStudioRouter.post("/reels/:id/trim", async (req: any, res: Response) => {
  try {
    const { start_seconds, end_seconds } = req.body;
    const start = parseFloat(start_seconds);
    const end = parseFloat(end_seconds);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ error: "Invalid start or end timestamps" });
    }

    const reel = db.prepare(`
      SELECT r.*, j.show_name, j.dj_name, j.dj_id
      FROM ai_reels r
      JOIN ai_jobs j ON r.job_id = j.id
      WHERE r.id = ?
    `).get(req.params.id) as any;

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    const storageDir = getAIStudioStorageDir();
    const sourceAudioPath = path.join(storageDir, `${reel.job_id}_source.mp3`);

    if (!fs.existsSync(sourceAudioPath)) {
      return res.status(400).json({ error: "Original show source audio is no longer on disk for trimming." });
    }

    const clipDuration = Math.max(5, end - start);
    const newAudioFile = `${reel.id}_trimmed_audio.mp3`;
    const newAudioPath = path.join(storageDir, newAudioFile);
    await sliceAudioChunk(sourceAudioPath, start, clipDuration, newAudioPath);

    const newVideoFile = `${reel.id}_trimmed_reel.mp4`;
    const newVideoPath = path.join(storageDir, newVideoFile);
    const newThumbFile = `${reel.id}_trimmed_thumb.jpg`;
    const newThumbPath = path.join(storageDir, newThumbFile);

    let djPhotoUrl: string | null = null;
    try {
      if (reel.dj_id) {
        const dj = db.prepare('SELECT image_url FROM djs WHERE id = ?').get(reel.dj_id) as any;
        if (dj?.image_url) djPhotoUrl = dj.image_url;
      }
    } catch (e) {}

    await renderVerticalSocialReel({
      audioPath: newAudioPath,
      djName: reel.dj_name,
      showName: reel.show_name,
      djPhotoUrl,
      hookText: reel.hook || "ENERGY UNLOCKED 🔥",
      durationSeconds: clipDuration,
      outputVideoPath: newVideoPath,
      outputThumbnailPath: newThumbPath
    });

    const newAudioUrl = `/uploads/ai-studio/${newAudioFile}`;
    const newVideoUrl = `/uploads/ai-studio/${newVideoFile}`;
    const newThumbUrl = `/uploads/ai-studio/${newThumbFile}`;

    db.prepare(`
      UPDATE ai_reels 
      SET start_seconds = ?, end_seconds = ?, duration_seconds = ?, 
          audio_url = ?, video_url = ?, thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(start, end, clipDuration, newAudioUrl, newVideoUrl, newThumbUrl, reel.id);

    const updated = db.prepare("SELECT * FROM ai_reels WHERE id = ?").get(reel.id);
    logAction(req, 'TRIM', 'ai_reel', reel.id, { start, end });
    res.json({ success: true, reel: updated });
  } catch (err: any) {
    console.error("[AI Studio] Error trimming reel:", err);
    res.status(500).json({ error: err.message || "Failed to trim and re-render reel" });
  }
});

// Custom Re-render Reel with Visualizer Theme and Aspect Ratio
aiStudioRouter.post("/reels/:id/re-render", async (req: any, res: Response) => {
  try {
    const { template, aspect_ratio, hook, caption, start_seconds, end_seconds } = req.body;

    const reel = db.prepare(`
      SELECT r.*, j.show_name, j.dj_name, j.dj_id
      FROM ai_reels r
      JOIN ai_jobs j ON r.job_id = j.id
      WHERE r.id = ?
    `).get(req.params.id) as any;

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    const storageDir = getAIStudioStorageDir();
    const sourceAudioPath = path.join(storageDir, `${reel.job_id}_source.mp3`);
    let audioPathToUse = '';

    // If source audio is available, allow re-slicing with start/end
    const start = typeof start_seconds === 'number' ? start_seconds : reel.start_seconds;
    const end = typeof end_seconds === 'number' ? end_seconds : reel.end_seconds;
    const clipDuration = Math.max(5, end - start);

    if (fs.existsSync(sourceAudioPath)) {
      const newAudioFile = `${reel.id}_rendered_audio.mp3`;
      const newAudioPath = path.join(storageDir, newAudioFile);
      await sliceAudioChunk(sourceAudioPath, start, clipDuration, newAudioPath);
      audioPathToUse = newAudioPath;
    } else {
      // Fallback: use the existing sliced reel audio
      const existingAudio = reel.audio_url?.split('/uploads/ai-studio/').pop();
      const existingAudioPath = existingAudio ? path.join(storageDir, existingAudio) : '';
      if (existingAudioPath && fs.existsSync(existingAudioPath)) {
        audioPathToUse = existingAudioPath;
      } else {
        return res.status(400).json({ error: "Audio source file is not found on disk for re-rendering." });
      }
    }

    const newVideoFile = `${reel.id}_v${Date.now()}_reel.mp4`;
    const newVideoPath = path.join(storageDir, newVideoFile);
    const newThumbFile = `${reel.id}_v${Date.now()}_thumb.jpg`;
    const newThumbPath = path.join(storageDir, newThumbFile);

    let djPhotoUrl: string | null = null;
    try {
      if (reel.dj_id) {
        const dj = db.prepare('SELECT image_url FROM djs WHERE id = ?').get(reel.dj_id) as any;
        if (dj?.image_url) djPhotoUrl = dj.image_url;
      }
    } catch (e) {}

    const selectedTemplate: VisualizerTheme = template || reel.template || 'neon_cyber';
    const selectedAspect: AspectRatioOption = aspect_ratio || reel.aspect_ratio || '9:16';

    await renderVerticalSocialReel({
      audioPath: audioPathToUse,
      djName: reel.dj_name,
      showName: reel.show_name,
      djPhotoUrl,
      hookText: hook || reel.hook || "ENERGY UNLOCKED 🔥",
      captionText: caption || (reel.captions_json ? JSON.parse(reel.captions_json)[0]?.text : "DejavuFM Underground Radio"),
      durationSeconds: clipDuration,
      template: selectedTemplate,
      aspectRatio: selectedAspect,
      outputVideoPath: newVideoPath,
      outputThumbnailPath: newThumbPath
    });

    const newVideoUrl = `/uploads/ai-studio/${newVideoFile}`;
    const newThumbUrl = `/uploads/ai-studio/${newThumbFile}`;

    db.prepare(`
      UPDATE ai_reels 
      SET start_seconds = ?, end_seconds = ?, duration_seconds = ?, 
          hook = COALESCE(?, hook), aspect_ratio = ?, template = ?,
          video_url = ?, thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(start, end, clipDuration, hook || null, selectedAspect, selectedTemplate, newVideoUrl, newThumbUrl, reel.id);

    const updated = db.prepare("SELECT * FROM ai_reels WHERE id = ?").get(reel.id);
    logAction(req, 'RE_RENDER', 'ai_reel', reel.id, { template: selectedTemplate, aspect: selectedAspect });
    res.json({ success: true, reel: updated });
  } catch (err: any) {
    console.error("[AI Studio] Error re-rendering reel:", err);
    res.status(500).json({ error: err.message || "Failed to re-render reel" });
  }
});

// Batch Approve Multiple Reels
aiStudioRouter.post("/reels/batch-approve", (req: any, res: Response) => {
  try {
    const { reelIds } = req.body;
    if (!Array.isArray(reelIds) || reelIds.length === 0) {
      return res.status(400).json({ error: "reelIds must be a non-empty array" });
    }

    const placeholders = reelIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE ai_reels 
      SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `);
    const result = stmt.run(...reelIds);

    logAction(req, 'BATCH_APPROVE', 'ai_reel', null, { count: result.changes, ids: reelIds });
    res.json({ success: true, approvedCount: result.changes });
  } catch (err: any) {
    console.error("[AI Studio] Error batch approving reels:", err);
    res.status(500).json({ error: "Failed to batch approve reels" });
  }
});

// Batch Delete Multiple Reels
aiStudioRouter.post("/reels/batch-delete", (req: any, res: Response) => {
  try {
    const { reelIds } = req.body;
    if (!Array.isArray(reelIds) || reelIds.length === 0) {
      return res.status(400).json({ error: "reelIds must be a non-empty array" });
    }

    for (const id of reelIds) {
      deleteSingleReel(id);
    }

    logAction(req, 'BATCH_DELETE', 'ai_reel', null, { count: reelIds.length, ids: reelIds });
    res.json({ success: true, deletedCount: reelIds.length });
  } catch (err: any) {
    console.error("[AI Studio] Error batch deleting reels:", err);
    res.status(500).json({ error: "Failed to batch delete reels" });
  }
});

// Batch Download as ZIP Archive
aiStudioRouter.post("/reels/batch-download", async (req: any, res: Response) => {
  try {
    const { reelIds } = req.body;
    if (!Array.isArray(reelIds) || reelIds.length === 0) {
      return res.status(400).json({ error: "reelIds must be a non-empty array" });
    }

    const placeholders = reelIds.map(() => '?').join(',');
    const reels = db.prepare(`
      SELECT r.*, COALESCE(j.show_name, 'DejavuFM') as show_name, COALESCE(j.dj_name, 'DejavuFM DJ') as dj_name 
      FROM ai_reels r 
      LEFT JOIN ai_jobs j ON r.job_id = j.id 
      WHERE r.id IN (${placeholders})
    `).all(...reelIds) as any[];

    if (reels.length === 0) {
      return res.status(404).json({ error: "No reels found matching selected IDs" });
    }

    const zipFilename = `DejavuFM_Reels_Batch_${Date.now()}.zip`;

    const archive = createZipArchive('zip', { zlib: { level: 6 } });

    archive.on('error', (err: any) => {
      console.error('[AI Studio] Archiver stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Failed to generate zip archive stream" });
      }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    archive.pipe(res);

    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      const safeTitle = (reel.title || `Reel_${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');

      // Video file
      if (reel.video_url) {
        const fullVidPath = resolveLocalFilePath(reel.video_url);
        if (fullVidPath) {
          archive.file(fullVidPath, { name: `${i + 1}_${safeTitle}.mp4` });
        }
      }

      // Audio snippet
      if (reel.audio_url) {
        const fullAudPath = resolveLocalFilePath(reel.audio_url);
        if (fullAudPath) {
          archive.file(fullAudPath, { name: `${i + 1}_${safeTitle}_audio.mp3` });
        }
      }

      // Caption & metadata text
      const metaContent = [
        `Title: ${reel.title || 'Untitled Reel'}`,
        `DJ: ${reel.dj_name || 'DejavuFM DJ'}`,
        `Show: ${reel.show_name || 'DejavuFM Show'}`,
        `Category: ${reel.category || 'General'}`,
        `Virality Score: ${reel.virality_score || 0}/100`,
        `Hook: ${reel.hook || ''}`,
        `Summary: ${reel.summary || ''}`,
        `\n--- SOCIAL COPY ---`,
        reel.social_copy || '',
        `\n--- HASHTAGS ---`,
        reel.hashtags || '',
      ].join('\n');

      archive.append(metaContent, { name: `${i + 1}_${safeTitle}_captions.txt` });
    }

    logAction(req, 'BATCH_DOWNLOAD', 'ai_reel', null, { count: reels.length, reelIds });
    await archive.finalize();
  } catch (err: any) {
    console.error("[AI Studio] Batch download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Failed to generate zip archive" });
    }
  }
});

// Disk Cleanup Endpoint
aiStudioRouter.post("/cleanup", (req: any, res: Response) => {
  try {
    const { maxAgeHours } = req.body;
    const hours = typeof maxAgeHours === 'number' && maxAgeHours > 0 ? maxAgeHours : 48;
    const result = pruneAIStudioDiskAssets(hours);
    logAction(req, 'CLEANUP_DISK', 'ai_studio', null, result);
    res.json({
      success: true,
      deletedFilesCount: result.deletedFilesCount,
      freedBytes: result.freedBytes,
      freedMB: (result.freedBytes / (1024 * 1024)).toFixed(2)
    });
  } catch (err: any) {
    console.error("[AI Studio] Cleanup error:", err);
    res.status(500).json({ error: "Disk cleanup failed" });
  }
});

// Reel Retention Auto-Cleanup Endpoint (Manual Trigger)
aiStudioRouter.post("/cleanup-reels", (req: any, res: Response) => {
  try {
    const { maxAgeHours, unapprovedOnly } = req.body;
    const settings = getAIStudioSettingsFromDb();
    const hours = typeof maxAgeHours === 'number' && maxAgeHours > 0 
      ? maxAgeHours 
      : settings.ai_auto_delete_reels_hours || 48;
    const onlyUnapproved = typeof unapprovedOnly === 'boolean' 
      ? unapprovedOnly 
      : settings.ai_auto_delete_unapproved_only;

    const result = autoDeleteExpiredReels(hours, onlyUnapproved);
    logAction(req, 'CLEANUP_EXPIRED_REELS', 'ai_studio', null, { hours, onlyUnapproved, ...result });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      freedMB: result.freedMB,
      message: `Successfully purged ${result.deletedCount} reel(s) older than ${hours} hours (freed ${result.freedMB} MB).`
    });
  } catch (err: any) {
    console.error("[AI Studio] Reel cleanup error:", err);
    res.status(500).json({ error: "Failed to cleanup expired reels" });
  }
});

aiStudioRouter.get("/reels/:id/download", (req: any, res: Response) => {
  try {
    const reel = db.prepare(`
      SELECT r.*, COALESCE(j.show_name, 'DejavuFM') as show_name, COALESCE(j.dj_name, 'DejavuFM DJ') as dj_name
      FROM ai_reels r
      LEFT JOIN ai_jobs j ON r.job_id = j.id
      WHERE r.id = ?
    `).get(req.params.id) as any;

    if (!reel || !reel.video_url) {
      return res.status(404).json({ error: "Reel or video URL not found" });
    }

    const filePath = resolveLocalFilePath(reel.video_url);
    if (!filePath) {
      return res.status(404).json({ error: "Video file not found on disk" });
    }

    const downloadName = `DejavuFM_${reel.category || 'Reel'}_${reel.id}.mp4`
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    logAction(req, 'DOWNLOAD', 'ai_reel', req.params.id, { title: reel.title, show: reel.show_name, dj: reel.dj_name });
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(filePath);
  } catch (err: any) {
    console.error("[AI Studio] Error serving reel download:", err);
    res.status(500).json({ error: err.message || "Failed to download reel video" });
  }
});

aiStudioRouter.delete("/reels/:id", (req: any, res: Response) => {
  try {
    deleteSingleReel(req.params.id);
    logAction(req, 'DELETE', 'ai_reel', req.params.id);
    res.json({ success: true, message: "Reel deleted" });
  } catch (err: any) {
    console.error("[AI Studio] Error deleting reel:", err);
    res.status(500).json({ error: "Failed to delete reel" });
  }
});

// ----------------------------------------------------
// 4. PROMPT PRESETS & CONFIGURATION
// ----------------------------------------------------
aiStudioRouter.get("/presets", (req: Request, res: Response) => {
  try {
    const presets = db.prepare("SELECT * FROM ai_prompt_presets ORDER BY is_default DESC, name ASC").all();
    res.json(presets);
  } catch (err: any) {
    console.error("[AI Studio] Error fetching presets:", err);
    res.status(500).json({ error: "Failed to fetch prompt presets" });
  }
});

aiStudioRouter.post("/presets", (req: any, res: Response) => {
  try {
    const { id, name, description, category, prompt_instructions, style_tags, target_duration, is_default } = req.body;
    if (!name || !prompt_instructions) {
      return res.status(400).json({ error: "Name and prompt instructions are required" });
    }

    const presetId = id || `preset_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO ai_prompt_presets (id, name, description, category, prompt_instructions, style_tags, target_duration, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        prompt_instructions = excluded.prompt_instructions,
        style_tags = excluded.style_tags,
        target_duration = excluded.target_duration,
        is_default = excluded.is_default
    `).run(
      presetId,
      name,
      description || '',
      category || 'Drop',
      prompt_instructions,
      style_tags || '',
      target_duration || 30,
      is_default ? 1 : 0
    );

    const saved = db.prepare("SELECT * FROM ai_prompt_presets WHERE id = ?").get(presetId);
    logAction(req, 'SAVE', 'ai_prompt_preset', presetId);
    res.json({ success: true, preset: saved });
  } catch (err: any) {
    console.error("[AI Studio] Error saving preset:", err);
    res.status(500).json({ error: "Failed to save prompt preset" });
  }
});

aiStudioRouter.delete("/presets/:id", (req: any, res: Response) => {
  try {
    db.prepare("DELETE FROM ai_prompt_presets WHERE id = ? AND is_default = 0").run(req.params.id);
    logAction(req, 'DELETE', 'ai_prompt_preset', req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("[AI Studio] Error deleting preset:", err);
    res.status(500).json({ error: "Failed to delete preset" });
  }
});

// ----------------------------------------------------
// 5. SETTINGS
// ----------------------------------------------------
aiStudioRouter.get("/settings", (req: Request, res: Response) => {
  try {
    const settings = getAIStudioSettingsFromDb();
    res.json(settings);
  } catch (err: any) {
    console.error("[AI Studio] Error fetching settings:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

aiStudioRouter.post("/settings", (req: any, res: Response) => {
  try {
    const {
      ai_studio_enabled,
      ai_gemini_model,
      ai_default_reel_duration,
      ai_brand_handle,
      ai_brand_hashtag,
      ai_auto_process_on_show_end,
      ai_stream_recording_mode,
      ai_full_stream_capture_mins,
      ai_auto_delete_reels_enabled,
      ai_auto_delete_reels_hours,
      ai_auto_delete_unapproved_only,
      ai_system_prompt,
      ai_custom_gemini_api_key
    } = req.body;

    const upsertStmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    if (ai_studio_enabled !== undefined) {
      const enabledVal = ai_studio_enabled ? '1' : '0';
      upsertStmt.run('ai_studio_enabled', enabledVal);
      upsertStmt.run('feat_ai_studio', enabledVal);
    }
    if (ai_gemini_model !== undefined) upsertStmt.run('ai_gemini_model', String(ai_gemini_model));
    if (ai_default_reel_duration !== undefined) upsertStmt.run('ai_default_reel_duration', String(ai_default_reel_duration));
    if (ai_brand_handle !== undefined) upsertStmt.run('ai_brand_handle', String(ai_brand_handle));
    if (ai_brand_hashtag !== undefined) upsertStmt.run('ai_brand_hashtag', String(ai_brand_hashtag));
    if (ai_auto_process_on_show_end !== undefined) upsertStmt.run('ai_auto_process_on_show_end', ai_auto_process_on_show_end ? '1' : '0');
    if (ai_stream_recording_mode !== undefined) upsertStmt.run('ai_stream_recording_mode', String(ai_stream_recording_mode));
    if (ai_full_stream_capture_mins !== undefined) upsertStmt.run('ai_full_stream_capture_mins', String(ai_full_stream_capture_mins));
    if (ai_auto_delete_reels_enabled !== undefined) upsertStmt.run('ai_auto_delete_reels_enabled', ai_auto_delete_reels_enabled ? '1' : '0');
    if (ai_auto_delete_reels_hours !== undefined) upsertStmt.run('ai_auto_delete_reels_hours', String(ai_auto_delete_reels_hours));
    if (ai_auto_delete_unapproved_only !== undefined) upsertStmt.run('ai_auto_delete_unapproved_only', ai_auto_delete_unapproved_only ? '1' : '0');
    if (ai_system_prompt !== undefined) upsertStmt.run('ai_system_prompt', String(ai_system_prompt));
    if (ai_custom_gemini_api_key !== undefined) upsertStmt.run('ai_custom_gemini_api_key', String(ai_custom_gemini_api_key).trim());

    logAction(req, 'UPDATE', 'ai_studio_settings');
    const updated = getAIStudioSettingsFromDb();
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error("[AI Studio] Error updating settings:", err);
    res.status(500).json({ error: "Failed to update AI Studio settings" });
  }
});

aiStudioRouter.post("/check-schedule-now", async (req: Request, res: Response) => {
  try {
    const result = await checkAndTriggerCompletedShowReels({ force: true });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[AI Studio] Error checking schedule now:", err);
    res.status(500).json({ error: "Failed to execute schedule check" });
  }
});

aiStudioRouter.get("/on-air-status", (req: Request, res: Response) => {
  try {
    const status = getLiveOnAirShowStatus();
    res.json(status);
  } catch (err: any) {
    console.error("[AI Studio] Error getting on-air status:", err);
    res.status(500).json({ error: "Failed to fetch on-air show status" });
  }
});

// ----------------------------------------------------
// 6. SOURCE UPLOAD
// ----------------------------------------------------
aiStudioRouter.post("/upload-source", uploadSource.single("file"), (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio/video file uploaded" });
    }
    const relativeUrl = `/uploads/ai-studio/${req.file.filename}`;
    res.json({
      success: true,
      url: relativeUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err: any) {
    console.error("[AI Studio] Upload error:", err);
    res.status(500).json({ error: "File upload failed" });
  }
});

// ----------------------------------------------------
// 7. AI STUDIO PROFESSIONAL AUDIT LOGS
// ----------------------------------------------------
aiStudioRouter.get("/audit-logs", (req: Request, res: Response) => {
  try {
    const { action, category, search, timeframe, page = "1", limit = "25" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(5, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    let baseFilter = "WHERE (resource LIKE 'ai_%' OR resource LIKE 'ai-%' OR resource = 'ai_studio' OR resource = 'ai_studio_settings' OR action LIKE 'AI_%') AND role != 'owner' AND LOWER(username) != 'owner'";
    const params: any[] = [];

    // Timeframe filter
    if (timeframe === "24h") {
      baseFilter += " AND timestamp >= DATETIME('now', '-24 hours')";
    } else if (timeframe === "7d") {
      baseFilter += " AND timestamp >= DATETIME('now', '-7 days')";
    } else if (timeframe === "30d") {
      baseFilter += " AND timestamp >= DATETIME('now', '-30 days')";
    }

    // Action filter
    if (action && action !== "ALL") {
      baseFilter += " AND action = ?";
      params.push(action);
    }

    // Category filter
    if (category && category !== "ALL") {
      if (category === "jobs") {
        baseFilter += " AND resource = 'ai_job'";
      } else if (category === "editorial") {
        baseFilter += " AND resource = 'ai_reel' AND action IN ('APPROVE', 'REJECT', 'BATCH_APPROVE', 'BATCH_DELETE', 'UPDATE')";
      } else if (category === "media") {
        baseFilter += " AND action IN ('TRIM', 'RE_RENDER', 'BATCH_DOWNLOAD', 'DOWNLOAD')";
      } else if (category === "maintenance") {
        baseFilter += " AND action IN ('CLEANUP_DISK', 'CLEANUP_EXPIRED_REELS', 'PURGE')";
      } else if (category === "config") {
        baseFilter += " AND resource IN ('ai_studio_settings', 'ai_prompt_preset')";
      }
    }

    // Search filter
    if (search && typeof search === "string" && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      baseFilter += " AND (username LIKE ? OR action LIKE ? OR resource LIKE ? OR resource_id LIKE ? OR details LIKE ?)";
      params.push(term, term, term, term, term);
    }

    // Get Total Count
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${baseFilter}`).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    // Get Paginated Logs
    const logs = db.prepare(`
      SELECT * FROM audit_logs 
      ${baseFilter} 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    // Compute Global AI Audit Statistics
    const aiBaseFilter = "WHERE (resource LIKE 'ai_%' OR resource LIKE 'ai-%' OR resource = 'ai_studio' OR resource = 'ai_studio_settings' OR action LIKE 'AI_%') AND role != 'owner' AND LOWER(username) != 'owner'";
    const totalAIEvents = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${aiBaseFilter}`).get() as { count: number };
    const jobOperations = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE resource = 'ai_job' AND role != 'owner' AND LOWER(username) != 'owner'`).get() as { count: number };
    const reelReviews = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE resource = 'ai_reel' AND action IN ('APPROVE', 'REJECT', 'BATCH_APPROVE', 'BATCH_DELETE', 'UPDATE') AND role != 'owner' AND LOWER(username) != 'owner'`).get() as { count: number };
    const mediaEngineering = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE action IN ('TRIM', 'RE_RENDER', 'BATCH_DOWNLOAD', 'DOWNLOAD') AND role != 'owner' AND LOWER(username) != 'owner'`).get() as { count: number };
    const maintenanceActions = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE action IN ('CLEANUP_DISK', 'CLEANUP_EXPIRED_REELS', 'PURGE') AND role != 'owner' AND LOWER(username) != 'owner'`).get() as { count: number };
    const configUpdates = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE resource IN ('ai_studio_settings', 'ai_prompt_preset') AND role != 'owner' AND LOWER(username) != 'owner'`).get() as { count: number };

    res.json({
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      stats: {
        totalAIEvents: totalAIEvents?.count || 0,
        jobOperations: jobOperations?.count || 0,
        reelReviews: reelReviews?.count || 0,
        mediaEngineering: mediaEngineering?.count || 0,
        maintenanceActions: maintenanceActions?.count || 0,
        configUpdates: configUpdates?.count || 0
      }
    });
  } catch (err: any) {
    console.error("[AI Studio] Error fetching audit logs:", err);
    res.status(500).json({ error: "Failed to fetch AI Studio audit logs" });
  }
});

aiStudioRouter.delete("/audit-logs", (req: any, res: Response) => {
  try {
    const result = db.prepare(`
      DELETE FROM audit_logs 
      WHERE (resource LIKE 'ai_%' OR resource LIKE 'ai-%' OR resource = 'ai_studio' OR resource = 'ai_studio_settings' OR action LIKE 'AI_%')
    `).run();

    logAction(req, 'PURGE', 'ai_studio_audit_logs', null, { deletedRecords: result.changes });

    res.json({
      success: true,
      message: `Cleared ${result.changes} AI Studio audit log records.`,
      deletedCount: result.changes
    });
  } catch (err: any) {
    console.error("[AI Studio] Error purging audit logs:", err);
    res.status(500).json({ error: "Failed to clear AI Studio audit logs" });
  }
});
