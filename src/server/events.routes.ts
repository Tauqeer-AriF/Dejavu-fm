import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getAuthenticatedUser } from './gamification.routes.ts';
import {
  getEvents,
  getEventBySlugOrId,
  getFeaturedEvent,
  toggleEventReminder,
  processEventListeningHeartbeat,
  createEvent,
  updateEvent,
  deleteEvent,
  setEventStatus,
  getEventAnalytics
} from './events.service.ts';
import { seedSampleEventsIfEmpty } from './events.db.ts';
import { db } from './db.ts';

export const eventsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret_123456789';

// Middleware to check admin / staff permissions
function requireStaffOrAdmin(req: any, res: any, next: any) {
  const user = getAuthenticatedUser(req);
  if (user && (user.is_admin || user.role === 'admin' || user.role === 'owner' || user.role === 'dj')) {
    req.authenticatedUser = user;
    return next();
  }

  // Fallback token authentication
  const authHeader = req.headers?.authorization;
  const rawToken = req.cookies?.admin_token || req.cookies?.user_token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);

  if (rawToken && rawToken !== 'null' && rawToken !== 'undefined') {
    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET) as any;
      if (decoded && decoded.username) {
        req.authenticatedUser = {
          username: decoded.username,
          role: decoded.role || 'admin',
          is_admin: true
        };
        return next();
      }
    } catch (e) {}
  }

  return res.status(403).json({ error: 'Forbidden: Staff or Administrator permissions required' });
}

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

/**
 * GET /api/public/events
 * List events with filtering (type: upcoming | live | past | all, genre, dj_id, featured, etc.)
 */
eventsRouter.get('/public/events', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const filters = {
      status: req.query.status as string | undefined,
      genre: req.query.genre as string | undefined,
      dj_id: req.query.dj_id as string | undefined,
      featured: req.query.featured !== undefined ? req.query.featured === 'true' || req.query.featured === '1' : undefined,
      type: req.query.type as 'upcoming' | 'live' | 'past' | 'all' | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      username: user?.username
    };

    const events = getEvents(filters);
    res.json(events);
  } catch (err: any) {
    console.error('[Events API] Error fetching events:', err);
    res.status(500).json({ error: 'Failed to fetch special events' });
  }
});

/**
 * GET /api/public/events/featured
 * Get currently active live event or next upcoming featured event
 */
eventsRouter.get('/public/events/featured', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const featured = getFeaturedEvent(user?.username);
    res.json({ event: featured });
  } catch (err: any) {
    console.error('[Events API] Error fetching featured event:', err);
    res.status(500).json({ error: 'Failed to fetch featured event' });
  }
});

/**
 * GET /api/public/events/:slugOrId
 * Get full details of a specific event
 */
eventsRouter.get('/public/events/:slugOrId', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const event = getEventBySlugOrId(req.params.slugOrId, user?.username);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err: any) {
    console.error('[Events API] Error fetching event detail:', err);
    res.status(500).json({ error: 'Failed to fetch event detail' });
  }
});

/**
 * POST /api/public/events/:id/remind
 * Set or toggle event reminder for a listener
 */
eventsRouter.post('/public/events/:id/remind', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const username = user?.username || req.body.username;

    if (!username) {
      return res.status(400).json({ error: 'Username or login required to set event reminder' });
    }

    const intervals = Array.isArray(req.body.intervals) && req.body.intervals.length > 0
      ? req.body.intervals
      : ['1h'];

    const result = toggleEventReminder(req.params.id, username, intervals);
    res.json(result);
  } catch (err: any) {
    console.error('[Events API] Error toggling reminder:', err);
    res.status(500).json({ error: err.message || 'Failed to update reminder' });
  }
});

/**
 * POST /api/public/events/:id/heartbeat
 * Realtime listening heartbeat during a special event
 */
