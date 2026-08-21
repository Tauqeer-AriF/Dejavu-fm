import { GoogleGenAI } from "@google/genai";
import { db } from "../db.ts";
import { DetectedHighlight, ReelCategory } from "./types.ts";

let lastUsedApiKey: string | null = null;
let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const settings = getAIStudioSettingsFromDb();
  const manualApiKey = settings.ai_custom_gemini_api_key?.trim();
  const apiKey = manualApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }

  if (!genAIClient || lastUsedApiKey !== apiKey) {
    lastUsedApiKey = apiKey;
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIClient;
}

function normalizeGeminiModel(modelName?: string): string {
  if (!modelName) return 'gemini-2.5-flash';
  if (
    modelName.includes('3.7') ||
    modelName.includes('3.6') ||
    modelName.includes('3.1') ||
    modelName.includes('latest') ||
    modelName === 'gemini-flash' ||
    modelName === 'gemini-pro'
  ) {
    return 'gemini-2.5-flash';
  }
  return modelName;
}

export function getAIStudioSettingsFromDb() {
  try {
    const keys = [
      'ai_studio_enabled',
      'feat_ai_studio',
      'ai_gemini_model',
      'ai_default_reel_duration',
      'ai_brand_handle',
      'ai_brand_hashtag',
      'ai_auto_process_on_show_end',
      'ai_auto_delete_reels_enabled',
      'ai_auto_delete_reels_hours',
      'ai_auto_delete_unapproved_only',
      'ai_system_prompt',
      'ai_custom_gemini_api_key',
      'stream_url',
      'stream_url_low',
      'stream_url_medium',
      'stream_url_high',
      'studio_video_url'
    ];
    const placeholders = keys.map(() => '?').join(',');
    const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...keys) as { key: string; value: string }[];
    const map = rows.reduce<Record<string, string>>((acc, r) => {
      acc[r.key] = r.value;
      return acc;
    }, {});

    const hasSystemKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");

    let liveStreamUrl = map['stream_url'] || map['stream_url_medium'] || map['stream_url_high'] || map['stream_url_low'] || '';
    if (!liveStreamUrl || liveStreamUrl.includes('somafm')) {
      liveStreamUrl = 'https://dejavufm.radioca.st/;';
    }

    return {
      ai_studio_enabled: map['ai_studio_enabled'] !== '0' && map['feat_ai_studio'] !== '0',
      ai_gemini_model: normalizeGeminiModel(map['ai_gemini_model']),
      ai_default_reel_duration: parseInt(map['ai_default_reel_duration'] || '30', 10),
      ai_brand_handle: map['ai_brand_handle'] || '@dejavufm',
      ai_brand_hashtag: map['ai_brand_hashtag'] || '#DejavuFM #LondonUnderground #DJSet #UKGarage #HouseMusic #Grime',
      ai_auto_process_on_show_end: map['ai_auto_process_on_show_end'] === '1',
      ai_auto_delete_reels_enabled: map['ai_auto_delete_reels_enabled'] === '1',
      ai_auto_delete_reels_hours: parseInt(map['ai_auto_delete_reels_hours'] || '48', 10),
      ai_auto_delete_unapproved_only: map['ai_auto_delete_unapproved_only'] !== '0',
      ai_system_prompt: map['ai_system_prompt'] || 'You are an elite electronic music curator and social media viral content specialist for DejavuFM, London legendary underground radio station.',
      ai_custom_gemini_api_key: map['ai_custom_gemini_api_key'] || '',
      has_system_gemini_key: hasSystemKey,
      stream_url: liveStreamUrl,
      studio_video_url: map['studio_video_url'] || 'https://www.twitch.tv/dejavufmlive'
    };
  } catch (err) {
    console.error('[AI Studio] Failed to read settings from DB:', err);
    return {
      ai_studio_enabled: true,
      ai_gemini_model: 'gemini-2.5-flash',
      ai_default_reel_duration: 30,
      ai_brand_handle: '@dejavufm',
      ai_brand_hashtag: '#DejavuFM #LondonUnderground #DJSet #UKGarage #HouseMusic',
      ai_auto_process_on_show_end: false,
      ai_auto_delete_reels_enabled: false,
      ai_auto_delete_reels_hours: 48,
      ai_auto_delete_unapproved_only: true,
      ai_system_prompt: 'You are an elite electronic music curator and social media viral content specialist for DejavuFM.',
      ai_custom_gemini_api_key: '',
      has_system_gemini_key: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
      stream_url: 'https://dejavufm.radioca.st/;',
      studio_video_url: 'https://www.twitch.tv/dejavufmlive'
    };
  }
}

