import { Router } from 'express';
import { db } from './db.ts';
import { getAuthenticatedUser } from './gamification.routes.ts';
import { getUserGamificationProfile } from './gamification.service.ts';
import { resolveGreeting } from '../utils/greetingResolver.ts';
import { GreetingContextInput, GreetingResult } from '../types/greeting.ts';

export const greetingRouter = Router();

/**
 * Helper to get current on-air show from the database schedule
 */
export function getCurrentLiveShow(referenceDate: Date = new Date()): {
  djId?: string;
  djName?: string;
  showName?: string;
  djPhoto?: string;
  isLive: boolean;
  startTime?: string;
  endTime?: string;
  allDjIds?: string[];
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false
    });
    
    // Convert to London time
    const parts = formatter.formatToParts(referenceDate);
    const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
    const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
    const currentTimeStr = `${hourPart}:${minutePart}`;

    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday in JavaScript
    const londonDate = new Date(referenceDate.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const currentDay = londonDate.getDay();

    const schedules = db.prepare('SELECT * FROM schedule WHERE day_of_week = ? ORDER BY start_time').all(currentDay) as any[];
    if (!schedules || schedules.length === 0) {
      return { isLive: false };
    }

    const djs = db.prepare('SELECT * FROM djs').all() as any[];
    const djsMap = new Map<string, any>(djs.map(d => [d.id.toString(), d]));

    const onAir = schedules.find((s: any) => {
      const isCrossMidnight = s.start_time > s.end_time;
      if (!isCrossMidnight) {
        return s.start_time <= currentTimeStr && s.end_time > currentTimeStr;
      } else {
        return currentTimeStr >= s.start_time || currentTimeStr < s.end_time;
      }
    });

    if (!onAir) {
      return { isLive: false };
    }

    let matchingDjs: any[] = [];
    const djIds = onAir.dj_id ? onAir.dj_id.toString().split(',').map((id: string) => id.trim()).filter(Boolean) : [];
    if (djIds.length > 0) {
      matchingDjs = djIds.map((id: string) => djsMap.get(id)).filter(Boolean);
    }

    let djName = 'Resident DJ';
    let djPhoto = undefined;
    if (matchingDjs.length > 0) {
      const names = matchingDjs.map(d => d.name);
      djName = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
      djPhoto = matchingDjs[0].image_url;
    }

    return {
      isLive: true,
      djId: djIds[0] || undefined,
      allDjIds: djIds,
      djName,
      showName: onAir.show_name,
      djPhoto,
      startTime: onAir.start_time,
      endTime: onAir.end_time
    };
  } catch (err) {
    console.error('[Greeting] Failed to evaluate current live show:', err);
    return { isLive: false };
  }
}

/**
 * GET /api/public/greeting
 * Fetch personalized context-aware greeting for current listener or guest
 */
