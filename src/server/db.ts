import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export const db = new Database('dejavufm.db', { verbose: console.log });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 10000');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS djs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT,
      image_url TEXT,
      instagram TEXT,
      soundcloud TEXT,
      mixcloud TEXT
    );

    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dj_id INTEGER,
      day_of_week INTEGER, -- 0 (Sunday) to 6 (Saturday)
      start_time TEXT, -- HH:mm format
      end_time TEXT, -- HH:mm format
      show_name TEXT,
      FOREIGN KEY (dj_id) REFERENCES djs (id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      bio TEXT,
      photo_url TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_stats (
      category TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS podcast_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      plays INTEGER DEFAULT 0,
      last_played DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS geo_stats (
      country_code TEXT PRIMARY KEY,
      country_name TEXT NOT NULL,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hourly_stats (
      hour INTEGER PRIMARY KEY,
      peak_listeners INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, 
      event_key TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_analytics_category ON analytics_events(category);

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      dj_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      event_date TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shoutouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listener_name TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Initialize hours
  const insertHour = db.prepare('INSERT OR IGNORE INTO hourly_stats (hour, peak_listeners) VALUES (?, 0)');
  for (let i = 0; i < 24; i++) {
    insertHour.run(i);
  }

  // Initialize stats if not exists
  const statsKeys = ['page_views', 'stream_starts'];
  const insertStat = db.prepare('INSERT OR IGNORE INTO site_stats (category, count) VALUES (?, 0)');
  statsKeys.forEach(key => insertStat.run(key));

  try { db.exec("ALTER TABLE admins ADD COLUMN bio TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE admins ADD COLUMN photo_url TEXT"); } catch (e) {}
  
  // DJ Table Column Migrations
  try { db.exec("ALTER TABLE djs ADD COLUMN image_url TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE djs ADD COLUMN instagram TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE djs ADD COLUMN soundcloud TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE djs ADD COLUMN mixcloud TEXT"); } catch (e) {}
  
  // If photo_url exists but image_url is null, migrate it
  try {
    db.exec("UPDATE djs SET image_url = photo_url WHERE image_url IS NULL AND photo_url IS NOT NULL");
  } catch (e) {}

  // Insert default settings if not exists
  const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as {count: number};
  if (countSettings.count === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('stream_url', 'https://ice1.somafm.com/groovesalad-128-mp3');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('stream_url_low', 'https://ice1.somafm.com/groovesalad-64-aac');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('stream_url_medium', 'https://ice1.somafm.com/groovesalad-128-mp3');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('stream_url_high', 'https://ice1.somafm.com/groovesalad-256-mp3');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rss_feed_url', 'https://dejavufm.podomatic.com/rss2.xml');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('studio_video_url', 'https://player.twitch.tv/?channel=bbcnews&parent=localhost');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_name', 'DEJAVU FM');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_title', 'DEJAVU FM | THE SOUND OF LONDON');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_tagline', 'The Underground Worldwide');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('font_sans', 'Inter');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('font_display', 'Inter');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('logo_url', '');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('primary_color', '#b026ff');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('secondary_color', '#00d2ff');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('is_on_air', '0');
  }

  const countDjs = db.prepare('SELECT COUNT(*) as count FROM djs').get() as {count: number};
  if (countDjs.count === 0) {
    const djs = [
      { id: '1', name: 'DJ DEJA', bio: 'Founding resident and jungle pioneer.', instagram: 'djdeja', soundcloud: 'djdeja', image_url: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb1?q=80&w=800' },
      { id: '2', name: 'LADY L', bio: 'Reggae and Dancehall specialist.', instagram: 'ladyl_radio', soundcloud: 'ladyl', image_url: 'https://images.unsplash.com/photo-1545620959-1f486effb840?q=80&w=800' },
      { id: '3', name: 'VIBE MASTER', bio: 'Old school house and garage connoisseur.', instagram: 'vibemaster', soundcloud: 'vibemaster', image_url: 'https://images.unsplash.com/photo-1516280440503-4560b4313f8c?q=80&w=800' }
    ];
    const insertDj = db.prepare('INSERT INTO djs (id, name, bio, instagram, soundcloud, image_url) VALUES (?, ?, ?, ?, ?, ?)');
    djs.forEach(dj => insertDj.run(dj.id, dj.name, dj.bio, dj.instagram, dj.soundcloud, dj.image_url));

    const insertSchedule = db.prepare('INSERT INTO schedule (dj_id, day_of_week, start_time, end_time, show_name) VALUES (?, ?, ?, ?, ?)');
    for (let day = 0; day < 7; day++) {
       insertSchedule.run('1', day, '10:00', '14:00', 'Morning Grooves');
       insertSchedule.run('2', day, '14:00', '18:00', 'Afternoon Selection');
       insertSchedule.run('3', day, '20:00', '23:59', 'The Night Mix');
    }
  }

  // Ensure default admin exists and has the correct password as requested
  const salt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('password', salt);
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
  
  if (!admin) {
    console.log("Seeding default admin user...");
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', defaultHash);
  } else {
    // Force reset to 'password' for the 'admin' user to fix the login issue
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(defaultHash, 'admin');
    console.log("Admin password reset to 'password'");
  }
}
