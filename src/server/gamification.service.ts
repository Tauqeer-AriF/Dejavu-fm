import { db } from './db.ts';
import {
  GamificationSettings,
  GamificationLevel,
  GamificationBadge,
  UserGamificationProfile,
  LeaderboardEntry,
  XPAwardResult,
  XPTransaction
} from '../types/gamification.ts';
import { DEFAULT_GAMIFICATION_SETTINGS, DEFAULT_LEVELS } from './gamification.db.ts';

// Helper to get current UK / London date in YYYY-MM-DD format
export function getCurrentDateStr(): string {
  const now = new Date();
  // Format as YYYY-MM-DD
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get yesterday date string
export function getYesterdayDateStr(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get all gamification settings
export function getGamificationSettings(): GamificationSettings {
  try {
    const rows = db.prepare('SELECT key, value FROM gamification_settings').all() as { key: string; value: string }[];
    const map = new Map(rows.map(r => [r.key, r.value]));
    
    return {
      xp_daily_login: Number(map.get('xp_daily_login')) || DEFAULT_GAMIFICATION_SETTINGS.xp_daily_login,
      xp_listen_10m: Number(map.get('xp_listen_10m')) || DEFAULT_GAMIFICATION_SETTINGS.xp_listen_10m,
      xp_listen_30m: Number(map.get('xp_listen_30m')) || DEFAULT_GAMIFICATION_SETTINGS.xp_listen_30m,
      xp_follow_dj: Number(map.get('xp_follow_dj')) || DEFAULT_GAMIFICATION_SETTINGS.xp_follow_dj,
      xp_join_chat: Number(map.get('xp_join_chat')) || DEFAULT_GAMIFICATION_SETTINGS.xp_join_chat,
      xp_chat_message: Number(map.get('xp_chat_message')) || DEFAULT_GAMIFICATION_SETTINGS.xp_chat_message,
      xp_song_request: Number(map.get('xp_song_request')) || DEFAULT_GAMIFICATION_SETTINGS.xp_song_request,
      xp_share_show: Number(map.get('xp_share_show')) || DEFAULT_GAMIFICATION_SETTINGS.xp_share_show,
      xp_discover_dj: Number(map.get('xp_discover_dj')) || DEFAULT_GAMIFICATION_SETTINGS.xp_discover_dj,
      xp_streak_7d: Number(map.get('xp_streak_7d')) || DEFAULT_GAMIFICATION_SETTINGS.xp_streak_7d,
      chat_xp_cooldown_seconds: Number(map.get('chat_xp_cooldown_seconds')) || DEFAULT_GAMIFICATION_SETTINGS.chat_xp_cooldown_seconds,
      chat_xp_daily_max: Number(map.get('chat_xp_daily_max')) || DEFAULT_GAMIFICATION_SETTINGS.chat_xp_daily_max,
      min_listening_seconds_for_streak: Number(map.get('min_listening_seconds_for_streak')) || DEFAULT_GAMIFICATION_SETTINGS.min_listening_seconds_for_streak,
      night_owl_start_hour: Number(map.get('night_owl_start_hour')) || DEFAULT_GAMIFICATION_SETTINGS.night_owl_start_hour,
      night_owl_end_hour: Number(map.get('night_owl_end_hour')) || DEFAULT_GAMIFICATION_SETTINGS.night_owl_end_hour,
    };
  } catch (err) {
    console.error('[Gamification] Error loading settings:', err);
    return DEFAULT_GAMIFICATION_SETTINGS;
  }
}

// Get all gamification levels sorted ascending
export function getGamificationLevels(): GamificationLevel[] {
  try {
    const rows = db.prepare('SELECT level, title, min_xp, icon, perks FROM gamification_levels ORDER BY level ASC').all() as GamificationLevel[];
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.error('[Gamification] Error loading levels:', err);
  }
  return DEFAULT_LEVELS;
}

// Calculate level details from total XP
export function calculateLevelProgression(totalXp: number, levels?: GamificationLevel[]) {
  const allLevels = (levels && levels.length > 0) ? levels : getGamificationLevels();
  
  let currentLevel = allLevels[0];
  let nextLevel: GamificationLevel | null = allLevels[1] || null;

  for (let i = 0; i < allLevels.length; i++) {
    if (totalXp >= allLevels[i].min_xp) {
      currentLevel = allLevels[i];
      nextLevel = allLevels[i + 1] || null;
    } else {
      break;
    }
  }

  const currentLevelMinXp = currentLevel.min_xp;
  const nextLevelMinXp = nextLevel ? nextLevel.min_xp : null;

  let progressPercentage = 100;
  let xpInCurrentLevel = totalXp - currentLevelMinXp;
  let xpNeededForNextLevel = 0;

  if (nextLevelMinXp !== null) {
    const levelSpan = nextLevelMinXp - currentLevelMinXp;
    xpNeededForNextLevel = Math.max(0, nextLevelMinXp - totalXp);
    progressPercentage = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / levelSpan) * 100)));
  }

  return {
    currentLevel: currentLevel.level,
    levelTitle: currentLevel.title,
    currentLevelMinXp,
    nextLevelMinXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercentage
  };
}

