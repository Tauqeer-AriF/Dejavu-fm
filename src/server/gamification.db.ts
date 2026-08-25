import { GamificationLevel, GamificationBadge, GamificationSettings } from '../types/gamification.ts';

export const DEFAULT_GAMIFICATION_SETTINGS: GamificationSettings = {
  xp_daily_login: 20,
  xp_listen_10m: 10,
  xp_listen_30m: 30,
  xp_follow_dj: 50,
  xp_join_chat: 10,
  xp_chat_message: 5,
  xp_song_request: 20,
  xp_share_show: 25,
  xp_discover_dj: 15,
  xp_streak_7d: 250,
  chat_xp_cooldown_seconds: 60,
  chat_xp_daily_max: 50,
  min_listening_seconds_for_streak: 600, // 10 minutes
  night_owl_start_hour: 0,
  night_owl_end_hour: 5,
  xp_podcast_play: 15
};

export const DEFAULT_LEVELS: GamificationLevel[] = [
  { level: 1, title: 'New Listener', min_xp: 0, icon: 'Headphones', perks: 'Public profile, chat participation' },
  { level: 2, title: 'Regular', min_xp: 100, icon: 'Radio', perks: 'Priority song request queue' },
  { level: 3, title: 'Music Lover', min_xp: 350, icon: 'Heart', perks: 'Exclusive badge highlight in live chat' },
  { level: 4, title: 'Superfan', min_xp: 800, icon: 'Zap', perks: 'Custom neon username glow in live chat' },
  { level: 5, title: 'DJ Legend', min_xp: 1500, icon: 'Flame', perks: 'VIP listener badge & station shoutout perk' },
  { level: 6, title: 'Underground Elite', min_xp: 3000, icon: 'Crown', perks: 'Arch421 priority access & early guestlist' },
  { level: 7, title: 'Dejavu Master', min_xp: 6000, icon: 'Sparkles', perks: 'Hall of Fame legend status & permanent gold badge' }
];

export const DEFAULT_BADGES: GamificationBadge[] = [
  {
    id: 'first_listen',
    name: 'First Listen',
    description: 'Completed your first live radio or podcast listening session',
    icon: 'Headphones',
    requirement: 1,
    requirement_type: 'listen_sessions'
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintained an unbroken 7-day daily listening streak',
    icon: 'Flame',
    requirement: 7,
    requirement_type: 'streak_days'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Tuned in live during midnight hours (00:00 - 05:00 UK time)',
    icon: 'Moon',
    requirement: 1,
    requirement_type: 'listen_night'
  },
  {
    id: 'genre_explorer',
    name: 'Genre Explorer',
    description: 'Discovered and listened to 5 different resident DJs and shows',
    icon: 'Compass',
    requirement: 5,
    requirement_type: 'unique_djs'
  },
  {
    id: 'dj_superfan',
    name: 'DJ Superfan',
    description: 'Followed 5+ resident DJs or listened to a favourite DJ for 20+ sessions',
    icon: 'Heart',
    requirement: 5,
    requirement_type: 'dj_affinity'
  },
  {
    id: 'chatty_listener',
    name: 'Chatty Listener',
    description: 'Actively participated in live chat with 25+ valid messages',
    icon: 'MessageSquare',
    requirement: 25,
    requirement_type: 'chat_messages'
  },
  {
    id: 'global_listener',
    name: 'Global Listener',
    description: 'Tuned in across 10 distinct listening sessions',
    icon: 'Globe',
    requirement: 10,
    requirement_type: 'listen_sessions'
  },
  {
    id: 'song_curator',
    name: 'Song Curator',
    description: 'Submitted 3+ valid track requests to on-air DJs',
    icon: 'Music',
    requirement: 3,
    requirement_type: 'song_requests'
  },
  {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Shared dejavufm live stream with your friends',
    icon: 'Share2',
    requirement: 2,
    requirement_type: 'share_show'
  },
  {
    id: 'podcast_discoverer',
    name: 'Podcast Discoverer',
    description: 'Tuned in to your first podcast episode',
    icon: 'Mic',
    requirement: 1,
    requirement_type: 'podcast_plays'
  },
  {
    id: 'podcast_addict',
    name: 'Podcast Addict',
    description: 'Listened to 5 or more unique podcast episodes',
    icon: 'Radio',
    requirement: 5,
    requirement_type: 'podcast_plays'
  }
];

export function initGamificationDb(database: any) {
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS gamification_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gamification_levels (
        level INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        min_xp INTEGER NOT NULL,
        icon TEXT DEFAULT 'Headphones',
        perks TEXT
      );

      CREATE TABLE IF NOT EXISTS gamification_badges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        requirement INTEGER NOT NULL,
        requirement_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_gamification (
        username TEXT PRIMARY KEY,
        total_xp INTEGER DEFAULT 0,
        current_level INTEGER DEFAULT 1,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_listening_date TEXT,
        today_listening_seconds INTEGER DEFAULT 0,
        today_date TEXT,
        total_listening_seconds INTEGER DEFAULT 0,
        show_on_leaderboard INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username, badge_id)
      );

      CREATE TABLE IF NOT EXISTS xp_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        amount INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_dj_follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        dj_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(username, dj_id)
      );

      CREATE TABLE IF NOT EXISTS user_dj_listening (
        username TEXT NOT NULL,
        dj_name TEXT NOT NULL,
        total_seconds INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        last_listened DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(username, dj_name)
      );

      CREATE INDEX IF NOT EXISTS idx_xp_transactions_username ON xp_transactions(username);
      CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON xp_transactions(activity_type);
      CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(username);
      CREATE INDEX IF NOT EXISTS idx_user_gamification_xp ON user_gamification(total_xp DESC);
      CREATE INDEX IF NOT EXISTS idx_user_dj_follows_user ON user_dj_follows(username);
      CREATE INDEX IF NOT EXISTS idx_user_dj_follows_dj ON user_dj_follows(dj_id);
    `);

    // Seed default settings if missing
    const insertSettingStmt = database.prepare(`INSERT OR IGNORE INTO gamification_settings (key, value) VALUES (?, ?)`);
    for (const [key, val] of Object.entries(DEFAULT_GAMIFICATION_SETTINGS)) {
      insertSettingStmt.run(key, String(val));
    }

    // Seed default levels if missing
    const insertLevelStmt = database.prepare(`
      INSERT OR REPLACE INTO gamification_levels (level, title, min_xp, icon, perks)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const lvl of DEFAULT_LEVELS) {
      insertLevelStmt.run(lvl.level, lvl.title, lvl.min_xp, lvl.icon || 'Headphones', lvl.perks || '');
    }

    // Seed default badges if missing
    const insertBadgeStmt = database.prepare(`
      INSERT OR REPLACE INTO gamification_badges (id, name, description, icon, requirement, requirement_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const b of DEFAULT_BADGES) {
      insertBadgeStmt.run(b.id, b.name, b.description, b.icon, b.requirement, b.requirement_type);
    }

    console.log('[DB] Gamification tables initialized and seeded successfully.');
  } catch (err) {
    console.error('[DB] Failed to initialize gamification tables:', err);
    throw err;
  }
}
