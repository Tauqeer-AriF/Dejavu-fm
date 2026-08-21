import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolveGreeting, getTimeOfDay, formatDisplayName, formatDjName } from './greetingResolver.ts';

describe('Greeting System - Time of Day Greetings', () => {
  test('Morning greeting (08:00)', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 0, totalListeningSeconds: 500 },
      clientTime: { hour: 8 }
    });
    assert.strictEqual(result.timeOfDay, 'morning');
    assert.strictEqual(result.greeting, 'Good morning, Tauqeer');
  });

  test('Afternoon greeting (14:30)', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 0, totalListeningSeconds: 500 },
      clientTime: { hour: 14 }
    });
    assert.strictEqual(result.timeOfDay, 'afternoon');
    assert.strictEqual(result.greeting, 'Good afternoon, Tauqeer');
  });

  test('Evening greeting (19:15)', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 0, totalListeningSeconds: 500 },
      clientTime: { hour: 19 }
    });
    assert.strictEqual(result.timeOfDay, 'evening');
    assert.strictEqual(result.greeting, 'Good evening, Tauqeer');
  });

  test('Late-night greeting (23:45 and 02:30)', () => {
    const resultNight1 = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 0, totalListeningSeconds: 500 },
      clientTime: { hour: 23 }
    });
    assert.strictEqual(resultNight1.timeOfDay, 'night');
    assert.strictEqual(resultNight1.greeting, 'Good night, Tauqeer');

    const resultNight2 = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 0, totalListeningSeconds: 500 },
      clientTime: { hour: 2 }
    });
    assert.strictEqual(resultNight2.timeOfDay, 'night');
    assert.strictEqual(resultNight2.greeting, 'Good night, Tauqeer');
  });
});

describe('Greeting System - Contextual Messages & Logic', () => {
  test('New user with 0 listens', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer', isNewUser: true },
      gamification: { currentStreak: 0, totalListeningSeconds: 0 },
      clientTime: { hour: 13 }
    });
    assert.strictEqual(result.type, 'new_user');
    assert.strictEqual(result.message, 'Welcome to the party!');
    assert.strictEqual(result.cta.label, 'Listen Now');
    assert.strictEqual(result.secondaryCta?.label, 'Explore Podcasts');
  });

  test('Favorite DJ currently live', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 3, totalListeningSeconds: 3600, followedDjIds: ['dj-alex'] },
      liveShow: {
        djId: 'dj-alex',
        djName: 'Alex',
        showName: 'Pure House Anthems',
        isLive: true
      },
      clientTime: { hour: 15 }
    });
    assert.strictEqual(result.type, 'favorite_dj_live');
    assert.strictEqual(result.message, 'DJ Alex is live on air now');
    assert.strictEqual(result.cta.label, 'Listen Now');
  });

  test('Active streak (e.g. 5 days)', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 5, totalListeningSeconds: 7200, followedDjIds: [] },
      clientTime: { hour: 10 }
    });
    assert.strictEqual(result.type, 'streak');
    assert.strictEqual(result.message, 'You are on a 5-day listening streak');
    assert.strictEqual(result.cta.label, 'Keep Listening');
  });

  test('Close to streak milestone (6 days towards 7-day milestone)', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 6, totalListeningSeconds: 8000 },
      clientTime: { hour: 16 }
    });
    assert.strictEqual(result.type, 'streak_milestone_near');
    assert.strictEqual(result.message, 'One more day to reach your 7-day streak!');
    assert.strictEqual(result.cta.label, 'Keep Listening');
  });

  test('User returning after extended absence (> 7 days)', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: eightDaysAgo },
      gamification: { currentStreak: 0, totalListeningSeconds: 3000, lastListeningDate: eightDaysAgo },
      clientTime: { hour: 12 }
    });
    assert.strictEqual(result.type, 'extended_absence');
    assert.strictEqual(result.message, 'Welcome back, we missed you');
    assert.strictEqual(result.cta.label, 'Listen Now');
    assert.strictEqual(result.secondaryCta?.label, 'Explore Podcasts');
  });

  test('Personalized favorite genre recommendation', () => {
    const recentDate = new Date().toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: recentDate },
      gamification: { currentStreak: 0, totalListeningSeconds: 2000, lastListeningDate: recentDate },
      userPreferences: { favoriteGenre: 'House' },
      clientTime: { hour: 14 }
    });
    assert.strictEqual(result.type, 'genre_recommendation');
    assert.strictEqual(result.message, 'Ready for some House music?');
    assert.strictEqual(result.cta.label, 'Listen Now');
  });

  test('Generic returning user', () => {
    const recentDate = new Date().toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: recentDate },
      gamification: { currentStreak: 0, totalListeningSeconds: 1500, lastListeningDate: recentDate },
      clientTime: { hour: 14 }
    });
    assert.strictEqual(result.type, 'returning_user');
    assert.strictEqual(result.message, 'Welcome back! Ready for some music?');
    assert.strictEqual(result.cta.label, 'Listen Now');
  });

  test('Fallback greeting with no personal context', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: null,
      clientTime: { hour: 14 }
    }, {
      // In default config, zero listening seconds triggers new user. If we specify user has non-zero history but no signals:
      newUserMaxListenSeconds: -1
    });
    // With no signals and non-new user:
    assert.ok(result.message.length > 0);
  });

  test('Guest unauthenticated user', () => {
    const result = resolveGreeting({
      user: null,
      clientTime: { hour: 10 }
    });
    assert.strictEqual(result.isAuthenticated, false);
    assert.strictEqual(result.type, 'guest');
    assert.strictEqual(result.greeting, 'Welcome to Dejavu FM');
    assert.strictEqual(result.cta.label, 'Listen Now');
  });
});

