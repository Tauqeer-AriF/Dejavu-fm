import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import { db, getUploadsDir } from "../db.ts";
import { logAction } from "../api.ts";
import { AIJob, AIReel, SourceType } from "./types.ts";
import { analyzeShowWithGemini, getAIStudioSettingsFromDb } from "./gemini.service.ts";
import {
  getAIStudioStorageDir,
  captureStreamSnippet,
  getMediaDuration,
  analyzeAudioWaveformAndPeaks,
  sliceAudioChunk,
  renderVerticalSocialReel,
  pruneAIStudioDiskAssets,
  VisualizerTheme,
  AspectRatioOption
} from "./ffmpeg.service.ts";

let ioInstance: SocketIOServer | null = null;
const MAX_CONCURRENT_JOBS = 2;
let activeRunningJobCount = 0;
const waitingJobQueue: string[] = [];
const activeJobAbortControllers = new Map<string, AbortController>();

export function setSocketIOInstance(io: SocketIOServer) {
  ioInstance = io;
}

function emitJobUpdate(event: string, payload: any) {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
}

export interface CreateJobInput {
  show_name: string;
  dj_name: string;
  dj_id?: string;
  source_type: SourceType;
  source_url?: string;
  custom_prompt?: string;
  preset_id?: string;
  template?: VisualizerTheme;
  aspect_ratio?: AspectRatioOption;
  target_reels_count?: number;
  duration_seconds?: number;
  talk_focus?: boolean;
  created_by: string;
}

export async function createAndStartAIJob(input: CreateJobInput): Promise<AIJob> {
  const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const config = {
    custom_prompt: input.custom_prompt || '',
    preset_id: input.preset_id || '',
    template: input.template || 'neon_cyber',
    aspect_ratio: input.aspect_ratio || '9:16',
    target_reels_count: input.target_reels_count || 3,
    duration_seconds: input.duration_seconds || 60,
    talk_focus: Boolean(input.talk_focus),
  };

  const stmt = db.prepare(`
    INSERT INTO ai_jobs (id, show_name, dj_name, dj_id, source_type, source_url, status, progress, stage_message, config_json, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 0, 'Job queued for background processing...', ?, ?)
  `);

  stmt.run(
    jobId,
    input.show_name,
    input.dj_name,
    input.dj_id || null,
    input.source_type,
    input.source_url || null,
    JSON.stringify(config),
    input.created_by
  );

  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
  emitJobUpdate('ai_job_created', job);

  // Enqueue job for background processing with concurrency control
  enqueueJobForProcessing(jobId);

  return job;
}

function enqueueJobForProcessing(jobId: string) {
  if (!waitingJobQueue.includes(jobId)) {
    waitingJobQueue.push(jobId);
  }
  processNextInQueue();
}

function processNextInQueue() {
  if (activeRunningJobCount >= MAX_CONCURRENT_JOBS || waitingJobQueue.length === 0) {
    return;
  }

  const nextJobId = waitingJobQueue.shift();
  if (!nextJobId) return;

  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(nextJobId) as AIJob | undefined;
  if (!job || job.status === 'CANCELLED') {
    // Skip cancelled or deleted jobs
    setImmediate(processNextInQueue);
    return;
  }

  activeRunningJobCount++;
  setImmediate(() => {
    runJobPipeline(nextJobId)
      .catch((err) => {
        console.error(`[AI Job Queue] Job ${nextJobId} failed:`, err);
      })
      .finally(() => {
        activeRunningJobCount = Math.max(0, activeRunningJobCount - 1);
        processNextInQueue();
      });
  });
}

