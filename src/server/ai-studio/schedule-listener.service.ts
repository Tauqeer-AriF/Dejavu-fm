import { db } from "../db.ts";
import { logAction } from "../api.ts";
import { getAIStudioSettingsFromDb } from "./gemini.service.ts";
import { createAndStartAIJob, autoDeleteExpiredReels } from "./job-queue.service.ts";
import { pruneAIStudioDiskAssets } from "./ffmpeg.service.ts";

let intervalHandle: NodeJS.Timeout | null = null;
let pruneIntervalHandle: NodeJS.Timeout | null = null;
let isChecking = false;

/**
 * Get current date and time in London timezone (Europe/London)
 */
export function getLondonTimeComponents() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  const londonDateObj = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const dayOfWeek = londonDateObj.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  return {
    dateStr: `${year}-${month}-${day}`, // YYYY-MM-DD
    timeStr: `${hour}:${minute}`,       // HH:MM
    minutesToday: parseInt(hour, 10) * 60 + parseInt(minute, 10),
    dayOfWeek
  };
}

/**
 * Get current on-air show status and monitoring details
 */
export function getLiveOnAirShowStatus() {
  try {
    const settings = getAIStudioSettingsFromDb();
    const autoProcessEnabled = Boolean(settings.ai_studio_enabled && settings.ai_auto_process_on_show_end);
    const { dateStr, timeStr, minutesToday, dayOfWeek } = getLondonTimeComponents();
    const slots = db.prepare(`
      SELECT * FROM schedule WHERE day_of_week = ? ORDER BY start_time ASC
    `).all(dayOfWeek) as any[];

    if (!slots || slots.length === 0) return { isOnAir: false, autoProcessEnabled, aiStudioEnabled: settings.ai_studio_enabled };

    const djs = db.prepare('SELECT id, name FROM djs').all() as any[];
    const djMap = new Map<string, string>(djs.map(d => [String(d.id), d.name]));

    for (const slot of slots) {
      if (!slot.start_time || !slot.end_time) continue;
      const [sh, sm] = slot.start_time.split(":").map(Number);
      const [eh, em] = slot.end_time.split(":").map(Number);

      let startMins = (sh || 0) * 60 + (sm || 0);
      let endMins = (eh || 0) * 60 + (em || 0);
      let isOvernight = false;
      if (endMins <= startMins) {
        endMins += 24 * 60;
        isOvernight = true;
      }

      let effMins = minutesToday;
      if (isOvernight && minutesToday < startMins) {
        effMins += 24 * 60;
      }

      if (effMins >= startMins && effMins < endMins) {
        const elapsedMins = effMins - startMins;
        const totalMins = endMins - startMins;
        const progressPercent = Math.min(100, Math.max(1, Math.round((elapsedMins / totalMins) * 100)));
        const djName = djMap.get(String(slot.dj_id)) || "Resident DJ";

        const existingJob = db.prepare(`
          SELECT id, status, progress, stage_message, created_at FROM ai_jobs 
          WHERE show_name = ? AND DATE(created_at) = DATE(?)
          ORDER BY created_at DESC LIMIT 1
        `).get(slot.show_name, dateStr) as any;

        return {
          isOnAir: true,
          autoProcessEnabled,
          aiStudioEnabled: settings.ai_studio_enabled,
          slot,
          showName: slot.show_name,
          djName,
          startTime: slot.start_time,
          endTime: slot.end_time,
          elapsedMins,
          totalMins,
          remainingMins: Math.max(0, totalMins - elapsedMins),
          progressPercent,
          existingJob
        };
      }
    }
  } catch (e) {
    console.warn("[AI Schedule Listener] Error reading on-air status:", e);
  }

  const settings = getAIStudioSettingsFromDb();
  return { isOnAir: false, autoProcessEnabled: Boolean(settings.ai_studio_enabled && settings.ai_auto_process_on_show_end), aiStudioEnabled: settings.ai_studio_enabled };
}

// In-memory registry of automatically triggered show slots per day to prevent re-triggering loops if a job is deleted
const triggeredShowsToday = new Set<string>();

