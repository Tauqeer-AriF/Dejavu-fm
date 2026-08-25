import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.ts';
import {
  getUserGamificationProfile,
  processListeningHeartbeat,
  awardXP,
  toggleFollowDJ,
  updateLeaderboardPrivacy,
  getLeaderboard,
  getGamificationSettings,
  getGamificationLevels,
  getGamificationAdminOverview,
  ensureUserGamification,
  isStaffOrAdmin
} from './gamification.service.ts';

export const gamificationRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret_123456789';

// Middleware to extract authenticated listener or admin
export function getAuthenticatedUser(req: any): { username: string; role?: string; is_admin?: boolean } | null {
  const authHeader = req.headers?.authorization;
  let bearerToken: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const raw = authHeader.substring(7).trim();
    if (raw && raw !== 'null' && raw !== 'undefined') {
      bearerToken = raw;
    }
  }

  const token = req.cookies?.user_token || req.cookies?.admin_token || bearerToken;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.username) {
      let dbRole = decoded.role;
      let dbIsAdmin = Boolean(decoded.isAdmin || decoded.is_admin);

      try {
        const userCheck = db.prepare('SELECT role, is_admin, is_banned FROM users WHERE LOWER(username) = ?').get(decoded.username.toLowerCase()) as any;
        if (userCheck) {
          if (userCheck.is_banned) {
            return null;
          }
          if (userCheck.role) dbRole = userCheck.role;
          if (userCheck.is_admin === 1) dbIsAdmin = true;
        }
      } catch (dbErr) {
        // Ignore DB query errors
      }

      const isStaffOrAdmin = Boolean(
        dbIsAdmin ||
        decoded.isAdmin ||
        decoded.is_admin ||
        dbRole === 'admin' ||
        dbRole === 'owner' ||
        dbRole === 'dj'
      );

      return {
        username: decoded.username,
        role: dbRole || (isStaffOrAdmin ? 'admin' : 'listener'),
        is_admin: isStaffOrAdmin
      };
    }
  } catch (err) {
    // Invalid token
  }

  return null;
}

// User auth middleware
function requireUserAuth(req: any, res: any, next: any) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in to participate in gamification' });
  }
  req.authenticatedUser = user;
  next();
}

// Staff / Admin auth middleware
function requireStaffAuth(req: any, res: any, next: any) {
  const user = getAuthenticatedUser(req);
  if (!user || (!user.is_admin && user.role !== 'admin' && user.role !== 'dj')) {
    return res.status(403).json({ error: 'Forbidden: Staff or Administrator permissions required' });
  }
  req.authenticatedUser = user;
  next();
}

// ----------------------------------------------------
// Public & Listener Endpoints
// ----------------------------------------------------

