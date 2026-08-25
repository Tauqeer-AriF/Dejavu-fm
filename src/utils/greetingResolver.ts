import { DEFAULT_GREETING_CONFIG, GreetingConfig } from '../config/greetingConfig.ts';
import {
  GreetingContextInput,
  GreetingMessageType,
  GreetingResult,
  TimeOfDay
} from '../types/greeting.ts';

/**
 * Cleanly format and sanitize a display name for the listener
 */
export function formatDisplayName(rawName?: string): string {
  if (!rawName) return 'Listener';
  let trimmed = rawName.trim();
  if (!trimmed) return 'Listener';

  // Sanitize script/style content and HTML tags defensively
  trimmed = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  trimmed = trimmed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  const sanitized = trimmed.replace(/<[^>]*>?/gm, '').trim();
  if (!sanitized) return 'Listener';

  // Capitalize first letter if all lowercase
  if (sanitized === sanitized.toLowerCase()) {
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }
  return sanitized;
}

/**
 * Format DJ name to ensure consistent "DJ [Name]" representation unless already prefixed
 */
export function formatDjName(rawDjName?: string): string {
  if (!rawDjName) return 'Resident DJ';
  const trimmed = rawDjName.trim();
  if (!trimmed) return 'Resident DJ';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('dj ') || lower.startsWith('mc ') || lower.startsWith('dj-') || lower.startsWith('selector ')) {
    return trimmed;
  }
  return `DJ ${trimmed}`;
}

/**
 * Determine TimeOfDay ('morning' | 'afternoon' | 'evening' | 'night')
 */
export function getTimeOfDay(hour: number, config: GreetingConfig = DEFAULT_GREETING_CONFIG): TimeOfDay {
  const { morning, afternoon, evening } = config.timeRanges;

  if (hour >= morning.start && hour < morning.end) {
    return 'morning';
  }
  if (hour >= afternoon.start && hour < afternoon.end) {
    return 'afternoon';
  }
  if (hour >= evening.start && hour < evening.end) {
    return 'evening';
  }
  return 'night';
}

/**
 * Resolve local hour from client input, timezone, or Date
 */
export function resolveHour(clientTime?: GreetingContextInput['clientTime'], defaultTz: string = DEFAULT_GREETING_CONFIG.defaultTimezone): number {
  if (clientTime?.hour !== undefined && !isNaN(clientTime.hour)) {
    return ((Math.floor(clientTime.hour) % 24) + 24) % 24;
  }

  const baseDate = clientTime?.date instanceof Date ? clientTime.date : new Date();
  const tz = clientTime?.timezone || defaultTz;

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false
    });
    const hourStr = formatter.format(baseDate);
    const parsed = parseInt(hourStr, 10);
    return isNaN(parsed) ? baseDate.getHours() : parsed;
  } catch (e) {
    return baseDate.getHours();
  }
}

/**
 * Calculates number of days between a given date string and now
 */