// Check if user is an admin or DJ (exempt from listener gamification)
export function isStaffOrAdmin(username: string): boolean {
  if (!username) return false;
  try {
    const clean = username.trim().toLowerCase();
    const admin = db.prepare('SELECT username, role FROM admins WHERE LOWER(username) = ?').get(clean) as any;
    if (admin) {
      return true;
    }
  } catch (err) {
    // Ignore error
  }
  return false;
}

// Purge any staff/admin records from gamification tables
export function purgeStaffFromGamification(): void {
  try {
    db.prepare('DELETE FROM user_gamification WHERE LOWER(username) IN (SELECT LOWER(username) FROM admins)').run();
    db.prepare('DELETE FROM xp_transactions WHERE LOWER(username) IN (SELECT LOWER(username) FROM admins)').run();
    db.prepare('DELETE FROM user_badges WHERE LOWER(username) IN (SELECT LOWER(username) FROM admins)').run();
    db.prepare('DELETE FROM user_dj_listening WHERE LOWER(username) IN (SELECT LOWER(username) FROM admins)').run();
  } catch (e) {}
}

// Run cleanup immediately on load
try {
  purgeStaffFromGamification();
} catch (e) {}

// Ensure user has a record in user_gamification
export function ensureUserGamification(username: string): any {
  if (!username) return null;
  const cleanUsername = username.trim();
  if (isStaffOrAdmin(cleanUsername)) {
    return null;
  }
  const today = getCurrentDateStr();

  let userGam = db.prepare('SELECT * FROM user_gamification WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as any;

  if (!userGam) {
    try {
      db.prepare(`
        INSERT INTO user_gamification (username, total_xp, current_level, current_streak, longest_streak, today_listening_seconds, today_date, total_listening_seconds, show_on_leaderboard)
        VALUES (?, 0, 1, 0, 0, 0, ?, 0, 1)
      `).run(cleanUsername, today);

      userGam = db.prepare('SELECT * FROM user_gamification WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as any;
    } catch (e) {
      // Race condition safety
      userGam = db.prepare('SELECT * FROM user_gamification WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as any;
    }
  } else if (userGam.today_date !== today) {
    // Reset daily listening seconds on date change
    db.prepare('UPDATE user_gamification SET today_listening_seconds = 0, today_date = ? WHERE LOWER(username) = ?').run(today, cleanUsername.toLowerCase());
    userGam.today_listening_seconds = 0;
    userGam.today_date = today;
  }

  return userGam;
}

// Check and award badge if requirements are met
export function checkAndUnlockBadges(username: string): GamificationBadge[] {
  const cleanUsername = username.trim().toLowerCase();
  const unlockedBadges: GamificationBadge[] = [];

  if (isStaffOrAdmin(cleanUsername)) return unlockedBadges;

  try {
    const badges = db.prepare('SELECT * FROM gamification_badges').all() as GamificationBadge[];
    const userBadges = db.prepare('SELECT badge_id FROM user_badges WHERE LOWER(username) = ?').all(cleanUsername) as { badge_id: string }[];
    const earnedBadgeIds = new Set(userBadges.map(b => b.badge_id));

    const userGam = ensureUserGamification(cleanUsername);
    if (!userGam) return unlockedBadges;

    const followCountRow = db.prepare('SELECT COUNT(*) as count FROM user_dj_follows WHERE LOWER(username) = ?').get(cleanUsername) as { count: number };
    const followsCount = followCountRow?.count || 0;

    const uniqueDjsRow = db.prepare('SELECT COUNT(*) as count FROM user_dj_listening WHERE LOWER(username) = ?').get(cleanUsername) as { count: number };
    const uniqueDjsCount = uniqueDjsRow?.count || 0;

    const chatCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'chat_message'`).get(cleanUsername) as { count: number };
    const chatCount = chatCountRow?.count || 0;

    const songReqCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'song_request'`).get(cleanUsername) as { count: number };
    const songReqCount = songReqCountRow?.count || 0;

    const shareCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'share_show'`).get(cleanUsername) as { count: number };
    const shareCount = shareCountRow?.count || 0;

    const maxDjSessionRow = db.prepare('SELECT MAX(session_count) as max_sessions FROM user_dj_listening WHERE LOWER(username) = ?').get(cleanUsername) as { max_sessions: number };
    const maxDjSessions = maxDjSessionRow?.max_sessions || 0;

    const totalSessionsRow = db.prepare('SELECT SUM(session_count) as total_sessions FROM user_dj_listening WHERE LOWER(username) = ?').get(cleanUsername) as { total_sessions: number };
    const totalSessions = totalSessionsRow?.total_sessions || (userGam.total_listening_seconds > 60 ? 1 : 0);

    const nightOwlTx = db.prepare(`SELECT 1 FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'listen_night' LIMIT 1`).get(cleanUsername);

    const podcastCountRow = db.prepare(`SELECT COUNT(DISTINCT metadata) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'podcast_play'`).get(cleanUsername) as { count: number };
    const podcastCount = podcastCountRow?.count || 0;

    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let qualifies = false;

      switch (badge.id) {
        case 'first_listen':
          qualifies = userGam.total_listening_seconds >= 60 || totalSessions >= 1;
          break;
        case 'week_warrior':
          qualifies = userGam.current_streak >= 7 || userGam.longest_streak >= 7;
          break;
        case 'night_owl':
          qualifies = !!nightOwlTx;
          break;
        case 'genre_explorer':
          qualifies = uniqueDjsCount >= badge.requirement;
          break;
        case 'dj_superfan':
          qualifies = followsCount >= badge.requirement || maxDjSessions >= 20;
          break;
        case 'chatty_listener':
          qualifies = chatCount >= badge.requirement;
          break;
        case 'global_listener':
          qualifies = totalSessions >= badge.requirement;
          break;
        case 'song_curator':
          qualifies = songReqCount >= badge.requirement;
          break;
        case 'trendsetter':
          qualifies = shareCount >= badge.requirement;
          break;
        case 'podcast_discoverer':
          qualifies = podcastCount >= badge.requirement;
          break;
        case 'podcast_addict':
          qualifies = podcastCount >= badge.requirement;
          break;
        default:
          break;
      }

      if (qualifies) {
        try {
          db.prepare('INSERT OR IGNORE INTO user_badges (username, badge_id) VALUES (?, ?)').run(cleanUsername, badge.id);
          unlockedBadges.push({
            ...badge,
            unlocked: true,
            unlocked_at: new Date().toISOString()
          });
        } catch (err) {
          console.error(`[Gamification] Failed to insert badge ${badge.id}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('[Gamification] Error in checkAndUnlockBadges:', err);
  }

  return unlockedBadges;
}

// Award a specific or event badge directly to a user
export function awardBadge(
  username: string,
  badgeId: string,
  badgeInfo?: { name?: string; description?: string; icon?: string; category?: string }
): boolean {
  if (!username || !badgeId) return false;
  const cleanUsername = username.trim().toLowerCase();
  if (isStaffOrAdmin(cleanUsername)) return false;

  try {
    // Ensure badge entry exists in gamification_badges
    if (badgeInfo && badgeInfo.name) {
      db.prepare(`
        INSERT INTO gamification_badges (id, name, description, icon, requirement, requirement_type)
        VALUES (?, ?, ?, ?, 1, 'event_listen')
        ON CONFLICT(id) DO UPDATE SET
          name = COALESCE(excluded.name, name),
          description = COALESCE(excluded.description, description),
          icon = COALESCE(excluded.icon, icon)
      `).run(
        badgeId,
        badgeInfo.name,
        badgeInfo.description || `Special Event Badge: ${badgeInfo.name}`,
        badgeInfo.icon || 'Sparkles'
      );
    }

    const res = db.prepare('INSERT OR IGNORE INTO user_badges (username, badge_id) VALUES (?, ?)').run(cleanUsername, badgeId);
    return res.changes > 0;
  } catch (err) {
    console.error(`[Gamification] Failed to award badge ${badgeId} to ${cleanUsername}:`, err);
    return false;
  }
}

// Award XP with anti-abuse validation
export function awardXP(
  username: string,
  activityType: string,
  description: string,
  metadata?: any,
  customAmount?: number
): XPAwardResult {
  if (!username) {
    return {
      success: false,
      xp_awarded: 0,
      activity_type: activityType,
      description,
      total_xp: 0,
      current_level: 1,
      level_title: 'New Listener',
      leveled_up: false,
      unlocked_badges: []
    };
  }

  const cleanUsername = username.trim();

  // Do not track or award XP to admins or DJs
  if (isStaffOrAdmin(cleanUsername)) {
    return {
      success: false,
      xp_awarded: 0,
      activity_type: activityType,
      description: 'Gamification tracking disabled for Admins and DJs',
      total_xp: 0,
      current_level: 1,
      level_title: 'Staff / DJ',
      leveled_up: false,
      unlocked_badges: []
    };
  }

  const settings = getGamificationSettings();
  const today = getCurrentDateStr();

  let amountToAward = customAmount !== undefined ? customAmount : 0;

  // Determine base amount from settings if not custom
  if (customAmount === undefined) {
    switch (activityType) {
      case 'daily_login':
        amountToAward = settings.xp_daily_login;
        break;
      case 'listen_10m':
        amountToAward = settings.xp_listen_10m;
        break;
      case 'listen_30m':
        amountToAward = settings.xp_listen_30m;
        break;
      case 'follow_dj':
        amountToAward = settings.xp_follow_dj;
        break;
      case 'join_chat':
        amountToAward = settings.xp_join_chat;
        break;
      case 'chat_message':
        amountToAward = settings.xp_chat_message;
        break;
      case 'song_request':
        amountToAward = settings.xp_song_request;
        break;
      case 'share_show':
        amountToAward = settings.xp_share_show;
        break;
      case 'discover_dj':
        amountToAward = settings.xp_discover_dj;
        break;
      case 'podcast_play':
        amountToAward = settings.xp_podcast_play || 15;
        break;
      case 'streak_milestone_7d':
        amountToAward = settings.xp_streak_7d;
        break;
      default:
        amountToAward = 10;
        break;
    }
  }

  // Anti-Abuse Checks
  try {
    if (activityType === 'daily_login') {
      const existing = db.prepare(`
        SELECT 1 FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'daily_login' AND DATE(created_at) = ?
        LIMIT 1
      `).get(cleanUsername.toLowerCase(), today);

      if (existing) {
        // Already earned daily login XP today
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Daily login XP already claimed today',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'listen_10m' || activityType === 'listen_30m' || activityType === 'join_chat') {
      const existing = db.prepare(`
        SELECT 1 FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = ? AND DATE(created_at) = ?
        LIMIT 1
      `).get(cleanUsername.toLowerCase(), activityType, today);

      if (existing) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Activity XP already claimed today',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'chat_message') {
      // Cooldown check (60s)
      const lastChatTx = db.prepare(`
        SELECT created_at FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'chat_message'
        ORDER BY id DESC LIMIT 1
      `).get(cleanUsername.toLowerCase()) as { created_at: string } | undefined;

      if (lastChatTx) {
        const lastTime = new Date(lastChatTx.created_at).getTime();
        const nowTime = Date.now();
        const diffSeconds = (nowTime - lastTime) / 1000;
        if (diffSeconds < settings.chat_xp_cooldown_seconds) {
          const profile = ensureUserGamification(cleanUsername);
          const prog = calculateLevelProgression(profile.total_xp);
          return {
            success: false,
            xp_awarded: 0,
            activity_type: activityType,
            description: 'Chat XP cooldown active',
            total_xp: profile.total_xp,
            current_level: prog.currentLevel,
            level_title: prog.levelTitle,
            leveled_up: false,
            unlocked_badges: []
          };
        }
      }

      // Daily limit check
      const dailyChatXpRow = db.prepare(`
        SELECT SUM(amount) as total FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'chat_message' AND DATE(created_at) = ?
      `).get(cleanUsername.toLowerCase(), today) as { total: number };

      const dailyChatXp = dailyChatXpRow?.total || 0;
      if (dailyChatXp >= settings.chat_xp_daily_max) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Daily chat XP cap reached',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'follow_dj' && metadata?.dj_id) {
      const existingFollow = db.prepare(`
        SELECT 1 FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'follow_dj' AND metadata LIKE ?
        LIMIT 1
      `).get(cleanUsername.toLowerCase(), `%"dj_id":"${metadata.dj_id}"%`);

      if (existingFollow) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'XP already awarded for following this DJ',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'discover_dj' && metadata?.dj_name) {
      const existingDiscover = db.prepare(`
        SELECT 1 FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'discover_dj' AND metadata LIKE ?
        LIMIT 1
      `).get(cleanUsername.toLowerCase(), `%"dj_name":"${metadata.dj_name}"%`);

      if (existingDiscover) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'XP already awarded for discovering this DJ',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'share_show') {
      const todayShares = db.prepare(`
        SELECT COUNT(*) as count FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'share_show' AND DATE(created_at) = ?
      `).get(cleanUsername.toLowerCase(), today) as { count: number };

      if ((todayShares?.count || 0) >= 2) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Daily share XP limit reached',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'song_request') {
      const todayRequests = db.prepare(`
        SELECT COUNT(*) as count FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'song_request' AND DATE(created_at) = ?
      `).get(cleanUsername.toLowerCase(), today) as { count: number };

      if ((todayRequests?.count || 0) >= 3) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Daily song request XP limit reached',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }

    if (activityType === 'podcast_play') {
      const samePodcast = db.prepare(`
        SELECT 1 FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'podcast_play' AND metadata LIKE ?
        LIMIT 1
      `).get(cleanUsername.toLowerCase(), `%"title":"${metadata?.title}"%`);

      if (samePodcast) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'XP already claimed for this podcast episode',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }

      const todayPodcasts = db.prepare(`
        SELECT COUNT(*) as count FROM xp_transactions 
        WHERE LOWER(username) = ? AND activity_type = 'podcast_play' AND DATE(created_at) = ?
      `).get(cleanUsername.toLowerCase(), today) as { count: number };

      if ((todayPodcasts?.count || 0) >= 3) {
        const profile = ensureUserGamification(cleanUsername);
        const prog = calculateLevelProgression(profile.total_xp);
        return {
          success: false,
          xp_awarded: 0,
          activity_type: activityType,
          description: 'Daily podcast listening XP cap reached (Max 3 episodes per day)',
          total_xp: profile.total_xp,
          current_level: prog.currentLevel,
          level_title: prog.levelTitle,
          leveled_up: false,
          unlocked_badges: []
        };
      }
    }
  } catch (err) {
    console.error('[Gamification] Error in anti-abuse check:', err);
  }

  // Record transaction and update user stats
  const userGam = ensureUserGamification(cleanUsername);
  const oldProgression = calculateLevelProgression(userGam.total_xp);

  const metaStr = metadata ? JSON.stringify(metadata) : null;
  db.prepare(`
    INSERT INTO xp_transactions (username, amount, activity_type, description, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanUsername, amountToAward, activityType, description, metaStr);

  const newTotalXp = userGam.total_xp + amountToAward;
  const newProgression = calculateLevelProgression(newTotalXp);
  const leveledUp = newProgression.currentLevel > oldProgression.currentLevel;

  db.prepare(`
    UPDATE user_gamification 
    SET total_xp = ?, current_level = ?, updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(username) = ?
  `).run(newTotalXp, newProgression.currentLevel, cleanUsername.toLowerCase());

  // Check for badge unlocks
  const unlockedBadges = checkAndUnlockBadges(cleanUsername);

  return {
    success: true,
    xp_awarded: amountToAward,
    activity_type: activityType,
    description,
    total_xp: newTotalXp,
    current_level: newProgression.currentLevel,
    level_title: newProgression.levelTitle,
    leveled_up: leveledUp,
    old_level: oldProgression.currentLevel,
    new_level: newProgression.currentLevel,
    unlocked_badges: unlockedBadges
  };
}

// In-memory debounce / session tracker for listening heartbeats to prevent multi-tab spamming
const activeListeningSessions = new Map<string, { lastHeartbeat: number; tabId?: string }>();

// Process listening heartbeat from client
export function processListeningHeartbeat(
  username: string,
  data: {
    durationSeconds?: number;
    isPlaying: boolean;
    djName?: string;
    showName?: string;
    trackTitle?: string;
    tabId?: string;
  }
): {
  success: boolean;
  todayListeningSeconds: number;
  totalListeningSeconds: number;
  currentStreak: number;
  longestStreak: number;
  qualifiedToday: boolean;
  xpResults: XPAwardResult[];
} {
  const emptyRes = {
    success: false,
    todayListeningSeconds: 0,
    totalListeningSeconds: 0,
    currentStreak: 0,
    longestStreak: 0,
    qualifiedToday: false,
    xpResults: []
  };

  if (!username || !data.isPlaying || isStaffOrAdmin(username)) return emptyRes;

  const cleanUsername = username.trim();
  const settings = getGamificationSettings();
  const today = getCurrentDateStr();
  const yesterday = getYesterdayDateStr();
  const now = Date.now();

  // Validate duration: cap at 120s per heartbeat to prevent spoofing, default to 60s
  let durationIncrement = Math.min(120, Math.max(5, Number(data.durationSeconds) || 60));

  // Multi-tab concurrency protection: ensure heartbeats from user are at least 20 seconds apart
  const sessionKey = cleanUsername.toLowerCase();
  const existingSession = activeListeningSessions.get(sessionKey);

  if (existingSession) {
    const elapsedMs = now - existingSession.lastHeartbeat;
    if (elapsedMs < 20000) {
      // Too fast, ignore redundant tick from secondary browser tab
      const currentGam = ensureUserGamification(cleanUsername);
      return {
        success: true,
        todayListeningSeconds: currentGam.today_listening_seconds,
        totalListeningSeconds: currentGam.total_listening_seconds,
        currentStreak: currentGam.current_streak,
        longestStreak: currentGam.longest_streak,
        qualifiedToday: currentGam.last_listening_date === today,
        xpResults: []
      };
    }
  }

  activeListeningSessions.set(sessionKey, {
    lastHeartbeat: now,
    tabId: data.tabId
  });

  const userGam = ensureUserGamification(cleanUsername);
  const newTodaySeconds = (userGam.today_listening_seconds || 0) + durationIncrement;
  const newTotalSeconds = (userGam.total_listening_seconds || 0) + durationIncrement;

  let currentStreak = userGam.current_streak || 0;
  let longestStreak = userGam.longest_streak || 0;
  let lastListeningDate = userGam.last_listening_date;
  let qualifiedToday = lastListeningDate === today;

  const xpResults: XPAwardResult[] = [];

  // Record DJ / Show listening stats
  if (data.djName && data.djName.trim() && data.djName !== 'DejavuFM') {
    const cleanDj = data.djName.trim();
    try {
      const djRow = db.prepare('SELECT total_seconds, session_count FROM user_dj_listening WHERE LOWER(username) = ? AND LOWER(dj_name) = ?').get(cleanUsername.toLowerCase(), cleanDj.toLowerCase()) as any;

      if (!djRow) {
        db.prepare(`
          INSERT INTO user_dj_listening (username, dj_name, total_seconds, session_count, last_listened)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `).run(cleanUsername, cleanDj, durationIncrement);

        // Discovered a new DJ! Award +15 XP
        const discoverRes = awardXP(cleanUsername, 'discover_dj', `Discovered & tuned in to DJ ${cleanDj}`, { dj_name: cleanDj });
        if (discoverRes.success) xpResults.push(discoverRes);
      } else {
        db.prepare(`
          UPDATE user_dj_listening 
          SET total_seconds = total_seconds + ?, session_count = session_count + 1, last_listened = CURRENT_TIMESTAMP
          WHERE LOWER(username) = ? AND LOWER(dj_name) = ?
        `).run(durationIncrement, cleanUsername.toLowerCase(), cleanDj.toLowerCase());
      }
    } catch (err) {
      console.error('[Gamification] Error updating DJ listening history:', err);
    }
  }

  // Check if listening during midnight hours (00:00 - 05:00 UTC)
  const currentHour = new Date().getUTCHours();
  if (currentHour >= settings.night_owl_start_hour && currentHour < settings.night_owl_end_hour) {
    try {
      const existingNightTx = db.prepare(`SELECT 1 FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'listen_night' LIMIT 1`).get(cleanUsername.toLowerCase());
      if (!existingNightTx) {
        const nightRes = awardXP(cleanUsername, 'listen_night', 'Late night listener tune-in (00:00 - 05:00)', { hour: currentHour }, 10);
        if (nightRes.success) xpResults.push(nightRes);
      }
    } catch (e) {}
  }

  // Check if daily listening streak threshold met (e.g. 600s = 10 minutes)
  const minStreakSeconds = settings.min_listening_seconds_for_streak;
  if (newTodaySeconds >= minStreakSeconds && !qualifiedToday) {
    // Qualify for streak today!
    if (lastListeningDate === yesterday) {
      currentStreak += 1;
    } else if (lastListeningDate === today) {
      // already recorded
    } else {
      // Streak broken or starting fresh
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    lastListeningDate = today;
    qualifiedToday = true;

    // Award 10 min listening reward
    const listen10Res = awardXP(cleanUsername, 'listen_10m', 'Tuned in for 10 minutes today');
    if (listen10Res.success) xpResults.push(listen10Res);

    // Check streak milestone rewards
    if (currentStreak === 3) {
      const milestone3Res = awardXP(cleanUsername, 'streak_milestone_3d', '3-Day Listening Streak Achieved!', { streak_days: 3 }, 50);
      if (milestone3Res.success) xpResults.push(milestone3Res);
    } else if (currentStreak === 7) {
      const milestone7Res = awardXP(cleanUsername, 'streak_milestone_7d', '7-Day Listening Streak Master!', { streak_days: 7 }, settings.xp_streak_7d);
      if (milestone7Res.success) xpResults.push(milestone7Res);
    } else if (currentStreak === 14) {
      const milestone14Res = awardXP(cleanUsername, 'streak_milestone_14d', '14-Day Listening Streak Legend!', { streak_days: 14 }, 500);
      if (milestone14Res.success) xpResults.push(milestone14Res);
    } else if (currentStreak === 30) {
      const milestone30Res = awardXP(cleanUsername, 'streak_milestone_30d', '30-Day Monthly Listening Streak!', { streak_days: 30 }, 1200);
      if (milestone30Res.success) xpResults.push(milestone30Res);
    } else if (currentStreak === 100) {
      const milestone100Res = awardXP(cleanUsername, 'streak_milestone_100d', '100-Day Centurion Listening Streak!', { streak_days: 100 }, 5000);
      if (milestone100Res.success) xpResults.push(milestone100Res);
    }
  }

  // Check 30 min listening milestone
  if (newTodaySeconds >= 1800) {
    const listen30Res = awardXP(cleanUsername, 'listen_30m', 'Tuned in for 30 minutes today');
    if (listen30Res.success) xpResults.push(listen30Res);
  }

  // Update user_gamification database row
  db.prepare(`
    UPDATE user_gamification 
    SET today_listening_seconds = ?, 
        total_listening_seconds = ?, 
        current_streak = ?, 
        longest_streak = ?, 
        last_listening_date = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(username) = ?
  `).run(newTodaySeconds, newTotalSeconds, currentStreak, longestStreak, lastListeningDate, cleanUsername.toLowerCase());

  // Check badges
  const newBadges = checkAndUnlockBadges(cleanUsername);
  if (newBadges.length > 0 && xpResults.length > 0) {
    xpResults[0].unlocked_badges = [...xpResults[0].unlocked_badges, ...newBadges];
  }

  return {
    success: true,
    todayListeningSeconds: newTodaySeconds,
    totalListeningSeconds: newTotalSeconds,
    currentStreak,
    longestStreak,
    qualifiedToday,
    xpResults
  };
}

// Get full user gamification profile
export function getUserGamificationProfile(username: string): UserGamificationProfile | null {
  if (!username) return null;
  const cleanUsername = username.trim();
  if (isStaffOrAdmin(cleanUsername)) {
    return null;
  }
  const userGam = ensureUserGamification(cleanUsername);
  if (!userGam) return null;

  const today = getCurrentDateStr();
  const progression = calculateLevelProgression(userGam.total_xp);

  // Get user avatar & role from users table
  let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
  let role = 'listener';
  let isAdminOrDj = false;

  const userRow = db.prepare('SELECT avatar_url FROM users WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as any;
  if (userRow && userRow.avatar_url) {
    avatarUrl = userRow.avatar_url;
  }

  // Badges calculation
  const allBadges = db.prepare('SELECT * FROM gamification_badges').all() as GamificationBadge[];
  const userBadges = db.prepare('SELECT badge_id, unlocked_at FROM user_badges WHERE LOWER(username) = ?').all(cleanUsername.toLowerCase()) as { badge_id: string; unlocked_at: string }[];
  const earnedMap = new Map(userBadges.map(b => [b.badge_id, b.unlocked_at]));

  // Progress helpers for in-progress badges
  const followCountRow = db.prepare('SELECT COUNT(*) as count FROM user_dj_follows WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as { count: number };
  const followsCount = followCountRow?.count || 0;

  const uniqueDjsRow = db.prepare('SELECT COUNT(*) as count FROM user_dj_listening WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as { count: number };
  const uniqueDjsCount = uniqueDjsRow?.count || 0;

  const chatCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'chat_message'`).get(cleanUsername.toLowerCase()) as { count: number };
  const chatCount = chatCountRow?.count || 0;

  const songReqCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'song_request'`).get(cleanUsername.toLowerCase()) as { count: number };
  const songReqCount = songReqCountRow?.count || 0;

  const shareCountRow = db.prepare(`SELECT COUNT(*) as count FROM xp_transactions WHERE LOWER(username) = ? AND activity_type = 'share_show'`).get(cleanUsername.toLowerCase()) as { count: number };
  const shareCount = shareCountRow?.count || 0;

  const totalSessionsRow = db.prepare('SELECT SUM(session_count) as total_sessions FROM user_dj_listening WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase()) as { total_sessions: number };
  const totalSessions = totalSessionsRow?.total_sessions || (userGam.total_listening_seconds > 60 ? 1 : 0);

  const badgesWithStatus: GamificationBadge[] = allBadges.map(b => {
    const isUnlocked = earnedMap.has(b.id);
    let progress = 0;
    const maxProgress = b.requirement;

    if (isUnlocked) {
      progress = maxProgress;
    } else {
      switch (b.id) {
        case 'week_warrior':
          progress = Math.min(maxProgress, userGam.current_streak || 0);
          break;
        case 'genre_explorer':
          progress = Math.min(maxProgress, uniqueDjsCount);
          break;
        case 'dj_superfan':
          progress = Math.min(maxProgress, followsCount);
          break;
        case 'chatty_listener':
          progress = Math.min(maxProgress, chatCount);
          break;
        case 'global_listener':
          progress = Math.min(maxProgress, totalSessions);
          break;
        case 'song_curator':
          progress = Math.min(maxProgress, songReqCount);
          break;
        case 'trendsetter':
          progress = Math.min(maxProgress, shareCount);
          break;
        default:
          progress = 0;
      }
    }

    return {
      ...b,
      unlocked: isUnlocked,
      unlocked_at: earnedMap.get(b.id) || undefined,
      progress,
      max_progress: maxProgress
    };
  });

  // Recent XP transactions
  const recentTransactions = db.prepare(`
    SELECT id, username, amount, activity_type, description, metadata, created_at
    FROM xp_transactions
    WHERE LOWER(username) = ?
    ORDER BY id DESC
    LIMIT 20
  `).all(cleanUsername.toLowerCase()) as XPTransaction[];

  // Followed DJs
  const follows = db.prepare('SELECT dj_id FROM user_dj_follows WHERE LOWER(username) = ?').all(cleanUsername.toLowerCase()) as { dj_id: string }[];
  const followedDjIds = follows.map(f => f.dj_id);

  return {
    username: cleanUsername,
    avatar_url: avatarUrl,
    total_xp: userGam.total_xp || 0,
    current_level: progression.currentLevel,
    level_title: progression.levelTitle,
    current_level_min_xp: progression.currentLevelMinXp,
    next_level_min_xp: progression.nextLevelMinXp,
    xp_in_current_level: progression.xpInCurrentLevel,
    xp_needed_for_next_level: progression.xpNeededForNextLevel,
    progress_percentage: progression.progressPercentage,
    current_streak: userGam.current_streak || 0,
    longest_streak: userGam.longest_streak || 0,
    last_listening_date: userGam.last_listening_date || null,
    qualified_today: userGam.last_listening_date === today,
    today_listening_seconds: userGam.today_listening_seconds || 0,
    today_listening_minutes: Math.floor((userGam.today_listening_seconds || 0) / 60),
    total_listening_seconds: userGam.total_listening_seconds || 0,
    total_listening_hours: Number(((userGam.total_listening_seconds || 0) / 3600).toFixed(1)),
    show_on_leaderboard: userGam.show_on_leaderboard !== 0,
    badges: badgesWithStatus,
    recent_transactions: recentTransactions,
    followed_dj_ids: followedDjIds,
    is_admin_or_dj: isAdminOrDj,
    role
  };
}

// Get Leaderboard
export function getLeaderboard(
  timeframe: 'weekly' | 'monthly' | 'all_time' = 'all_time',
  currentUsername?: string,
  limit: number = 50
): LeaderboardEntry[] {
  const levels = getGamificationLevels();

  let rows: any[] = [];

  if (timeframe === 'weekly') {
    rows = db.prepare(`
      SELECT 
        ug.username,
        ug.total_xp as total_xp,
        ug.current_streak,
        ug.show_on_leaderboard,
        COALESCE(SUM(tx.amount), 0) as period_xp,
        COUNT(DISTINCT ub.badge_id) as badges_count
      FROM user_gamification ug
      LEFT JOIN xp_transactions tx ON LOWER(tx.username) = LOWER(ug.username) AND tx.created_at >= datetime('now', '-7 days')
      LEFT JOIN user_badges ub ON LOWER(ub.username) = LOWER(ug.username)
      WHERE LOWER(ug.username) NOT IN (SELECT LOWER(username) FROM admins)
      GROUP BY ug.username
      ORDER BY period_xp DESC, ug.total_xp DESC
      LIMIT ?
    `).all(limit) as any[];
  } else if (timeframe === 'monthly') {
    rows = db.prepare(`
      SELECT 
        ug.username,
        ug.total_xp as total_xp,
        ug.current_streak,
        ug.show_on_leaderboard,
        COALESCE(SUM(tx.amount), 0) as period_xp,
        COUNT(DISTINCT ub.badge_id) as badges_count
      FROM user_gamification ug
      LEFT JOIN xp_transactions tx ON LOWER(tx.username) = LOWER(ug.username) AND tx.created_at >= datetime('now', '-30 days')
      LEFT JOIN user_badges ub ON LOWER(ub.username) = LOWER(ug.username)
      WHERE LOWER(ug.username) NOT IN (SELECT LOWER(username) FROM admins)
      GROUP BY ug.username
      ORDER BY period_xp DESC, ug.total_xp DESC
      LIMIT ?
    `).all(limit) as any[];
  } else {
    rows = db.prepare(`
      SELECT 
        ug.username,
        ug.total_xp as total_xp,
        ug.total_xp as period_xp,
        ug.current_streak,
        ug.show_on_leaderboard,
        COUNT(DISTINCT ub.badge_id) as badges_count
      FROM user_gamification ug
      LEFT JOIN user_badges ub ON LOWER(ub.username) = LOWER(ug.username)
      WHERE LOWER(ug.username) NOT IN (SELECT LOWER(username) FROM admins)
      GROUP BY ug.username
      ORDER BY ug.total_xp DESC
      LIMIT ?
    `).all(limit) as any[];
  }

  const entries: LeaderboardEntry[] = [];
  const normalizedCurrent = (currentUsername || '').trim().toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isCurrentUser = row.username.toLowerCase() === normalizedCurrent;

    // Check if user has opted out of leaderboard display
    let displayUsername = row.username;
    let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${row.username}`;

    if (row.show_on_leaderboard === 0 && !isCurrentUser) {
      displayUsername = 'Anonymous Listener';
      avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous';
    } else {
      // Look up avatar
      const user = db.prepare('SELECT avatar_url FROM users WHERE LOWER(username) = ?').get(row.username.toLowerCase()) as any;
      if (user && user.avatar_url) {
        avatarUrl = user.avatar_url;
      }
    }

    const prog = calculateLevelProgression(row.total_xp, levels);

    entries.push({
      rank: i + 1,
      username: displayUsername,
      avatar_url: avatarUrl,
      total_xp: row.total_xp,
      period_xp: row.period_xp,
      current_level: prog.currentLevel,
      level_title: prog.levelTitle,
      current_streak: row.current_streak || 0,
      badges_count: row.badges_count || 0,
      is_current_user: isCurrentUser
    });
  }

  return entries;
}

// Toggle DJ Follow
export function toggleFollowDJ(username: string, djId: string): { isFollowing: boolean; xpResult?: XPAwardResult } {
  if (!username || !djId) return { isFollowing: false };
  const cleanUsername = username.trim();
  const cleanDjId = djId.trim();

  const existing = db.prepare('SELECT id FROM user_dj_follows WHERE LOWER(username) = ? AND dj_id = ?').get(cleanUsername.toLowerCase(), cleanDjId) as any;

  if (existing) {
    db.prepare('DELETE FROM user_dj_follows WHERE id = ?').run(existing.id);
    return { isFollowing: false };
  } else {
    db.prepare('INSERT INTO user_dj_follows (username, dj_id) VALUES (?, ?)').run(cleanUsername, cleanDjId);

    // If admin or DJ, do not award XP
    if (isStaffOrAdmin(cleanUsername)) {
      return { isFollowing: true };
    }

    // Look up DJ name for description
    const djRow = db.prepare('SELECT name FROM djs WHERE id = ?').get(cleanDjId) as { name: string } | undefined;
    const djName = djRow?.name || cleanDjId;

    const xpResult = awardXP(cleanUsername, 'follow_dj', `Followed DJ ${djName}`, { dj_id: cleanDjId, dj_name: djName });
    return { isFollowing: true, xpResult };
  }
}

// Update Leaderboard Privacy
export function updateLeaderboardPrivacy(username: string, showOnLeaderboard: boolean): boolean {
  if (!username) return false;
  const cleanUsername = username.trim().toLowerCase();
  ensureUserGamification(cleanUsername);
  db.prepare('UPDATE user_gamification SET show_on_leaderboard = ? WHERE LOWER(username) = ?').run(showOnLeaderboard ? 1 : 0, cleanUsername);
  return true;
}

// Admin stats overview
export function getGamificationAdminOverview() {
  const totalXpAwardedRow = db.prepare('SELECT SUM(amount) as total FROM xp_transactions').get() as { total: number };
  const totalXpAwarded = totalXpAwardedRow?.total || 0;

  const totalListenersRow = db.prepare('SELECT COUNT(*) as count FROM user_gamification').get() as { count: number };
  const totalListeners = totalListenersRow?.count || 0;

  const activeStreaksRow = db.prepare('SELECT COUNT(*) as count FROM user_gamification WHERE current_streak > 0').get() as { count: number };
  const activeStreaks = activeStreaksRow?.count || 0;

  const totalBadgesUnlockedRow = db.prepare('SELECT COUNT(*) as count FROM user_badges').get() as { count: number };
  const totalBadgesUnlocked = totalBadgesUnlockedRow?.count || 0;

  const topUsers = db.prepare(`
    SELECT username, total_xp, current_level, current_streak, longest_streak, total_listening_seconds
    FROM user_gamification
    ORDER BY total_xp DESC
    LIMIT 10
  `).all() as any[];

  const badgeCounts = db.prepare(`
    SELECT b.id, b.name, b.icon, COUNT(ub.id) as unlock_count
    FROM gamification_badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id
    GROUP BY b.id
    ORDER BY unlock_count DESC
  `).all() as any[];

  const activityDistribution = db.prepare(`
    SELECT activity_type, COUNT(*) as count, SUM(amount) as total_xp
    FROM xp_transactions
    GROUP BY activity_type
    ORDER BY count DESC
  `).all() as any[];

  return {
    totalXpAwarded,
    totalListeners,
    activeStreaks,
    totalBadgesUnlocked,
    topUsers,
    badgeCounts,
    activityDistribution,
    settings: getGamificationSettings(),
    levels: getGamificationLevels()
  };
}