describe('Greeting System - Priority Hierarchy', () => {
  test('Priority 1: New user takes precedence over other states', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer', isNewUser: true },
      gamification: { currentStreak: 0, totalListeningSeconds: 0, followedDjIds: ['dj-1'] },
      liveShow: { djId: 'dj-1', djName: 'Alex', isLive: true },
      userPreferences: { favoriteGenre: 'House' }
    });
    assert.strictEqual(result.type, 'new_user');
    assert.strictEqual(result.priority, 1);
  });

  test('Priority 2: Favorite DJ live takes precedence over active streak and genre', () => {
    const result = resolveGreeting({
      user: { username: 'Tauqeer' },
      gamification: { currentStreak: 5, totalListeningSeconds: 5000, followedDjIds: ['dj-1'] },
      liveShow: { djId: 'dj-1', djName: 'Alex', isLive: true },
      userPreferences: { favoriteGenre: 'House' }
    });
    assert.strictEqual(result.type, 'favorite_dj_live');
    assert.strictEqual(result.priority, 2);
  });

  test('Priority 3: Active streak takes precedence over extended absence and genre', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: eightDaysAgo },
      gamification: { currentStreak: 4, totalListeningSeconds: 5000, followedDjIds: [] },
      userPreferences: { favoriteGenre: 'House' }
    });
    assert.strictEqual(result.type, 'streak');
    assert.strictEqual(result.priority, 3);
  });

  test('Priority 4: Extended absence takes precedence over genre recommendation', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: tenDaysAgo },
      gamification: { currentStreak: 0, totalListeningSeconds: 5000, lastListeningDate: tenDaysAgo },
      userPreferences: { favoriteGenre: 'Garage' }
    });
    assert.strictEqual(result.type, 'extended_absence');
    assert.strictEqual(result.priority, 4);
  });

  test('Priority 5: Genre recommendation takes precedence over generic returning user', () => {
    const recentDate = new Date().toISOString();
    const result = resolveGreeting({
      user: { username: 'Tauqeer', lastSeen: recentDate },
      gamification: { currentStreak: 0, totalListeningSeconds: 5000, lastListeningDate: recentDate },
      userPreferences: { favoriteGenre: 'Jungle' }
    });
    assert.strictEqual(result.type, 'genre_recommendation');
    assert.strictEqual(result.priority, 5);
  });
});

describe('Greeting System - Sanitization & Helper Edge Cases', () => {
  test('Sanitizes HTML tags in display name', () => {
    assert.strictEqual(formatDisplayName('<script>alert(1)</script>Tauqeer'), 'Tauqeer');
    assert.strictEqual(formatDisplayName('<b>Marcus</b>'), 'Marcus');
    assert.strictEqual(formatDisplayName(''), 'Listener');
    assert.strictEqual(formatDisplayName(undefined), 'Listener');
  });

  test('Capitalizes all-lowercase names', () => {
    assert.strictEqual(formatDisplayName('tauqeer'), 'Tauqeer');
    assert.strictEqual(formatDisplayName('dejavu_fan'), 'Dejavu_fan');
  });

  test('Formats DJ names correctly without redundant prefixes', () => {
    assert.strictEqual(formatDjName('Alex'), 'DJ Alex');
    assert.strictEqual(formatDjName('DJ Spoony'), 'DJ Spoony');
    assert.strictEqual(formatDjName('MC Creed'), 'MC Creed');
    assert.strictEqual(formatDjName(''), 'Resident DJ');
  });

  test('Gracefully handles user with null or undefined gamification profile without throwing', () => {
    const result = resolveGreeting({
      user: { username: 'Newbie' },
      gamification: undefined,
      liveShow: { isLive: false }
    });
    assert.ok(result);
    assert.strictEqual(result.isAuthenticated, true);
    assert.strictEqual(result.username, 'Newbie');
  });
});