export function getDaysSinceDate(dateStr?: string | null, referenceDate: Date = new Date()): number | null {
  if (!dateStr) return null;
  try {
    const past = new Date(dateStr);
    if (isNaN(past.getTime())) return null;

    const diffMs = referenceDate.getTime() - past.getTime();
    if (diffMs < 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Pure, deterministic greeting resolver evaluating user context against priority rules
 */
export function resolveGreeting(
  input: GreetingContextInput,
  customConfig?: Partial<GreetingConfig>
): GreetingResult {
  const config: GreetingConfig = {
    ...DEFAULT_GREETING_CONFIG,
    ...customConfig,
    timeRanges: {
      ...DEFAULT_GREETING_CONFIG.timeRanges,
      ...(customConfig?.timeRanges || {})
    },
    templates: {
      ...DEFAULT_GREETING_CONFIG.templates,
      ...(customConfig?.templates || {}),
      messages: {
        ...DEFAULT_GREETING_CONFIG.templates.messages,
        ...(customConfig?.templates?.messages || {})
      },
      ctas: {
        ...DEFAULT_GREETING_CONFIG.templates.ctas,
        ...(customConfig?.templates?.ctas || {})
      },
      timeGreetings: {
        ...DEFAULT_GREETING_CONFIG.templates.timeGreetings,
        ...(customConfig?.templates?.timeGreetings || {})
      }
    }
  };

  const hour = resolveHour(input.clientTime, config.defaultTimezone);
  const timeOfDay = getTimeOfDay(hour, config);
  const user = input.user;
  const isAuthenticated = !!(user && user.username && user.username.trim() !== '');

  // ----------------------------------------------------
  // GUEST USER RESOLUTION
  // ----------------------------------------------------
  if (!isAuthenticated) {
    const isLive = input.liveShow?.isLive;
    const djName = input.liveShow?.djName;

    return {
      isAuthenticated: false,
      displayName: 'Guest',
      timeOfDay,
      greeting: config.templates.guestGreeting,
      type: 'guest',
      message: isLive && djName
        ? `${formatDjName(djName)} is LIVE on air now`
        : config.templates.messages.guest,
      icon: 'Headphones',
      badgeText: isLive ? 'LIVE NOW' : '24/7 STATION',
      badgeType: isLive ? 'live' : 'music',
      supportingInfo: input.liveShow?.showName || 'London Underground Radio',
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.explorePodcasts,
        action: 'navigate',
        url: '/podcasts',
        icon: 'Radio'
      },
      priority: 99
    };
  }

  // Authenticated listener
  const displayName = formatDisplayName(user?.displayName || user?.username);
  const timeGreetingTemplate = config.templates.timeGreetings[timeOfDay] || 'Hello, {name}';
  const greeting = timeGreetingTemplate.replace('{name}', displayName);

  const gamification = input.gamification;
  const streak = gamification?.currentStreak || 0;
  const totalListeningSeconds = gamification?.totalListeningSeconds || 0;
  const liveShow = input.liveShow;
  const followedDjIds = gamification?.followedDjIds || [];
  const topDjNames = input.userPreferences?.topDjNames || [];
  const favoriteGenre = input.userPreferences?.favoriteGenre || (input.userPreferences?.topGenres && input.userPreferences.topGenres[0]);

  // ----------------------------------------------------
  // CONTEXT EVALUATORS (Calculated upfront)
  // ----------------------------------------------------

  // 1. Is New User?
  const isExplicitNewUser = user?.isNewUser === true;
  const isZeroListensNewUser = totalListeningSeconds <= config.newUserMaxListenSeconds && streak === 0;
  const isNewUserCondition = isExplicitNewUser || isZeroListensNewUser;

  // 2. Favorite DJ Currently Live?
  let isFavoriteDjLive = false;
  let liveFavDjName = '';
  if (liveShow && liveShow.isLive && liveShow.djName) {
    const isFollowedById = liveShow.djId && followedDjIds.includes(liveShow.djId);
    const currentDjLower = liveShow.djName.toLowerCase().trim();
    const isFollowedByName = topDjNames.some(name => name.toLowerCase().trim() === currentDjLower);
    const hasFollowedDjsLiveList = input.userPreferences?.followedDjsLive && input.userPreferences.followedDjsLive.length > 0;

    if (isFollowedById || isFollowedByName || hasFollowedDjsLiveList) {
      isFavoriteDjLive = true;
      liveFavDjName = formatDjName(liveShow.djName);
    }
  }

  // 3. Active Streak or Milestone Near?
  let isMilestoneNear = false;
  let targetMilestone = 0;
  if (streak > 0) {
    for (const milestone of config.streakMilestones) {
      if (streak === milestone - 1) {
        isMilestoneNear = true;
        targetMilestone = milestone;
        break;
      }
    }
  }
  const isActiveStreakCondition = streak >= 2 || (streak === 1 && totalListeningSeconds > 300);

  // 4. Extended Absence?
  let isExtendedAbsence = false;
  const daysSinceListen = getDaysSinceDate(gamification?.lastListeningDate);
  const daysSinceSeen = getDaysSinceDate(user?.lastSeen || user?.lastLogin);
  const effectiveDaysAway = daysSinceListen !== null ? daysSinceListen : daysSinceSeen;
  if (!isNewUserCondition && effectiveDaysAway !== null && effectiveDaysAway >= config.extendedAbsenceDays) {
    isExtendedAbsence = true;
  }

  // 5. Favorite Genre?
  const hasFavoriteGenre = Boolean(favoriteGenre && favoriteGenre.trim().length > 0);

  // 6. Returning User?
  const isReturningUser = !isNewUserCondition && (totalListeningSeconds > config.newUserMaxListenSeconds || streak > 0 || (effectiveDaysAway !== null && effectiveDaysAway < config.extendedAbsenceDays));

  // ----------------------------------------------------
  // PRIORITY SELECTION
  // ----------------------------------------------------

  // Priority 1: New User
  if (isNewUserCondition) {
    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'new_user',
      message: config.templates.messages.newUser,
      icon: 'Sparkles',
      badgeText: 'Welcome Listener',
      badgeType: 'welcome',
      supportingInfo: 'Tune in to live underground DJs & start your listening streak',
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.explorePodcasts,
        action: 'navigate',
        url: '/podcasts',
        icon: 'Radio'
      },
      streak: 0,
      priority: 1
    };
  }

  // Priority 2: Favorite DJ Currently Live
  if (isFavoriteDjLive) {
    const rawTemplate = config.templates.messages.favoriteDjLive;
    const message = rawTemplate.replace('{djName}', liveFavDjName);

    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'favorite_dj_live',
      message,
      icon: 'Headphones',
      badgeText: 'Favourite DJ LIVE',
      badgeType: 'live',
      supportingInfo: liveShow?.showName || 'Broadcasting Live',
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: liveShow?.djId ? {
        label: 'View DJ Profile',
        action: 'navigate',
        url: `/djs/${liveShow.djId}`,
        icon: 'User'
      } : undefined,
      liveDj: {
        id: liveShow?.djId,
        name: liveShow?.djName,
        showName: liveShow?.showName
      },
      streak,
      priority: 2
    };
  }

  // Priority 3: Active Streak / Milestone Near
  if (isMilestoneNear && targetMilestone > 0) {
    const message = config.templates.messages.streakMilestoneNear.replace('{milestone}', String(targetMilestone));
    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'streak_milestone_near',
      message,
      icon: 'Flame',
      badgeText: `1 Day to ${targetMilestone}D Milestone`,
      badgeType: 'streak',
      supportingInfo: `Keep your ${streak}-day listening streak going`,
      cta: {
        label: config.templates.ctas.keepListening,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.openHub,
        action: 'open_hub',
        icon: 'Trophy'
      },
      streak,
      priority: 3
    };
  }

  if (isActiveStreakCondition) {
    const message = config.templates.messages.streakActive.replace('{streak}', String(streak));
    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'streak',
      message,
      icon: 'Flame',
      badgeText: `${streak}-Day Streak`,
      badgeType: 'streak',
      supportingInfo: gamification?.qualifiedToday ? "Today's streak session validated" : 'Listen for 10 mins to qualify today',
      cta: {
        label: config.templates.ctas.keepListening,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.openHub,
        action: 'open_hub',
        icon: 'Trophy'
      },
      streak,
      priority: 3
    };
  }

  // Priority 4: User Returning After Extended Absence
  if (isExtendedAbsence) {
    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'extended_absence',
      message: config.templates.messages.extendedAbsence,
      icon: 'Clock',
      badgeText: 'Welcome Back',
      badgeType: 'welcome',
      supportingInfo: liveShow?.djName ? `${formatDjName(liveShow.djName)} is currently on air` : 'Check what is live on dejavufm',
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.explorePodcasts,
        action: 'navigate',
        url: '/podcasts',
        icon: 'Radio'
      },
      streak,
      priority: 4
    };
  }

  // Priority 5: Favorite Genre Personalization
  if (hasFavoriteGenre && favoriteGenre) {
    const message = config.templates.messages.genreRecommendation.replace('{genre}', favoriteGenre);
    const exploreGenreLabel = config.templates.ctas.exploreGenre.replace('{genre}', favoriteGenre);

    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'genre_recommendation',
      message,
      icon: 'Music',
      badgeText: `${favoriteGenre} Vibes`,
      badgeType: 'music',
      supportingInfo: `Curated for your ${favoriteGenre} taste`,
      genre: favoriteGenre,
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: exploreGenreLabel,
        action: 'navigate',
        url: `/djs?search=${encodeURIComponent(favoriteGenre)}`,
        icon: 'Disc'
      },
      streak,
      priority: 5
    };
  }

  // Priority 6: Generic Returning User
  if (isReturningUser) {
    return {
      isAuthenticated: true,
      username: user?.username,
      displayName,
      timeOfDay,
      greeting,
      type: 'returning_user',
      message: config.templates.messages.returningUser,
      icon: 'Sparkles',
      badgeText: gamification?.levelTitle ? `Level ${gamification.currentLevel || 1} • ${gamification.levelTitle}` : 'Community Listener',
      badgeType: 'vip',
      supportingInfo: liveShow?.djName ? `On Air: ${formatDjName(liveShow.djName)} - ${liveShow.showName || 'Live'}` : 'Underground Radio 24/7',
      cta: {
        label: config.templates.ctas.listenNow,
        action: 'play_live',
        url: '/live',
        icon: 'Play'
      },
      secondaryCta: {
        label: config.templates.ctas.explorePodcasts,
        action: 'navigate',
        url: '/podcasts',
        icon: 'Radio'
      },
      streak,
      priority: 6
    };
  }

  // Priority 7: Fallback
  return {
    isAuthenticated: true,
    username: user?.username,
    displayName,
    timeOfDay,
    greeting,
    type: 'fallback',
    message: config.templates.messages.fallback,
    icon: 'Radio',
    badgeText: 'dejavufm',
    badgeType: 'music',
    supportingInfo: liveShow?.showName || 'London Underground Music',
    cta: {
      label: config.templates.ctas.listenNow,
      action: 'play_live',
      url: '/live',
      icon: 'Play'
    },
    secondaryCta: {
      label: config.templates.ctas.explorePodcasts,
      action: 'navigate',
      url: '/podcasts',
      icon: 'Radio'
    },
    streak,
    priority: 7
  };
}