greetingRouter.get('/public/greeting', (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req);
    const clientHour = req.query.hour ? parseInt(req.query.hour as string, 10) : undefined;
    const clientTz = (req.query.tz as string) || undefined;

    const liveShow = getCurrentLiveShow();

    if (!authUser) {
      // Guest User
      const greetingResult = resolveGreeting({
        user: null,
        liveShow,
        clientTime: {
          hour: isNaN(clientHour!) ? undefined : clientHour,
          timezone: clientTz
        }
      });
      return res.json(greetingResult);
    }

    // Authenticated User
    const cleanUsername = authUser.username.trim();

    // 1. Fetch user account metadata safely
    let userRow: any = null;
    try {
      userRow = db.prepare('SELECT username, created_at, last_login, avatar_url FROM users WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase());
      if (!userRow) {
        try {
          userRow = db.prepare('SELECT username, created_at, role, photo_url as avatar_url FROM admins WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase());
        } catch {
          userRow = db.prepare('SELECT username, role, photo_url as avatar_url FROM admins WHERE LOWER(username) = ?').get(cleanUsername.toLowerCase());
        }
      }
    } catch (uErr) {
      console.warn('[Greeting] Non-critical warning querying user metadata:', uErr);
    }

    // 2. Fetch user gamification stats safely
    let profile: any = null;
    try {
      profile = getUserGamificationProfile(cleanUsername);
    } catch (gErr) {
      console.warn('[Greeting] Non-critical warning querying gamification profile:', gErr);
    }
    if (!profile) {
      profile = {
        username: cleanUsername,
        current_streak: 0,
        longest_streak: 0,
        last_listening_date: null,
        today_listening_seconds: 0,
        total_listening_seconds: 0,
        total_listening_hours: 0,
        followed_dj_ids: [],
        total_xp: 0,
        current_level: 1,
        level_title: 'Novice Listener',
        achievements: []
      };
    }

    // 3. Fetch top listened DJs & genres safely
    let topDjNames: string[] = [];
    try {
      const topDjsRows = db.prepare('SELECT dj_name, total_seconds FROM user_dj_listening WHERE LOWER(username) = ? ORDER BY total_seconds DESC LIMIT 5').all(cleanUsername.toLowerCase()) as any[];
      topDjNames = (topDjsRows || []).map(r => r.dj_name);
    } catch (djErr) {
      console.warn('[Greeting] Non-critical warning querying user_dj_listening:', djErr);
      topDjNames = [];
    }

    // Deducing favorite genres from listened DJs or followed DJs
    let topGenres: string[] = [];
    try {
      const followedDjs = db.prepare(`
        SELECT d.badge1, d.badge2, d.name
        FROM user_dj_follows f
        JOIN djs d ON f.dj_id = d.id
        WHERE LOWER(f.username) = ?
      `).all(cleanUsername.toLowerCase()) as any[];

      const genreCounts: Record<string, number> = {};
      for (const d of (followedDjs || [])) {
        if (d.badge1 && d.badge1 !== 'Resident' && d.badge1 !== 'Underground') {
          genreCounts[d.badge1] = (genreCounts[d.badge1] || 0) + 2;
        }
        if (d.badge2 && d.badge2 !== 'Resident' && d.badge2 !== 'Underground') {
          genreCounts[d.badge2] = (genreCounts[d.badge2] || 0) + 2;
        }
      }
      topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
    } catch (folErr) {
      console.warn('[Greeting] Non-critical warning querying followed DJs:', folErr);
      topGenres = [];
    }

    const favoriteGenre = topGenres.length > 0 ? topGenres[0] : undefined;

    // 4. Construct input object for the pure resolver
    const input: GreetingContextInput = {
      user: {
        username: cleanUsername,
        displayName: cleanUsername,
        createdAt: userRow?.created_at,
        lastLogin: userRow?.last_login,
        lastSeen: userRow?.last_login || userRow?.created_at,
        isNewUser: (profile?.total_listening_seconds || 0) === 0 && (profile?.current_streak || 0) === 0,
        role: authUser.role,
        isAdmin: authUser.is_admin
      },
      gamification: {
        currentStreak: profile?.current_streak || 0,
        longestStreak: profile?.longest_streak || 0,
        lastListeningDate: profile?.last_listening_date,
        todayListeningSeconds: profile?.today_listening_seconds || 0,
        totalListeningSeconds: profile?.total_listening_seconds || 0,
        followedDjIds: profile?.followed_dj_ids || [],
        totalXp: profile?.total_xp || 0,
        currentLevel: profile?.current_level || 1,
        levelTitle: profile?.level_title
      },
      liveShow: {
        ...liveShow,
        // Check if any of the show's DJ ids are followed
        isLive: liveShow.isLive
      },
      userPreferences: {
        favoriteGenre,
        topGenres,
        topDjNames
      },
      clientTime: {
        hour: isNaN(clientHour!) ? undefined : clientHour,
        timezone: clientTz
      }
    };

    const result: GreetingResult = resolveGreeting(input);
    return res.json(result);
  } catch (error: any) {
    console.error('[Greeting] API error:', error);
    res.status(500).json({ error: 'Failed to construct greeting' });
  }
});