// Get current user's full gamification profile
gamificationRouter.get('/public/gamification/profile', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    if (isStaffOrAdmin(username) || req.authenticatedUser.is_admin) {
      return res.json({ is_admin_or_dj: true, profile: null });
    }
    const profile = getUserGamificationProfile(username);
    if (!profile) {
      return res.status(404).json({ error: 'Gamification profile not found' });
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// View public profile of a user
gamificationRouter.get('/public/gamification/user/:username', (req: any, res: any) => {
  try {
    const username = req.params.username;
    const profile = getUserGamificationProfile(username);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authUser = getAuthenticatedUser(req);
    const isSelf = authUser && authUser.username.toLowerCase() === username.toLowerCase();

    // Respect privacy if user opted out and requester is not self
    if (!profile.show_on_leaderboard && !isSelf) {
      return res.json({
        username: 'Anonymous Listener',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=anonymous',
        current_level: profile.current_level,
        level_title: profile.level_title,
        badges_count: profile.badges.filter(b => b.unlocked).length,
        show_on_leaderboard: false
      });
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listening heartbeat
gamificationRouter.post('/public/gamification/heartbeat', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const { durationSeconds, isPlaying, djName, showName, trackTitle, tabId } = req.body;

    const result = processListeningHeartbeat(username, {
      durationSeconds: Number(durationSeconds) || 60,
      isPlaying: isPlaying !== false,
      djName,
      showName,
      trackTitle,
      tabId
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Claim daily login bonus
gamificationRouter.post('/public/gamification/daily-login', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const result = awardXP(username, 'daily_login', 'Daily listener check-in bonus');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Claim share show bonus
gamificationRouter.post('/public/gamification/share', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const { showName, url } = req.body;
    const result = awardXP(username, 'share_show', `Shared live show ${showName || 'dejavufm'}`, { showName, url });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Claim join chat bonus
gamificationRouter.post('/public/gamification/join-chat', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const result = awardXP(username, 'join_chat', 'Joined the live chat room');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Follow / Unfollow DJ
gamificationRouter.post('/public/gamification/follow-dj/:djId', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const { djId } = req.params;
    const result = toggleFollowDJ(username, djId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get followed DJs
gamificationRouter.get('/public/gamification/followed-djs', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const rows = db.prepare('SELECT dj_id, created_at FROM user_dj_follows WHERE LOWER(username) = ?').all(username.toLowerCase()) as any[];
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update privacy settings (show on leaderboard)
gamificationRouter.put('/public/gamification/settings/privacy', requireUserAuth, (req: any, res: any) => {
  try {
    const username = req.authenticatedUser.username;
    const { show_on_leaderboard } = req.body;
    const updated = updateLeaderboardPrivacy(username, show_on_leaderboard !== false);
    res.json({ success: updated, show_on_leaderboard: show_on_leaderboard !== false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard endpoint
gamificationRouter.get('/public/gamification/leaderboard', (req: any, res: any) => {
  try {
    const timeframe = (req.query.timeframe as 'weekly' | 'monthly' | 'all_time') || 'all_time';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const authUser = getAuthenticatedUser(req);
    const entries = getLeaderboard(timeframe, authUser?.username, limit);
    res.json({ timeframe, entries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get badges list
gamificationRouter.get('/public/gamification/badges', (req: any, res: any) => {
  try {
    const badges = db.prepare('SELECT * FROM gamification_badges ORDER BY requirement ASC').all();
    res.json(badges);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get levels list
gamificationRouter.get('/public/gamification/levels', (req: any, res: any) => {
  try {
    const levels = getGamificationLevels();
    res.json(levels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get settings
gamificationRouter.get('/public/gamification/settings', (req: any, res: any) => {
  try {
    const settings = getGamificationSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Admin Management Endpoints
// ----------------------------------------------------

// Admin overview stats
gamificationRouter.get('/admin/gamification/overview', requireStaffAuth, (req: any, res: any) => {
  try {
    const overview = getGamificationAdminOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin get settings
gamificationRouter.get('/admin/gamification/settings', requireStaffAuth, (req: any, res: any) => {
  try {
    const settings = getGamificationSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin update settings
gamificationRouter.post('/admin/gamification/settings', requireStaffAuth, (req: any, res: any) => {
  try {
    const settings = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO gamification_settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      if (typeof v === 'number' || typeof v === 'string') {
        stmt.run(k, String(v));
      }
    }
    res.json({ success: true, settings: getGamificationSettings() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin manual XP grant
gamificationRouter.post('/admin/gamification/grant-xp', requireStaffAuth, (req: any, res: any) => {
  try {
    const { username, amount, reason } = req.body;
    if (!username || !amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Username and numerical amount are required' });
    }
    const result = awardXP(username, 'admin_grant', reason || 'Bonus XP granted by Administrator', { granted_by: req.authenticatedUser.username }, Number(amount));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin reset user gamification
gamificationRouter.post('/admin/gamification/reset-user', requireStaffAuth, (req: any, res: any) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    db.prepare('DELETE FROM xp_transactions WHERE LOWER(username) = ?').run(cleanUsername);
    db.prepare('DELETE FROM user_badges WHERE LOWER(username) = ?').run(cleanUsername);
    db.prepare('DELETE FROM user_dj_listening WHERE LOWER(username) = ?').run(cleanUsername);
    db.prepare(`
      UPDATE user_gamification 
      SET total_xp = 0, current_level = 1, current_streak = 0, longest_streak = 0, 
          today_listening_seconds = 0, total_listening_seconds = 0, last_listening_date = NULL
      WHERE LOWER(username) = ?
    `).run(cleanUsername);

    res.json({ success: true, message: `Reset gamification for user ${username}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