function updateJobProgress(jobId: string, status: string, progress: number, stageMessage: string, error?: string) {
  try {
    const completedAt = (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') ? new Date().toISOString() : null;
    db.prepare(`
      UPDATE ai_jobs 
      SET status = ?, progress = ?, stage_message = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, progress, stageMessage, error || null, completedAt, jobId);

    const updatedJob = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
    emitJobUpdate('ai_job_progress', updatedJob);
  } catch (e) {
    console.error(`[AI Job Queue] Failed to update progress for ${jobId}:`, e);
  }
}

async function runJobPipeline(jobId: string) {
  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
  if (!job || job.status === 'CANCELLED') return;

  const storageDir = getAIStudioStorageDir();
  const settings = getAIStudioSettingsFromDb();
  let config: any = {};
  try {
    config = JSON.parse(job.config_json || '{}');
  } catch (e) {}

  const abortController = new AbortController();
  activeJobAbortControllers.set(jobId, abortController);
  const signal = abortController.signal;

  const checkAborted = () => {
    if (signal.aborted) {
      throw new Error('JOB_ABORTED');
    }
    const currentJob = db.prepare('SELECT status FROM ai_jobs WHERE id = ?').get(jobId) as any;
    if (!currentJob || currentJob.status === 'CANCELLED') {
      throw new Error('JOB_ABORTED');
    }
  };

  try {
    checkAborted();

    // ----------------------------------------------------
    // STAGE 1: AUDIO CAPTURE / RESOLUTION (10% - 30%)
    // ----------------------------------------------------
    updateJobProgress(jobId, 'CAPTURING', 15, 'Capturing & preparing show audio source...');

    let sourceAudioPath = '';
    const isLiveSource = job.source_type === 'live_stream' || job.source_type === 'stream_url' || job.source_type === 'schedule_slot';
    const recordingMode = settings.ai_stream_recording_mode || 'full_show';
    const maxStreamMins = settings.ai_full_stream_capture_mins || 60;

    let captureDuration = 120;
    if (isLiveSource) {
      if (recordingMode === 'snippet') {
        captureDuration = Math.min(180, Math.max(45, config.duration_seconds || 120));
      } else {
        // Full broadcast stream recording mode (e.g. up to 60-120 mins)
        const showSecs = config.duration_seconds && config.duration_seconds > 0 ? config.duration_seconds : (maxStreamMins * 60);
        captureDuration = Math.min(maxStreamMins * 60, Math.max(120, showSecs));
      }
    } else {
      captureDuration = config.duration_seconds || 90;
    }

    const formatSecsDisplay = (totalSecs: number) => {
      const m = Math.floor(totalSecs / 60);
      const s = Math.floor(totalSecs % 60);
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const onCaptureProgress = (elapsedSecs: number) => {
      if (signal.aborted) return;
      const progressVal = 15 + Math.min(15, Math.round((elapsedSecs / captureDuration) * 15));
      const modeLabel = recordingMode === 'full_show' ? 'Full Broadcast' : 'Snippet';
      updateJobProgress(
        jobId,
        'CAPTURING',
        progressVal,
        `Recording ${modeLabel} live stream [${formatSecsDisplay(elapsedSecs)} / ${formatSecsDisplay(captureDuration)}]...`
      );
    };

    if (job.source_type === 'live_stream' || job.source_type === 'stream_url' || job.source_type === 'schedule_slot') {
      let streamUrl = (job.source_url && job.source_url.startsWith('http')) ? job.source_url : settings.stream_url;
      if (!streamUrl || streamUrl.includes('somafm')) {
        streamUrl = 'https://dejavufm.radioca.st/;';
      }
      console.log(`[AI Studio Queue] Job #${jobId}: Recording live radio broadcast stream from ${streamUrl} (${formatSecsDisplay(captureDuration)}, mode: ${recordingMode})...`);
      const targetFile = path.join(storageDir, `${jobId}_source.mp3`);
      updateJobProgress(jobId, 'CAPTURING', 15, `Recording live stream (${formatSecsDisplay(captureDuration)})...`);
      await captureStreamSnippet(streamUrl, captureDuration, targetFile, onCaptureProgress, signal);
      sourceAudioPath = targetFile;
    } else if (job.source_type === 'upload' && job.source_url) {
      // Local uploaded file
      const relativeUpload = job.source_url.replace(/^\/+uploads\//, '');
      const fullPath = path.join(getUploadsDir(), relativeUpload);
      if (fs.existsSync(fullPath)) {
        sourceAudioPath = fullPath;
        updateJobProgress(jobId, 'CAPTURING', 30, 'Loaded uploaded DJ set audio file.');
      } else {
        throw new Error(`Uploaded media file not found at ${fullPath}`);
      }
    } else if (job.source_type === 'podcast' && job.source_url) {
      const targetFile = path.join(storageDir, `${jobId}_source.mp3`);
      updateJobProgress(jobId, 'CAPTURING', 15, `Fetching podcast episode audio...`);
      await captureStreamSnippet(job.source_url, captureDuration, targetFile, onCaptureProgress, signal);
      sourceAudioPath = targetFile;
    } else {
      // Default: capture from station live radio stream
      let streamUrl = settings.stream_url;
      if (!streamUrl || streamUrl.includes('somafm')) {
        streamUrl = 'https://dejavufm.radioca.st/;';
      }
      console.log(`[AI Studio Queue] Job #${jobId}: Capturing live radio broadcast stream from ${streamUrl}`);
      const targetFile = path.join(storageDir, `${jobId}_source.mp3`);
      await captureStreamSnippet(streamUrl, captureDuration, targetFile, onCaptureProgress, signal);
      sourceAudioPath = targetFile;
    }

    checkAborted();

    if (!fs.existsSync(sourceAudioPath)) {
      throw new Error('Failed to acquire valid audio source for processing.');
    }

    // ----------------------------------------------------
    // STAGE 2: AUDIO METRICS & GEMINI AI ANALYSIS (30% - 60%)
    // ----------------------------------------------------
    updateJobProgress(jobId, 'ANALYZING', 35, 'Analyzing acoustic dynamics, loudness peaks and transitions...');
    const totalDuration = await getMediaDuration(sourceAudioPath);
    checkAborted();
    
    const { waveformData, peaks } = await analyzeAudioWaveformAndPeaks(sourceAudioPath, totalDuration);
    checkAborted();

    updateJobProgress(jobId, 'ANALYZING', 50, `Gemini AI discovering peak moments, drops & viral hooks...`);
    const targetCount = config.target_reels_count || 3;
    const highlights = await analyzeShowWithGemini({
      showName: job.show_name,
      djName: job.dj_name,
      totalDurationSeconds: totalDuration,
      targetReelsCount: targetCount,
      customPrompt: config.custom_prompt,
      loudnessPeaks: peaks
    });
    checkAborted();

    // ----------------------------------------------------
    // STAGE 3: VIDEO RENDERING & SOCIAL PACKAGING (60% - 95%)
    // ----------------------------------------------------
    updateJobProgress(jobId, 'GENERATING', 65, `Rendering ${highlights.length} vertical 9:16 social reels...`);

    // Lookup DJ photo for branding
    let djPhotoUrl: string | null = null;
    try {
      if (job.dj_id) {
        const dj = db.prepare('SELECT image_url FROM djs WHERE id = ?').get(job.dj_id) as any;
        if (dj?.image_url) djPhotoUrl = dj.image_url;
      }
      if (!djPhotoUrl) {
        const djByName = db.prepare('SELECT image_url FROM djs WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))').get(job.dj_name) as any;
        if (djByName?.image_url) djPhotoUrl = djByName.image_url;
      }
    } catch (e) {}

    const insertReelStmt = db.prepare(`
      INSERT INTO ai_reels (
        id, job_id, title, hook, summary, virality_score, category,
        start_seconds, end_seconds, duration_seconds, audio_url, video_url,
        thumbnail_url, waveform_data, captions_json, social_copy, hashtags, status, aspect_ratio, template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)
    `);

    const selectedTemplate: VisualizerTheme = config.template || 'neon_cyber';
    const selectedAspect: AspectRatioOption = config.aspect_ratio || '9:16';

    for (let i = 0; i < highlights.length; i++) {
      checkAborted();
      const h = highlights[i];
      const reelId = `reel_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;
      const clipDuration = Math.max(5, h.end_seconds - h.start_seconds);

      const progressVal = 65 + Math.round(((i + 1) / highlights.length) * 28);
      updateJobProgress(jobId, 'GENERATING', progressVal, `Rendering Reel #${i + 1}: "${h.title}" (${selectedTemplate})...`);

      // 1. Sliced audio chunk
      const audioFilename = `${reelId}_audio.mp3`;
      const audioFullPath = path.join(storageDir, audioFilename);
      await sliceAudioChunk(sourceAudioPath, h.start_seconds, clipDuration, audioFullPath, signal);
      checkAborted();
      const audioRelativeUrl = `/uploads/ai-studio/${audioFilename}`;

      // 2. Rendered Video MP4
      const videoFilename = `${reelId}_reel.mp4`;
      const videoFullPath = path.join(storageDir, videoFilename);
      const thumbFilename = `${reelId}_thumb.jpg`;
      const thumbFullPath = path.join(storageDir, thumbFilename);

      const captionPreview = h.captions && h.captions.length > 0 ? h.captions[0].text : 'DejavuFM Underground Radio';

      await renderVerticalSocialReel({
        audioPath: audioFullPath,
        djName: job.dj_name,
        showName: job.show_name,
        djPhotoUrl,
        hookText: h.hook,
        captionText: captionPreview,
        durationSeconds: clipDuration,
        template: selectedTemplate,
        aspectRatio: selectedAspect,
        outputVideoPath: videoFullPath,
        outputThumbnailPath: thumbFullPath,
        abortSignal: signal
      });
      checkAborted();

      const videoRelativeUrl = `/uploads/ai-studio/${videoFilename}`;
      const thumbRelativeUrl = `/uploads/ai-studio/${thumbFilename}`;

      // 3. Mini waveform for this clip
      const clipWaveform = waveformData.slice(
        Math.floor((h.start_seconds / totalDuration) * waveformData.length),
        Math.ceil((h.end_seconds / totalDuration) * waveformData.length)
      );

      insertReelStmt.run(
        reelId,
        jobId,
        h.title,
        h.hook,
        h.summary,
        h.virality_score,
        h.category,
        h.start_seconds,
        h.end_seconds,
        clipDuration,
        audioRelativeUrl,
        videoRelativeUrl,
        thumbRelativeUrl,
        JSON.stringify(clipWaveform.length > 0 ? clipWaveform : [0.3, 0.6, 0.8, 0.9, 0.7, 0.4]),
        JSON.stringify(h.captions),
        h.social_copy,
        h.hashtags,
        selectedAspect,
        selectedTemplate
      );
    }

    checkAborted();

    // Run background disk prune of old intermediate captures
    try {
      pruneAIStudioDiskAssets(48);
    } catch {}

    // ----------------------------------------------------
    // STAGE 4: FINALIZE (100%)
    // ----------------------------------------------------
    updateJobProgress(jobId, 'COMPLETED', 100, `Successfully generated ${highlights.length} social reels ready for review!`);
    const completedJob = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
    emitJobUpdate('ai_job_completed', completedJob);

    // Record system audit log
    logAction(
      { user: { username: completedJob?.created_by || 'System AI', role: 'ai_pipeline' } },
      'JOB_COMPLETED',
      'ai_job',
      jobId,
      {
        show_name: completedJob?.show_name,
        dj_name: completedJob?.dj_name,
        reels_generated: highlights.length,
        template: selectedTemplate,
        aspect_ratio: selectedAspect
      }
    );
  } catch (err: any) {
    if (err.message === 'JOB_ABORTED' || signal.aborted) {
      console.log(`[AI Job Queue] Job #${jobId} gracefully stopped due to cancellation.`);
      return;
    }

    console.error(`[AI Job Queue] Pipeline error for job ${jobId}:`, err);
    updateJobProgress(jobId, 'FAILED', 0, `Processing failed: ${err.message}`, err.message);
    const failedJob = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
    emitJobUpdate('ai_job_failed', failedJob);

    // Record failure audit log
    logAction(
      { user: { username: failedJob?.created_by || 'System AI', role: 'ai_pipeline' } },
      'JOB_FAILED',
      'ai_job',
      jobId,
      {
        show_name: failedJob?.show_name,
        dj_name: failedJob?.dj_name,
        error: err.message
      }
    );
  } finally {
    activeJobAbortControllers.delete(jobId);
  }
}

export function cancelAIJob(jobId: string) {
  // Abort running processes immediately
  const controller = activeJobAbortControllers.get(jobId);
  if (controller) {
    try {
      controller.abort();
    } catch (e) {}
    activeJobAbortControllers.delete(jobId);
  }

  // Remove from waiting queue if not yet started
  const queueIdx = waitingJobQueue.indexOf(jobId);
  if (queueIdx !== -1) {
    waitingJobQueue.splice(queueIdx, 1);
  }

  db.prepare(`
    UPDATE ai_jobs 
    SET status = 'CANCELLED', stage_message = 'Job cancelled by administrator.', updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN ('QUEUED', 'CAPTURING', 'ANALYZING', 'GENERATING')
  `).run(jobId);

  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as any;
  if (job) {
    // Record suppression in db to permanently prevent auto-schedule listener from re-triggering this show slot today
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const cacheKey = `${job.show_name}:${todayDate}`;
      db.prepare(`
        INSERT OR REPLACE INTO ai_cancelled_shows (cache_key, show_name, date_str, cancelled_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(cacheKey, job.show_name, todayDate);
    } catch (e) {}

    emitJobUpdate('ai_job_cancelled', job);
  }
  return job;
}

export function deleteAIJob(jobId: string) {
  // Abort if currently executing
  const controller = activeJobAbortControllers.get(jobId);
  if (controller) {
    try {
      controller.abort();
    } catch (e) {}
    activeJobAbortControllers.delete(jobId);
  }

  // Remove from waiting queue
  const queueIdx = waitingJobQueue.indexOf(jobId);
  if (queueIdx !== -1) {
    waitingJobQueue.splice(queueIdx, 1);
  }

  // Record suppression before deletion
  const job = db.prepare('SELECT show_name, created_at FROM ai_jobs WHERE id = ?').get(jobId) as any;
  if (job) {
    try {
      const dateStr = (job.created_at || new Date().toISOString()).split('T')[0].split(' ')[0];
      const cacheKey = `${job.show_name}:${dateStr}`;
      db.prepare(`
        INSERT OR REPLACE INTO ai_cancelled_shows (cache_key, show_name, date_str, cancelled_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(cacheKey, job.show_name, dateStr);
    } catch (e) {}
  }

  // Fetch reels to clean media files
  const reels = db.prepare('SELECT audio_url, video_url, thumbnail_url FROM ai_reels WHERE job_id = ?').all(jobId) as any[];
  const uploadsDir = getUploadsDir();

  reels.forEach(r => {
    ['audio_url', 'video_url', 'thumbnail_url'].forEach(k => {
      const u = r[k];
      if (u && typeof u === 'string') {
        const filename = u.replace(/^\/+uploads\//, '');
        const filePath = path.join(uploadsDir, filename);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }
    });
  });

  // Source audio file
  const storageDir = getAIStudioStorageDir();
  const sourceFile = path.join(storageDir, `${jobId}_source.mp3`);
  try {
    if (fs.existsSync(sourceFile)) fs.unlinkSync(sourceFile);
  } catch (e) {}

  db.prepare('DELETE FROM ai_reels WHERE job_id = ?').run(jobId);
  db.prepare('DELETE FROM ai_jobs WHERE id = ?').run(jobId);
  emitJobUpdate('ai_job_deleted', { jobId });
  return true;
}

export function retryAIJob(jobId: string): AIJob {
  const job = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob | undefined;
  if (!job) {
    throw new Error('Job not found');
  }

  // Delete any partial or existing reels generated for this job ID to start fresh
  const reels = db.prepare('SELECT audio_url, video_url, thumbnail_url FROM ai_reels WHERE job_id = ?').all(jobId) as any[];
  const uploadsDir = getUploadsDir();
  reels.forEach(r => {
    ['audio_url', 'video_url', 'thumbnail_url'].forEach(k => {
      const u = r[k];
      if (u && typeof u === 'string') {
        const filename = u.replace(/^\/+uploads\//, '');
        const filePath = path.join(uploadsDir, filename);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }
    });
  });
  db.prepare('DELETE FROM ai_reels WHERE job_id = ?').run(jobId);

  // Update job back to QUEUED
  db.prepare(`
    UPDATE ai_jobs 
    SET status = 'QUEUED', progress = 0, stage_message = 'Job re-queued for background processing...', error_message = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(jobId);

  const updatedJob = db.prepare('SELECT * FROM ai_jobs WHERE id = ?').get(jobId) as AIJob;
  emitJobUpdate('ai_job_progress', updatedJob);

  // Re-enqueue the job
  enqueueJobForProcessing(jobId);

  return updatedJob;
}

export function deleteSingleReel(reelId: string) {
  const reel = db.prepare('SELECT audio_url, video_url, thumbnail_url FROM ai_reels WHERE id = ?').get(reelId) as any;
  if (reel) {
    const uploadsDir = getUploadsDir();
    ['audio_url', 'video_url', 'thumbnail_url'].forEach(k => {
      const u = reel[k];
      if (u && typeof u === 'string') {
        const filename = u.replace(/^\/+uploads\//, '');
        const filePath = path.join(uploadsDir, filename);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {}
      }
    });
    db.prepare('DELETE FROM ai_reels WHERE id = ?').run(reelId);
    emitJobUpdate('ai_reel_deleted', { reelId });
    return true;
  }
  return false;
}

/**
 * Automatically prunes reels older than a specified custom time (in hours).
 * Can be filtered to prune only unapproved/rejected reels, or all expired reels.
 */
export function autoDeleteExpiredReels(maxAgeHours: number, unapprovedOnly: boolean = false): { deletedCount: number; freedMB: string } {
  if (!maxAgeHours || maxAgeHours <= 0) {
    return { deletedCount: 0, freedMB: '0.00' };
  }

  let sql = `
    SELECT id, audio_url, video_url, thumbnail_url, status, created_at 
    FROM ai_reels 
    WHERE created_at <= DATETIME('now', '-' || ? || ' hours')
  `;
  if (unapprovedOnly) {
    sql += ` AND status IN ('PENDING_REVIEW', 'REJECTED')`;
  }

  const expiredReels = db.prepare(sql).all(maxAgeHours) as any[];
  if (!expiredReels || expiredReels.length === 0) {
    return { deletedCount: 0, freedMB: '0.00' };
  }

  let freedBytes = 0;
  const uploadsDir = getUploadsDir();

  expiredReels.forEach(reel => {
    ['audio_url', 'video_url', 'thumbnail_url'].forEach(k => {
      const u = reel[k];
      if (u && typeof u === 'string') {
        const filename = u.replace(/^\/+uploads\//, '');
        const filePath = path.join(uploadsDir, filename);
        try {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }
    });
    db.prepare('DELETE FROM ai_reels WHERE id = ?').run(reel.id);
    emitJobUpdate('ai_reel_deleted', { reelId: reel.id });
  });

  const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
  console.log(`[AI Studio] 🗑️ Auto-deleted ${expiredReels.length} reels older than ${maxAgeHours}h (freed ${freedMB} MB)`);

  return {
    deletedCount: expiredReels.length,
    freedMB
  };
}
