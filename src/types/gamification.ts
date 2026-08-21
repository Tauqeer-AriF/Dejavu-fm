export interface GamificationSettings {
  xp_daily_login: number;
  xp_listen_10m: number;
  xp_listen_30m: number;
  xp_follow_dj: number;
  xp_join_chat: number;
  xp_chat_message: number;
  xp_song_request: number;
  xp_share_show: number;
  xp_discover_dj: number;
  xp_streak_7d: number;
  chat_xp_cooldown_seconds: number;
  chat_xp_daily_max: number;
  min_listening_seconds_for_streak: number;
  night_owl_start_hour: number;
  night_owl_end_hour: number;
  xp_podcast_play?: number;
}

export interface GamificationLevel {
  level: number;
  title: string;
  min_xp: number;
  icon?: string;
  perks?: string;
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  requirement_type: string;
  unlocked?: boolean;
  unlocked_at?: string;
  progress?: number;
  max_progress?: number;
}

export interface XPTransaction {
  id: number;
  username: string;
  amount: number;
  activity_type: string;
  description: string;
  metadata?: string;
  created_at: string;
}

export interface UserGamificationProfile {
  username: string;
  avatar_url?: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  current_level_min_xp: number;
  next_level_min_xp: number | null;
  xp_in_current_level: number;
  xp_needed_for_next_level: number;
  progress_percentage: number;
  current_streak: number;
  longest_streak: number;
  last_listening_date: string | null;
  qualified_today: boolean;
  today_listening_seconds: number;
  today_listening_minutes: number;
  total_listening_seconds: number;
  total_listening_hours: number;
  show_on_leaderboard: boolean;
  badges: GamificationBadge[];
  recent_transactions: XPTransaction[];
  followed_dj_ids: string[];
  is_admin_or_dj?: boolean;
  role?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url?: string;
  total_xp: number;
  period_xp?: number;
  current_level: number;
  level_title: string;
  current_streak: number;
  badges_count: number;
  is_current_user?: boolean;
}

export interface XPAwardResult {
  success: boolean;
  xp_awarded: number;
  activity_type: string;
  description: string;
  total_xp: number;
  current_level: number;
  level_title: string;
  leveled_up: boolean;
  old_level?: number;
  new_level?: number;
  unlocked_badges: GamificationBadge[];
  streak_milestone?: {
    days: number;
    bonus_xp: number;
  };
}