export interface AnalyzeShowParams {
  showName: string;
  djName: string;
  totalDurationSeconds: number;
  targetReelsCount?: number;
  customPrompt?: string;
  categoryPreference?: string;
  talkFocus?: boolean;
  loudnessPeaks?: Array<{
    time: number;
    energy: number;
    frequencyScore: number;
    speechLikelihood?: number;
    type?: 'speech_talkover' | 'music_drop' | 'transition';
  }>;
  chatMoments?: Array<{ time: number; text: string; user: string }>;
}

/**
 * Analyzes show metadata, energy dynamics, loudness peaks, and chat sentiment to detect viral moments
 */
export async function analyzeShowWithGemini(params: AnalyzeShowParams): Promise<DetectedHighlight[]> {
  const settings = getAIStudioSettingsFromDb();
  const client = getGeminiClient();
  const count = params.targetReelsCount || 3;
  const targetDuration = settings.ai_default_reel_duration || 30;

  if (client) {
    try {
      const primaryModel = settings.ai_gemini_model || 'gemini-2.5-flash';
      const showMins = Math.round(params.totalDurationSeconds / 60);
      const showHours = (params.totalDurationSeconds / 3600).toFixed(1);

      const prompt = `
${settings.ai_system_prompt}

TASK:
Analyze the following completed DJ radio broadcast show on DejavuFM and identify the top ${count} viral short-form video clip moments (15-45 seconds each) suitable for TikTok, Instagram Reels, and YouTube Shorts.

SHOW CONTEXT:
- Station: DejavuFM (London's Leading Underground Radio Station)
- DJ / Resident: "${params.djName}"
- Show Name: "${params.showName}"
- Total Recorded Audio Length: ${Math.round(params.totalDurationSeconds)} seconds (${showMins} minutes / approx ${showHours} hours)
- Brand Handle: ${settings.ai_brand_handle}
- Brand Hashtags: ${settings.ai_brand_hashtag}
${params.customPrompt ? `- Admin Guidance / Focus: "${params.customPrompt}"` : ''}
${params.categoryPreference ? `- Preferred Category: "${params.categoryPreference}"` : ''}

CRITICAL DIRECTIVE FOR MULTI-HOUR BROADCASTS (2 TO 4 HOURS):
- This recording covers a full ${showHours}-hour live radio broadcast (${showMins} mins).
- You MUST select the ${count} highlights DISTRIBUTED ACROSS THE ENTIRE BROADCAST TIMELINE (from 0s up to ${Math.floor(params.totalDurationSeconds)}s).
- Sample moments from different show phases (e.g., Opening Track / Warmup, Mid-Set Transition, Peak Hour Massive Drop, DJ Studio Talkover / Wheel-Up Reload, and Final Set Climax).
- If "Banter" or "Shoutout" or DJ mic speech is requested, prioritize acoustic segments labeled with "speech_talkover" or high speechLikelihood (over 60%) to prevent social copyright strikes.
- DO NOT cluster all highlights in the first 10-15 minutes.

AUDIO ACOUSTIC PEAKS & SPEECH METRICS (Detected across the full timeline):
${JSON.stringify((params.loudnessPeaks || []).slice(0, 25), null, 2)}

CHAT HYPE & LISTENER REACTION TIMELINE:
${JSON.stringify((params.chatMoments || []).slice(0, 15), null, 2)}

REQUIREMENTS:
1. Identify EXACTLY ${count} distinct, high-impact highlight moments across the entire show timeline (from 0 to ${Math.floor(params.totalDurationSeconds)}s).
2. Each highlight MUST have:
   - title: Short, punchy title (e.g. "Unreal Double Drop at Peak Hour", "DJ ${params.djName} Wheel-Up Reload", "Funniest Chat Shoutout")
   - hook: 3-7 words bold uppercase on-screen hook designed to stop social scrolling (e.g. "WHEN THE BASS DROPS AT 3AM 🔊", "THE MIX NOBODY SAW COMING 🤯", "LONDON UNDERGROUND ENERGY 🔥")
   - summary: 1-2 sentence description explaining why this moment is electric and will go viral
   - category: One of ["Drop", "Transition", "Banter", "Shoutout", "Exclusive", "CrowdHype"]
   - start_seconds: Starting timestamp (number, within 0 to ${Math.floor(params.totalDurationSeconds) - 15})
   - end_seconds: Ending timestamp (number, start_seconds + ${targetDuration} ± 10s, strictly <= ${Math.floor(params.totalDurationSeconds)})
   - virality_score: Integer from 75 to 99 representing estimated algorithmic shareability
   - captions: Array of 3 to 6 synchronized subtitle items: [{"start": 0, "end": 6, "text": "...", "highlight": true}]
   - social_copy: Complete ready-to-post caption for Instagram/TikTok with emojis and engaging question hook
   - hashtags: Clean hashtag string with station tags, DJ tags, and genre tags

Return ONLY valid JSON matching this schema:
[
  {
    "title": "string",
    "hook": "string",
    "summary": "string",
    "category": "Drop",
    "start_seconds": 120.5,
    "end_seconds": 150.5,
    "virality_score": 92,
    "captions": [
      { "start": 0, "end": 5, "text": "Listen to this bassline...", "highlight": true }
    ],
    "social_copy": "string",
    "hashtags": "string"
  }
]
`;

      // Candidate models for fallback when 503 high demand or 429 rate limit occurs
      const candidateModels = Array.from(new Set([
        primaryModel,
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ]));

      for (const modelToTry of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[AI Studio] Querying Gemini model '${modelToTry}' (attempt ${attempt})...`);
            const response = await client.models.generateContent({
              model: modelToTry,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.7,
              }
            });

            const text = response.text || "";
            if (text.trim()) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log(`[AI Studio] Successfully generated show analysis with Gemini model '${modelToTry}'!`);
                return sanitizeHighlights(parsed, params.totalDurationSeconds);
              }
            }
          } catch (err: any) {
            const errMessage = String(err?.message || err);
            const is503OrRateLimit = errMessage.includes('503') || errMessage.includes('UNAVAILABLE') || errMessage.includes('high demand') || errMessage.includes('429');
            console.warn(`[AI Studio] Gemini model '${modelToTry}' attempt ${attempt} notice: ${errMessage}`);
            if (is503OrRateLimit) {
              // Pause with backoff before retry or trying next candidate model
              await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            } else {
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[AI Studio] Gemini API call failed or timed out, using advanced signal energy heuristic:", err);
    }
  }

  // Robust algorithmic fallback based on audio loudness peak analysis and show structure
  return generateHeuristicHighlights(params, settings);
}

function sanitizeHighlights(items: any[], maxDuration: number): DetectedHighlight[] {
  return items.map((item, idx) => {
    let start = Math.max(0, Number(item.start_seconds) || (idx * 45));
    let end = Number(item.end_seconds) || (start + 30);
    if (end <= start) end = start + 30;
    if (end > maxDuration && maxDuration > 10) {
      end = maxDuration;
      start = Math.max(0, end - 30);
    }

    const categories: ReelCategory[] = ['Drop', 'Transition', 'Banter', 'Shoutout', 'Exclusive', 'CrowdHype'];
    const cat = categories.includes(item.category) ? item.category : 'Drop';

    return {
      title: String(item.title || `Viral Highlight #${idx + 1}`),
      hook: String(item.hook || "ENERGY UNLOCKED 🔥"),
      summary: String(item.summary || "Peak moment captured live on DejavuFM radio."),
      category: cat,
      start_seconds: Math.round(start * 10) / 10,
      end_seconds: Math.round(end * 10) / 10,
      virality_score: Math.min(99, Math.max(70, Number(item.virality_score) || 88)),
      captions: Array.isArray(item.captions) && item.captions.length > 0 ? item.captions : [
        { start: 0, end: 5, text: `DJ ${item.dj_name || 'Resident'} Live on DejavuFM`, highlight: true },
        { start: 5, end: 15, text: "Underground Bass & Pure London Energy", highlight: false },
        { start: 15, end: 30, text: "Lock in live on dejavufm.com", highlight: true }
      ],
      social_copy: String(item.social_copy || `Rate this drop from 1-10! 🔥 Track ID in the comments. Lock into DejavuFM for 24/7 underground radio.`),
      hashtags: String(item.hashtags || `#DejavuFM #DJMix #UKGarage #Bassline #RadioHighlight #LondonMusic`)
    };
  });
}

