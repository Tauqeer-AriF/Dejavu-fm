export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type GreetingMessageType = 
  | 'new_user'
  | 'favorite_dj_live'
  | 'streak'
  | 'streak_milestone_near'
  | 'extended_absence'
  | 'genre_recommendation'
  | 'returning_user'
  | 'fallback'
  | 'guest';

export interface GreetingCTA {
  label: string;
  action: 'play_live' | 'navigate' | 'open_hub' | 'open_auth';
  url?: string;
  icon?: string;
}

export interface GreetingContextInput {
  user?: {
    username: string;
    displayName?: string;
    createdAt?: string;
    lastLogin?: string;
    lastSeen?: string;
    isNewUser?: boolean;
    timezone?: string;
    role?: string;
    isAdmin?: boolean;
  } | null;
  gamification?: {
    currentStreak: number;
    longestStreak?: number;
    lastListeningDate?: string | null;
    todayListeningSeconds?: number;
    totalListeningSeconds?: number;
    qualifiedToday?: boolean;
    followedDjIds?: string[];
    totalXp?: number;
    currentLevel?: number;
    levelTitle?: string;
  } | null;
  liveShow?: {
    djId?: string;
    djName?: string;
    showName?: string;
    djPhoto?: string;
    isLive: boolean;
    startTime?: string;
    endTime?: string;
  } | null;
  userPreferences?: {
    favoriteGenre?: string;
    topGenres?: string[];
    topDjNames?: string[];
    followedDjsLive?: { id: string; name: string; showName: string }[];
  } | null;
  clientTime?: {
    hour?: number;
    date?: Date;
    timezone?: string;
  };
}

export interface GreetingResult {
  isAuthenticated: boolean;
  username?: string;
  displayName: string;
  timeOfDay: TimeOfDay;
  greeting: string;
  type: GreetingMessageType;
  message: string;
  icon: string;
  badgeText?: string;
  badgeType?: 'live' | 'streak' | 'welcome' | 'music' | 'vip';
  supportingInfo?: string;
  cta: GreetingCTA;
  secondaryCta?: GreetingCTA;
  streak?: number;
  liveDj?: {
    id?: string;
    name?: string;
    showName?: string;
  };
  genre?: string;
  priority: number;
}
