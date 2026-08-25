import { GreetingMessageType, TimeOfDay } from '../types/greeting.ts';

export interface GreetingConfig {
  timeRanges: {
    morning: { start: number; end: number };   // 5 -> 12 (5:00 - 11:59)
    afternoon: { start: number; end: number }; // 12 -> 17 (12:00 - 16:59)
    evening: { start: number; end: number };   // 17 -> 22 (17:00 - 21:59)
    night: { start: number; end: number };     // 22 -> 5 (22:00 - 4:59)
  };
  extendedAbsenceDays: number;
  newUserMaxListenSeconds: number;
  streakMilestones: number[];
  priority: GreetingMessageType[];
  defaultTimezone: string;
  templates: {
    timeGreetings: Record<TimeOfDay, string>;
    guestGreeting: string;
    messages: {
      newUser: string;
      favoriteDjLive: string;
      streakActive: string;
      streakMilestoneNear: string;
      extendedAbsence: string;
      genreRecommendation: string;
      returningUser: string;
      fallback: string;
      guest: string;
    };
    ctas: {
      listenNow: string;
      keepListening: string;
      exploreLiveDjs: string;
      exploreGenre: string;
      exploreDjs: string;
      explorePodcasts: string;
      signUp: string;
      openHub: string;
    };
  };
}

export const DEFAULT_GREETING_CONFIG: GreetingConfig = {
  timeRanges: {
    morning: { start: 5, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 22 },
    night: { start: 22, end: 5 }
  },
  extendedAbsenceDays: 7,
  newUserMaxListenSeconds: 60, // 0 to 60 seconds counts as new listener
  streakMilestones: [7, 14, 21, 30, 50, 100],
  defaultTimezone: 'Europe/London',
  priority: [
    'new_user',
    'favorite_dj_live',
    'streak',
    'streak_milestone_near',
    'extended_absence',
    'genre_recommendation',
    'returning_user',
    'fallback'
  ],
  templates: {
    timeGreetings: {
      morning: 'Good morning, {name}',
      afternoon: 'Good afternoon, {name}',
      evening: 'Good evening, {name}',
      night: 'Good night, {name}'
    },
    guestGreeting: 'Welcome to dejavufm',
    messages: {
      newUser: 'Welcome to dejavufm',
      favoriteDjLive: '{djName} is live on air now',
      streakActive: 'You are on a {streak}-day listening streak',
      streakMilestoneNear: 'Just one more day to reach your {milestone}-day streak!',
      extendedAbsence: "Welcome back, we've missed you",
      genreRecommendation: 'Fancy some {genre} music?',
      returningUser: 'Welcome back! Ready for some tunes?',
      fallback: 'Discover something new today',
      guest: 'Live underground sets, resident DJ shows & programmes 24/7.'
    },
    ctas: {
      listenNow: 'Listen Now',
      keepListening: 'Keep Listening',
      exploreLiveDjs: 'Explore Live DJs',
      exploreGenre: 'Explore {genre}',
      exploreDjs: 'Explore DJs',
      explorePodcasts: 'Explore Podcasts',
      signUp: 'Sign Up',
      openHub: 'View Rewards'
    }
  }
};
