export function initEventsDb(database: any) {
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS special_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        short_description TEXT,
        description TEXT,
        cover_image TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        timezone TEXT DEFAULT 'Europe/London',
        status TEXT DEFAULT 'scheduled',
        is_featured INTEGER DEFAULT 0,
        genres TEXT,
        expected_audience INTEGER DEFAULT 0,
        xp_multiplier REAL DEFAULT 1.0,
        event_xp_bonus INTEGER DEFAULT 0,
        badge_id TEXT,
        badge_name TEXT,
        badge_description TEXT,
        badge_icon TEXT DEFAULT 'Sparkles',
        badge_listen_minutes INTEGER DEFAULT 30,
        stream_override_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_special_events_status ON special_events(status);
      CREATE INDEX IF NOT EXISTS idx_special_events_featured ON special_events(is_featured);
      CREATE INDEX IF NOT EXISTS idx_special_events_slug ON special_events(slug);
      CREATE INDEX IF NOT EXISTS idx_special_events_start ON special_events(start_time);

      CREATE TABLE IF NOT EXISTS special_event_sessions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
        dj_id TEXT,
        dj_name TEXT,
        dj_photo TEXT,
        session_title TEXT,
        genre TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        stream_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_sessions_event_id ON special_event_sessions(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_sessions_dj_id ON special_event_sessions(dj_id);

      CREATE TABLE IF NOT EXISTS special_event_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        interval_type TEXT DEFAULT '1h',
        notified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, username, interval_type)
      );

      CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON special_event_reminders(username);
      CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON special_event_reminders(event_id);

      CREATE TABLE IF NOT EXISTS special_event_attendees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        total_listening_seconds INTEGER DEFAULT 0,
        first_attended_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        badge_awarded INTEGER DEFAULT 0,
        UNIQUE(event_id, username)
      );

      CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON special_event_attendees(event_id);
      CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON special_event_attendees(username);

      CREATE TABLE IF NOT EXISTS special_event_analytics (
        event_id TEXT PRIMARY KEY REFERENCES special_events(id) ON DELETE CASCADE,
        total_listeners INTEGER DEFAULT 0,
        peak_concurrent_listeners INTEGER DEFAULT 0,
        total_listening_seconds INTEGER DEFAULT 0,
        reminders_count INTEGER DEFAULT 0,
        attended_count INTEGER DEFAULT 0,
        new_followers_count INTEGER DEFAULT 0,
        chat_messages_count INTEGER DEFAULT 0,
        reactions_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default sample events if table is empty
    seedSampleEventsIfEmpty(database);

    console.log('[DB] Special events tables initialized successfully.');
  } catch (err) {
    console.error('[DB] Error initializing special events schema:', err);
  }
}

