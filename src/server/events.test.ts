import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { db } from './db.ts';
import { seedSampleEventsIfEmpty } from './events.db.ts';
import {
  createEvent,
  updateEvent,
  getEvents,
  getEventBySlugOrId,
  toggleEventReminder,
  processEventListeningHeartbeat,
  getEventAnalytics
} from './events.service.ts';

describe('Special Events System Unit & Integration Tests', () => {
  before(() => {
    // Seed sample data cleanly
    seedSampleEventsIfEmpty(db, true);
  });

  it('1. Event Creation & Publishing', () => {
    const newEvent = createEvent({
      title: 'Automated Test Sunset Rave 2026',
      short_description: 'An automated test event for special broadcasts.',
      description: 'Full details of automated test event.',
      cover_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
      start_time: '2026-09-01T20:00:00Z',
      end_time: '2026-09-02T02:00:00Z',
      timezone: 'Europe/London',
      status: 'scheduled',
      is_featured: true,
      genres: ['House', 'Techno'],
      xp_multiplier: 2.0,
      badge_name: 'Sunset Rave Pioneer',
      badge_listen_minutes: 15,
      sessions: [
        {
          dj_id: 'dj_1',
          dj_name: 'DJ Alex',
          session_title: 'Opening Tech Set',
          genre: 'House',
          start_time: '2026-09-01T20:00:00Z',
          end_time: '2026-09-01T23:00:00Z',
          display_order: 1
        },
        {
          dj_id: 'dj_2',
          dj_name: 'DJ Sarah',
          session_title: 'Peak Time Deep House',
          genre: 'Deep House',
          start_time: '2026-09-01T23:00:00Z',
          end_time: '2026-09-02T02:00:00Z',
          display_order: 2
        }
      ]
    });

    assert.ok(newEvent.id.startsWith('evt_'));
    assert.strictEqual(newEvent.title, 'Automated Test Sunset Rave 2026');
    assert.strictEqual(newEvent.status, 'scheduled');
    assert.strictEqual(newEvent.is_featured, true);
    assert.strictEqual(newEvent.xp_multiplier, 2.0);
    assert.strictEqual(newEvent.sessions.length, 2);
    assert.strictEqual(newEvent.sessions[0].dj_name, 'DJ Alex');
  });

  it('2. Event Retrieval & Timezone / Countdown state calculation', () => {
    const events = getEvents({ status: 'scheduled' });
    assert.ok(events.length > 0);

    const target = events.find(e => e.title === 'Automated Test Sunset Rave 2026');
    assert.ok(target);
    assert.strictEqual(target?.timezone, 'Europe/London');

    const fetchedBySlug = getEventBySlugOrId(target!.slug);
    assert.ok(fetchedBySlug);
    assert.strictEqual(fetchedBySlug?.id, target!.id);
  });

  it('3. Multiple DJ Sessions & Schedule structure', () => {
    const events = getEvents();
    const target = events.find(e => e.title === 'Automated Test Sunset Rave 2026');
    assert.ok(target);
    assert.ok(target!.sessions.length >= 2);
    assert.strictEqual(target!.sessions[0].session_title, 'Opening Tech Set');
    assert.strictEqual(target!.sessions[1].session_title, 'Peak Time Deep House');
  });

  it('4. Event Going Live & Status Transitions', () => {
    // Create an active live event
    const now = new Date();
    const pastStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const futureEnd = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

    const liveEvt = createEvent({
      title: 'Active Live Test Party',
      start_time: pastStart,
      end_time: futureEnd,
      timezone: 'Europe/London',
      status: 'scheduled', // Will be calculated dynamically as live
      sessions: [
        {
          dj_name: 'DJ Live Master',
          session_title: 'Live Prime Set',
          genre: 'EDM',
          start_time: pastStart,
          end_time: futureEnd,
          display_order: 1
        }
      ]
    });

    const refreshed = getEventBySlugOrId(liveEvt.id);
    assert.strictEqual(refreshed?.status, 'live');
    assert.ok(refreshed?.current_session);
    assert.strictEqual(refreshed?.current_session?.dj_name, 'DJ Live Master');
  });

  it('5. Reminder Creation & Duplicate Prevention', () => {
    const events = getEvents();
    const evtId = events[0].id;
    const testUsername = 'testuser_reminder_check';

    // Set reminder (Toggle ON)
    const res1 = toggleEventReminder(evtId, testUsername, ['24h', '1h']);
    assert.strictEqual(res1.success, true);
    assert.deepStrictEqual(res1.activeIntervals, ['24h', '1h']);

    // Verify event object reflects active reminder
    const fetched = getEventBySlugOrId(evtId, testUsername);
    assert.strictEqual(fetched?.user_has_reminder, true);
    assert.ok(fetched?.reminders_count && fetched.reminders_count >= 1);

    // Toggle OFF by calling with same intervals
    const res2 = toggleEventReminder(evtId, testUsername, ['24h', '1h']);
    assert.strictEqual(res2.success, true);
    assert.deepStrictEqual(res2.activeIntervals, []);

    // Verify event object reflects reminder removed
    const fetchedOff = getEventBySlugOrId(evtId, testUsername);
    assert.strictEqual(fetchedOff?.user_has_reminder, false);
  });

  it('6. XP Rewards & Badge Unlocking through Heartbeat', () => {
    const now = new Date();
    const pastStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const rewardEvt = createEvent({
      title: 'XP and Badge Test Event',
      start_time: pastStart,
      end_time: futureEnd,
      status: 'scheduled',
      xp_multiplier: 3.0,
      badge_name: 'Test Achievement Badge',
      badge_description: 'Awarded for test listening',
      badge_listen_minutes: 1 // 1 minute required
    });

    const testUser = 'xp_test_user_99';

    // Heartbeat 1 (30 seconds)
    const hb1 = processEventListeningHeartbeat(rewardEvt.id, testUser, 30);
    assert.ok(hb1.xp_awarded > 0);
    assert.strictEqual(hb1.total_listening_seconds, 30);
    assert.strictEqual(hb1.badge_unlocked, false);

    // Heartbeat 2 (30 seconds -> Total 60 seconds = 1 minute threshold)
    const hb2 = processEventListeningHeartbeat(rewardEvt.id, testUser, 30);
    assert.ok(hb2.xp_awarded > 0);
    assert.strictEqual(hb2.total_listening_seconds, 60);
    assert.strictEqual(hb2.badge_unlocked, true);
    assert.strictEqual(hb2.badge_details?.name, 'Test Achievement Badge');
  });

  it('7. Event Completion & Cancellation', () => {
    const events = getEvents();
    const target = events[0];

    // Update status to completed
    const updated = updateEvent(target.id, { status: 'completed' });
    assert.strictEqual(updated.status, 'completed');

    // Update status to cancelled
    const cancelled = updateEvent(target.id, { status: 'cancelled' });
    assert.strictEqual(cancelled.status, 'cancelled');
  });

  it('8. Event Analytics Retrieval', () => {
    const events = getEvents();
    const target = events[0];

    const analytics = getEventAnalytics(target.id);
    assert.ok(analytics);
    assert.strictEqual(typeof analytics.reminders_count, 'number');
    assert.strictEqual(typeof analytics.attended_count, 'number');
  });
});