/**
 * Check schedule slots and trigger automated reel creation ONLY for concluded shows
 */
export async function checkAndTriggerCompletedShowReels(options?: { force?: boolean }): Promise<{ triggeredCount: number; messages: string[]; onAirInfo?: any }> {
  if (isChecking) return { triggeredCount: 0, messages: ["Check already in progress"] };
  isChecking = true;

  const messages: string[] = [];
  let triggeredCount = 0;

  try {
    const settings = getAIStudioSettingsFromDb();

    if (!settings.ai_studio_enabled) {
      isChecking = false;
      return { triggeredCount: 0, messages: ["AI Studio is disabled in settings"] };
    }

    if (!options?.force && !settings.ai_auto_process_on_show_end) {
      isChecking = false;
      return { triggeredCount: 0, messages: ["Auto-processing on show end is disabled in settings (Turn on 'Auto-Process Completed DJ Shows' in Settings to auto-trigger reels)"] };
    }

    const { dateStr, timeStr, minutesToday, dayOfWeek } = getLondonTimeComponents();

    // Get all schedule slots for today
    const slots = db.prepare(`
      SELECT * FROM schedule WHERE day_of_week = ? ORDER BY start_time ASC
    `).all(dayOfWeek) as any[];

    if (!slots || slots.length === 0) {
      isChecking = false;
      return { triggeredCount: 0, messages: [`No scheduled shows found for day of week ${dayOfWeek}`] };
    }

    const djs = db.prepare('SELECT id, name FROM djs').all() as any[];
    const djMap = new Map<string, string>(djs.map(d => [String(d.id), d.name]));

    for (const slot of slots) {
      try {
        if (!slot.start_time || !slot.end_time) continue;

        const [sh, sm] = slot.start_time.split(":").map(Number);
        const [eh, em] = slot.end_time.split(":").map(Number);

        let startMins = (sh || 0) * 60 + (sm || 0);
        let endMins = (eh || 0) * 60 + (em || 0);

        let isOvernight = false;
        if (endMins <= startMins) {
          endMins += 24 * 60; // Overnight show
          isOvernight = true;
        }

        const showDurationSecs = Math.max(1800, (endMins - startMins) * 60);

        let effectiveMinutesToday = minutesToday;
        if (isOvernight && minutesToday < startMins) {
          effectiveMinutesToday += 24 * 60;
        }

        // A show is ONLY concluded when current time has reached or passed end_time (up to 45 mins after end)
        const isConcluded = effectiveMinutesToday >= endMins && effectiveMinutesToday <= (endMins + 45);

        if (isConcluded) {
          const cacheKey = `${slot.show_name}:${dateStr}`;

          // Avoid re-triggering if the cache shows we've already processed this slot today
          if (triggeredShowsToday.has(cacheKey)) {
            continue;
          }

          // Check if an AI Job has already been created for this show today in the DB
          const existingJob = db.prepare(`
            SELECT id FROM ai_jobs 
            WHERE show_name = ? 
              AND DATE(created_at) = DATE(?)
            LIMIT 1
          `).get(slot.show_name, dateStr) as any;

          if (existingJob) {
            // Register in the in-memory cache to save future DB check lookups
            triggeredShowsToday.add(cacheKey);
            continue;
          }

          const djName = djMap.get(String(slot.dj_id)) || "Resident DJ";

          console.log(`[AI Schedule Listener] 📻 Show concluded: "${slot.show_name}" (DJ: ${djName}). Triggering auto-reels generation...`);

          // Register in the cache before making the call to avoid any race-condition triggers
          triggeredShowsToday.add(cacheKey);

          const job = await createAndStartAIJob({
            show_name: slot.show_name,
            dj_name: djName,
            dj_id: slot.dj_id ? String(slot.dj_id) : undefined,
            source_type: "schedule_slot",
            target_reels_count: 4, // Generates 3-5 reels (default 4)
            duration_seconds: showDurationSecs,
            custom_prompt: `Automatically generated social reels for completed scheduled show "${slot.show_name}". Produce 3 to 5 viral highlight reels covering high energy drops, vocal shoutouts, and mic talkovers across the broadcast.`,
            created_by: "AUTO_SCHEDULE_LISTENER"
          });

            logAction(
              { user: { username: "Schedule AI Daemon", role: "ai_scheduler" } },
              'AUTO_TRIGGER',
              'ai_job',
              job.id,
              {
                show_name: slot.show_name,
                dj_name: djName,
                duration_mins: Math.round(showDurationSecs / 60),
                target_reels: 4
              }
            );

            triggeredCount++;
            const msg = `Triggered 4 auto-reels for show "${slot.show_name}" (DJ: ${djName}, duration: ${Math.round(showDurationSecs/60)} mins)`;
            messages.push(msg);
            console.log(`[AI Schedule Listener] ✅ ${msg}`);
        }
      } catch (err: any) {
        console.error(`[AI Schedule Listener] Error evaluating slot #${slot.id}:`, err);
      }
    }

    const onAirInfo = getLiveOnAirShowStatus();
    if (onAirInfo.isOnAir && triggeredCount === 0) {
      messages.push(`On Air Now: "${onAirInfo.showName}" by ${onAirInfo.djName} (${onAirInfo.elapsedMins}m / ${onAirInfo.totalMins}m elapsed). Auto-reels scheduled for ${onAirInfo.endTime}.`);
    } else if (triggeredCount === 0) {
      messages.push(`Schedule monitor active. Waiting for current show to conclude.`);
    }

    return { triggeredCount, messages, onAirInfo };
  } catch (err: any) {
    console.error("[AI Schedule Listener] Global ticker error:", err);
    messages.push(`Error: ${err.message}`);
    return { triggeredCount: 0, messages };
  } finally {
    isChecking = false;
  }
}