export function seedSampleEventsIfEmpty(database: any, force = false) {
  try {
    if (!force) {
      const existingCount = database.prepare('SELECT COUNT(*) as cnt FROM special_events').get() as { cnt: number };
      if (existingCount && existingCount.cnt > 0) {
        return;
      }
    } else {
      // Clear existing sample events to ensure clean re-seeding
      try {
        database.prepare("DELETE FROM special_event_sessions WHERE id LIKE 'sess_%' OR event_id LIKE 'evt_%'").run();
        database.prepare("DELETE FROM special_event_analytics WHERE event_id LIKE 'evt_%'").run();
        database.prepare("DELETE FROM special_event_reminders WHERE event_id LIKE 'evt_%'").run();
        database.prepare("DELETE FROM special_event_attendees WHERE event_id LIKE 'evt_%'").run();
        database.prepare("DELETE FROM special_events WHERE id LIKE 'evt_%'").run();
      } catch (clearErr) {
        console.error('[DB] Error clearing existing sample events for forced re-seeding:', clearErr);
      }
    }

    // Get available DJs from existing djs table for genuine association
    const djs = database.prepare('SELECT id, name, image_url FROM djs LIMIT 6').all() as any[];
    const dj1 = djs[0] || { id: '1', name: 'DJ Wayne E', image_url: '' };
    const dj2 = djs[1] || { id: '2', name: 'DJ Matrix', image_url: '' };
    const dj3 = djs[2] || { id: '3', name: 'DJ Slip', image_url: '' };
    const dj4 = djs[3] || { id: '4', name: 'DJ Soulful', image_url: '' };

    const now = new Date();
    // Event 1: Friday Night Takeover (Live / starting soon)
    const event1Start = new Date(now.getTime() - 1000 * 60 * 30); // 30m ago (Currently live!)
    const event1End = new Date(now.getTime() + 1000 * 60 * 60 * 5); // 5h from now

    // Event 2: Summer House Party (Upcoming)
    const event2Start = new Date(now.getTime() + 1000 * 60 * 60 * 48); // 2 days from now
    const event2End = new Date(event2Start.getTime() + 1000 * 60 * 60 * 8);

    // Event 3: 24-Hour DJ Marathon (Upcoming)
    const event3Start = new Date(now.getTime() + 1000 * 60 * 60 * 120); // 5 days from now
    const event3End = new Date(event3Start.getTime() + 1000 * 60 * 60 * 24);

    // Event 4: Anniversary Special Showcase (Completed)
    const event4Start = new Date(now.getTime() - 1000 * 60 * 60 * 96);
    const event4End = new Date(event4Start.getTime() + 1000 * 60 * 60 * 6);

    const insertEvent = database.prepare(`
      INSERT OR REPLACE INTO special_events (
        id, title, slug, short_description, description, cover_image, 
        start_time, end_time, timezone, status, is_featured, genres, 
        expected_audience, xp_multiplier, event_xp_bonus, badge_id, 
        badge_name, badge_description, badge_icon, badge_listen_minutes
      ) VALUES (
        @id, @title, @slug, @short_description, @description, @cover_image, 
        @start_time, @end_time, @timezone, @status, @is_featured, @genres, 
        @expected_audience, @xp_multiplier, @event_xp_bonus, @badge_id, 
        @badge_name, @badge_description, @badge_icon, @badge_listen_minutes
      )
    `);

    const insertSession = database.prepare(`
      INSERT OR REPLACE INTO special_event_sessions (
        id, event_id, dj_id, dj_name, dj_photo, session_title, genre, start_time, end_time, display_order
      ) VALUES (
        @id, @event_id, @dj_id, @dj_name, @dj_photo, @session_title, @genre, @start_time, @end_time, @display_order
      )
    `);

    const insertAnalytics = database.prepare(`
      INSERT OR IGNORE INTO special_event_analytics (
        event_id, total_listeners, peak_concurrent_listeners, total_listening_seconds, reminders_count, attended_count
      ) VALUES (
        ?, ?, ?, ?, ?, ?
      )
    `);

    // Ensure custom badge exists in gamification_badges
    const insertBadge = database.prepare(`
      INSERT OR IGNORE INTO gamification_badges (id, name, description, icon, requirement, requirement_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // 1. Friday Night Takeover
    insertEvent.run({
      id: 'evt_friday_takeover',
      title: 'Friday Night Takeover: Underground B2B',
      slug: 'friday-night-takeover',
      short_description: 'An exclusive multi-DJ live back-to-back takeover delivering the rawest UK Garage, House, and Jungle beats.',
      description: `### Get Ready for the Ultimate Takeover\n\nThe Friday Night Takeover unites London's most revered underground selectors for a continuous 5-hour showcase.\n\n* **Double XP (2× XP)** active for all live listeners in chat and audio stream\n* **Exclusive Attendee Badge**: Tune in for at least 30 minutes to permanently earn the *Takeover Pioneer* badge\n* Real-time live track identification and interactive DJ shoutouts`,
      cover_image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      start_time: event1Start.toISOString(),
      end_time: event1End.toISOString(),
      timezone: 'Europe/London',
      status: 'live',
      is_featured: 1,
      genres: JSON.stringify(['UK Garage', 'House', 'Tech House', 'Jungle']),
      expected_audience: 1500,
      xp_multiplier: 2.0,
      event_xp_bonus: 50,
      badge_id: 'badge_takeover_pioneer',
      badge_name: 'Takeover Pioneer',
      badge_description: 'Attended the Friday Night Takeover special broadcast for 30+ minutes',
      badge_icon: 'Flame',
      badge_listen_minutes: 30
    });

    insertBadge.run('badge_takeover_pioneer', 'Takeover Pioneer', 'Attended the Friday Night Takeover special broadcast for 30+ minutes', 'Flame', 30, 'event_listen');

    // Sessions for Event 1
    const s1End = new Date(event1Start.getTime() + 1000 * 60 * 90);
    const s2End = new Date(s1End.getTime() + 1000 * 60 * 90);
    const s3End = new Date(event1End.getTime());

    insertSession.run({
      id: 'sess_1_1',
      event_id: 'evt_friday_takeover',
      dj_id: String(dj1.id),
      dj_name: dj1.name,
      dj_photo: dj1.image_url,
      session_title: 'Opening Warm-up: Oldskool Garage Classics',
      genre: 'UK Garage',
      start_time: event1Start.toISOString(),
      end_time: s1End.toISOString(),
      display_order: 1
    });

    insertSession.run({
      id: 'sess_1_2',
      event_id: 'evt_friday_takeover',
      dj_id: String(dj2.id),
      dj_name: dj2.name,
      dj_photo: dj2.image_url,
      session_title: 'Peak Time Tech House Session',
      genre: 'Tech House',
      start_time: s1End.toISOString(),
      end_time: s2End.toISOString(),
      display_order: 2
    });

    insertSession.run({
      id: 'sess_1_3',
      event_id: 'evt_friday_takeover',
      dj_id: String(dj3.id),
      dj_name: dj3.name,
      dj_photo: dj3.image_url,
      session_title: 'Midnight Closing B2B Special',
      genre: 'Jungle & Bass',
      start_time: s2End.toISOString(),
      end_time: s3End.toISOString(),
      display_order: 3
    });

    insertAnalytics.run('evt_friday_takeover', 482, 184, 98400, 126, 320);

    // 2. Summer House Party
    insertEvent.run({
      id: 'evt_summer_house',
      title: 'Summer House Party 2026',
      slug: 'summer-house-party',
      short_description: '8 hours of euphoric deep house, vocal anthems, and sunset vibes streamed live from the rooftop studio.',
      description: `### Summer Sounds on dejavufm\n\nCelebrate the season with 8 uninterrupted hours of soulful and uplifting house music featuring special guest sets.\n\n* **2× XP Multiplier** during the whole 8-hour live session\n* Exclusive **Sun Chaser** limited-edition listener badge`,
      cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      start_time: event2Start.toISOString(),
      end_time: event2End.toISOString(),
      timezone: 'Europe/London',
      status: 'scheduled',
      is_featured: 1,
      genres: JSON.stringify(['Deep House', 'Soulful House', 'Nu Disco']),
      expected_audience: 2200,
      xp_multiplier: 2.0,
      event_xp_bonus: 75,
      badge_id: 'badge_sun_chaser',
      badge_name: 'Sun Chaser',
      badge_description: 'Listened live during the Summer House Party 2026',
      badge_icon: 'Sun',
      badge_listen_minutes: 30
    });

    insertBadge.run('badge_sun_chaser', 'Sun Chaser', 'Listened live during the Summer House Party 2026', 'Sun', 30, 'event_listen');

    insertSession.run({
      id: 'sess_2_1',
      event_id: 'evt_summer_house',
      dj_id: String(dj4.id),
      dj_name: dj4.name,
      dj_photo: dj4.image_url,
      session_title: 'Sunset Soulful House Opening',
      genre: 'Soulful House',
      start_time: event2Start.toISOString(),
      end_time: new Date(event2Start.getTime() + 1000 * 60 * 180).toISOString(),
      display_order: 1
    });

    insertSession.run({
      id: 'sess_2_2',
      event_id: 'evt_summer_house',
      dj_id: String(dj1.id),
      dj_name: dj1.name,
      dj_photo: dj1.image_url,
      session_title: 'Nu-Disco & Ibiza Classics Peak Set',
      genre: 'Nu Disco',
      start_time: new Date(event2Start.getTime() + 1000 * 60 * 180).toISOString(),
      end_time: event2End.toISOString(),
      display_order: 2
    });

    insertAnalytics.run('evt_summer_house', 0, 0, 0, 84, 0);

    // 3. 24-Hour DJ Marathon
    insertEvent.run({
      id: 'evt_24h_marathon',
      title: '24-Hour DJ Marathon for Charity',
      slug: '24-hour-dj-marathon',
      short_description: '24 straight hours of underground sound with 12 resident DJs raising funds for music education.',
      description: `### The Non-Stop Underground Marathon\n\n12 resident DJs, 24 continuous hours, all underground genres covered from Dubstep to Funky House.\n\n* **3× XP Mega Multiplier** across the 24 hours\n* **Iron Ear** Marathon achievement badge`,
      cover_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      start_time: event3Start.toISOString(),
      end_time: event3End.toISOString(),
      timezone: 'Europe/London',
      status: 'scheduled',
      is_featured: 0,
      genres: JSON.stringify(['UK Garage', 'Drum & Bass', 'House', 'Grime', 'Afrobeats']),
      expected_audience: 5000,
      xp_multiplier: 3.0,
      event_xp_bonus: 100,
      badge_id: 'badge_iron_ear',
      badge_name: 'Iron Ear Marathoner',
      badge_description: 'Listened to 60+ minutes of the 24-Hour Charity DJ Marathon',
      badge_icon: 'Zap',
      badge_listen_minutes: 60
    });

    insertBadge.run('badge_iron_ear', 'Iron Ear Marathoner', 'Listened to 60+ minutes of the 24-Hour Charity DJ Marathon', 'Zap', 60, 'event_listen');
    insertAnalytics.run('evt_24h_marathon', 0, 0, 0, 195, 0);

    // 4. Completed Event
    insertEvent.run({
      id: 'evt_anniversary_special',
      title: 'dejavufm 20th Anniversary Special',
      slug: 'anniversary-special',
      short_description: 'A historic celebration commemorating two decades of London pirate radio heritage.',
      description: `Celebrating 20 years of pioneering underground music in the capital with legendary DJ sets and archival recordings.`,
      cover_image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
      start_time: event4Start.toISOString(),
      end_time: event4End.toISOString(),
      timezone: 'Europe/London',
      status: 'completed',
      is_featured: 0,
      genres: JSON.stringify(['Oldskool', 'Jungle', 'UK Garage']),
      expected_audience: 3500,
      xp_multiplier: 2.0,
      event_xp_bonus: 50,
      badge_id: 'badge_20yr_legend',
      badge_name: '20 Year Legend',
      badge_description: 'Celebrated the 20th Anniversary broadcast',
      badge_icon: 'Crown',
      badge_listen_minutes: 30
    });

    insertAnalytics.run('evt_anniversary_special', 2890, 842, 429000, 310, 1940);

    console.log('[DB] Sample special events seeded successfully.');
  } catch (err) {
    console.error('[DB] Error seeding sample special events:', err);
  }
}