eventsRouter.post('/public/events/:id/heartbeat', (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const username = user?.username || req.body.username;

    if (!username) {
      return res.json({ success: true, xp_awarded: 0 }); // Anonymous listeners still succeed
    }

    const duration = req.body.duration_seconds ? parseInt(req.body.duration_seconds, 10) : 30;
    const result = processEventListeningHeartbeat(req.params.id, username, duration);

    res.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('[Events API] Error processing event heartbeat:', err);
    res.status(500).json({ error: 'Failed to process event heartbeat' });
  }
});

// ----------------------------------------------------
// Staff & Admin Management Endpoints
// ----------------------------------------------------

/**
 * GET /api/admin/events
 * Admin view of all events with full statistics
 */
eventsRouter.get('/admin/events', requireStaffOrAdmin, (req, res) => {
  try {
    const events = getEvents({ type: 'all' });
    res.json(events);
  } catch (err: any) {
    console.error('[Events Admin API] Error listing events:', err);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * GET /api/admin/events/:id
 * Single event with sessions for editing
 */
eventsRouter.get('/admin/events/:id', requireStaffOrAdmin, (req, res) => {
  try {
    const event = getEventBySlugOrId(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err: any) {
    console.error('[Events Admin API] Error fetching event:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * POST /api/admin/events
 * Create a new special event
 */
eventsRouter.post('/admin/events', requireStaffOrAdmin, (req, res) => {
  try {
    const {
      title,
      slug,
      short_description,
      description,
      cover_image,
      start_time,
      end_time,
      timezone,
      status,
      is_featured,
      genres,
      expected_audience,
      xp_multiplier,
      event_xp_bonus,
      badge_id,
      badge_name,
      badge_description,
      badge_icon,
      badge_listen_minutes,
      stream_override_url,
      sessions
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const event = createEvent({
      title,
      slug,
      short_description,
      description,
      cover_image,
      start_time,
      end_time,
      timezone,
      status,
      is_featured,
      genres,
      expected_audience,
      xp_multiplier,
      event_xp_bonus,
      badge_id,
      badge_name,
      badge_description,
      badge_icon,
      badge_listen_minutes,
      stream_override_url,
      sessions
    });

    res.status(201).json(event);
  } catch (err: any) {
    console.error('[Events Admin API] Error creating event:', err);
    res.status(500).json({ error: err.message || 'Failed to create event' });
  }
});

/**
 * PUT /api/admin/events/:id
 * Update special event
 */
eventsRouter.put('/admin/events/:id', requireStaffOrAdmin, (req, res) => {
  try {
    const updated = updateEvent(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('[Events Admin API] Error updating event:', err);
    res.status(500).json({ error: err.message || 'Failed to update event' });
  }
});

/**
 * DELETE /api/admin/events/:id
 * Delete special event
 */
eventsRouter.delete('/admin/events/:id', requireStaffOrAdmin, (req, res) => {
  try {
    const success = deleteEvent(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err: any) {
    console.error('[Events Admin API] Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * PATCH /api/admin/events/:id/status
 * Update status
 */
eventsRouter.patch('/admin/events/:id/status', requireStaffOrAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = setEventStatus(req.params.id, status);
    res.json(updated);
  } catch (err: any) {
    console.error('[Events Admin API] Error setting event status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * GET /api/admin/events/:id/analytics
 * Get detailed analytics for an event
 */
eventsRouter.get('/admin/events/:id/analytics', requireStaffOrAdmin, (req, res) => {
  try {
    const analytics = getEventAnalytics(req.params.id);
    res.json(analytics);
  } catch (err: any) {
    console.error('[Events Admin API] Error fetching analytics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
  }
});

/**
 * POST /api/admin/events/seed
 * Seed sample events
 */
eventsRouter.post('/admin/events/seed', requireStaffOrAdmin, (req, res) => {
  try {
    seedSampleEventsIfEmpty(db, true);
    const events = getEvents({ type: 'all' });
    res.json({ success: true, events });
  } catch (err: any) {
    console.error('[Events Admin API] Error seeding events:', err);
    res.status(500).json({ error: 'Failed to seed sample events' });
  }
});
