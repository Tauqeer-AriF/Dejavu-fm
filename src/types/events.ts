export type EventStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface EventSession {
  id: string;
  event_id: string;
  dj_id?: string;
  dj_name: string;
  dj_photo?: string;
  session_title: string;
  genre: string;
  start_time: string; // ISO 8601 string
  end_time: string;   // ISO 8601 string
  display_order: number;
  stream_url?: string;
  is_live?: boolean;
}

export interface SpecialEvent {
  id: string;
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  cover_image?: string;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  timezone: string;
  status: EventStatus;
  is_featured: boolean;
  genres: string[];
  expected_audience?: number;
  xp_multiplier: number;
  event_xp_bonus: number;
  badge_id?: string;
  badge_name?: string;
  badge_description?: string;
  badge_icon?: string;
  badge_listen_minutes: number;
  stream_override_url?: string;
  created_at: string;
  updated_at: string;
  
  // Computed / aggregated relations
  sessions?: EventSession[];
  participating_djs?: {
    id: string;
    name: string;
    image_url?: string;
    bio?: string;
    genres?: string[];
  }[];
  current_session?: EventSession | null;
  next_session?: EventSession | null;
  listener_count?: number;
  reminders_count?: number;
  user_has_reminder?: boolean;
  user_reminder_intervals?: string[];
  badge_unlocked_for_user?: boolean;
}

export interface EventReminder {
  id: number;
  event_id: string;
  username: string;
  interval_type: '24h' | '1h' | '15m';
  notified: boolean;
  created_at: string;
}

export interface EventAnalytics {
  event_id: string;
  total_listeners: number;
  peak_concurrent_listeners: number;
  total_listening_seconds: number;
  total_listening_hours: number;
  reminders_count: number;
  attended_count: number;
  new_followers_count: number;
  chat_messages_count: number;
  reactions_count: number;
  most_popular_dj?: {
    dj_name: string;
    listening_seconds: number;
    listeners: number;
  } | null;
  top_sessions?: {
    session_title: string;
    dj_name: string;
    genre: string;
    listeners: number;
    listening_seconds: number;
  }[];
  attendees?: {
    username: string;
    listening_seconds: number;
    badge_awarded: boolean;
    first_attended_at: string;
    last_active_at: string;
  }[];
}