/**
 * Initialize background schedule listener worker (runs every 60 seconds)
 */
export function initScheduleListenerWorker() {
  if (intervalHandle) clearInterval(intervalHandle);
  if (pruneIntervalHandle) clearInterval(pruneIntervalHandle);

  console.log("[AI Schedule Listener] 🟢 Starting background schedule listener service (interval: 60s)...");

  // Initial check after server start delay (only if auto-process on show end is explicitly enabled)
  setTimeout(() => {
    const settings = getAIStudioSettingsFromDb();
    if (settings.ai_studio_enabled && settings.ai_auto_process_on_show_end) {
      checkAndTriggerCompletedShowReels().catch(err => {
        console.error("[AI Schedule Listener] Initial check failed:", err);
      });
    } else {
      console.log("[AI Schedule Listener] Auto-process on show end is OFF. Skipping initial background auto-trigger.");
    }
    // Run initial disk & reel prune check
    try {
      pruneAIStudioDiskAssets(48);
      if (settings.ai_auto_delete_reels_enabled) {
        autoDeleteExpiredReels(settings.ai_auto_delete_reels_hours, settings.ai_auto_delete_unapproved_only);
      }
    } catch {}
  }, 10000);

  // Run every 60 seconds
  intervalHandle = setInterval(() => {
    const settings = getAIStudioSettingsFromDb();
    if (settings.ai_auto_process_on_show_end) {
      checkAndTriggerCompletedShowReels().catch(err => {
        console.error("[AI Schedule Listener] Periodic check failed:", err);
      });
    }
  }, 60000);

  // Run periodic disk prune and auto reel cleanup every 4 hours
  pruneIntervalHandle = setInterval(() => {
    try {
      console.log("[AI Studio] Running scheduled disk & reel maintenance...");
      pruneAIStudioDiskAssets(48);
      const settings = getAIStudioSettingsFromDb();
      if (settings.ai_auto_delete_reels_enabled) {
        autoDeleteExpiredReels(settings.ai_auto_delete_reels_hours, settings.ai_auto_delete_unapproved_only);
      }
    } catch (e) {
      console.error("[AI Studio] Scheduled disk maintenance error:", e);
    }
  }, 4 * 60 * 60 * 1000);
}