function generateHeuristicHighlights(params: AnalyzeShowParams, settings: any): DetectedHighlight[] {
  const count = params.targetReelsCount || 3;
  const total = Math.max(45, params.totalDurationSeconds || 180);
  const targetDuration = Math.min(30, Math.floor(total / count));
  const results: DetectedHighlight[] = [];

  const presets = [
    {
      title: `${params.djName} Peak Energy Drop`,
      hook: "WHEN THE BASS DROPS AT 3AM 🔥",
      summary: "Massive bass build-up transitioning into a high-energy drop with peak crowd hype.",
      category: "Drop" as ReelCategory,
      score: 94,
      hashtags: `${settings.ai_brand_hashtag} #BassDrop #UKG #FestivalEnergy #ViralSound`
    },
    {
      title: `Flawless Blend & Track ID Switch`,
      hook: "TRACK ID ON THIS ONE? 🤯",
      summary: "Harmonic transition blend between underground tracks that had the live chat in frenzy.",
      category: "Transition" as ReelCategory,
      score: 89,
      hashtags: `${settings.ai_brand_hashtag} #TrackID #DJMixing #SmoothTransition #UndergroundBanger`
    },
    {
      title: `Studio Mic Moments & Chat Hype`,
      hook: "DEJAVUFM STUDIO NEVER DULL ⚡",
      summary: "Iconic DJ mic shoutouts connecting directly with the listeners and spinning community anthems.",
      category: "Shoutout" as ReelCategory,
      score: 86,
      hashtags: `${settings.ai_brand_hashtag} #LiveRadio #DJShoutout #StudioVibes #LondonCulture`
    },
    {
      title: `Exclusive Wheel-Up Rewind`,
      hook: "PULL IT BACK! 🔊🔥",
      summary: "Classic London radio wheel-up reload after an absolute anthem dropped.",
      category: "Exclusive" as ReelCategory,
      score: 96,
      hashtags: `${settings.ai_brand_hashtag} #WheelUp #Reload #Rewind #LondonUnderground`
    }
  ];

  for (let i = 0; i < count; i++) {
    const preset = presets[i % presets.length];
    
    // Spread highlights evenly across the audio timeline
    let idealStart = 0;
    if (params.loudnessPeaks && params.loudnessPeaks.length > i) {
      idealStart = Math.max(0, params.loudnessPeaks[i].time - 5);
    } else {
      const step = total / (count + 1);
      idealStart = Math.max(0, Math.floor((i + 1) * step - 10));
    }

    let start = Math.min(idealStart, Math.max(0, total - targetDuration));
    let end = Math.min(total, start + targetDuration);

    results.push({
      title: preset.title,
      hook: preset.hook,
      summary: preset.summary,
      category: preset.category,
      start_seconds: Math.round(start * 10) / 10,
      end_seconds: Math.round(end * 10) / 10,
      virality_score: preset.score - (i * 2),
      captions: [
        { start: 0, end: 6, text: `DJ ${params.djName} on the decks`, highlight: true },
        { start: 6, end: 18, text: "Broadcasting direct from London studio", highlight: false },
        { start: 18, end: 30, text: "Tap the link in bio to tune in live 📻", highlight: true }
      ],
      social_copy: `Pure energy from ${params.djName}'s latest show "${params.showName}" on ${settings.ai_brand_handle}! Drop a 🔥 in the comments if you want the full tracklist.`,
      hashtags: preset.hashtags
    });
  }

  return results;
}
