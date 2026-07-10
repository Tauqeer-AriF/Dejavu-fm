import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import * as tar from 'tar';

const getDatabasePath = () => {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  // On Cloud Run (identified by K_SERVICE or production node env), use /tmp to ensure writable filesystem
  if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) {
    return '/tmp/dejavufm.db';
  }
  return 'dejavufm.db';
};

export const dbPath = getDatabasePath();
export const backupDir = (process.env.NODE_ENV === 'production' || process.env.K_SERVICE || dbPath.startsWith('/tmp/'))
  ? path.join(path.dirname(dbPath), 'backups')
  : path.join(process.cwd(), 'backups');

// Ensure the directory exists if a path is provided
const dbDir = path.dirname(dbPath);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// If the source db file exists in current directory but not in the writable destination, copy it
if (dbPath !== 'dejavufm.db' && fs.existsSync('dejavufm.db') && !fs.existsSync(dbPath)) {
  try {
    fs.copyFileSync('dejavufm.db', dbPath);
    console.log(`[DB] Seeded database by copying local dejavufm.db to ${dbPath}`);
  } catch (err) {
    console.error(`[DB] Failed to copy local dejavufm.db to ${dbPath}:`, err);
  }
}

let activeDb = new Database(dbPath);

const configureDb = (connection: any) => {
  try {
    connection.pragma('journal_mode = WAL');
  } catch (e) {
    console.warn('[DB] Failed to set WAL mode, falling back to default:', e);
  }
  connection.pragma('busy_timeout = 5000');
  connection.pragma('synchronous = OFF'); // Faster for SSDs, though less crash-safe. 'NORMAL' is safer.
  connection.pragma('cache_size = 10000');
  connection.pragma('foreign_keys = ON');
};

configureDb(activeDb);

export const db = new Proxy({} as any, {
  get(_, prop) {
    if (prop === 'close') {
      return () => {
        console.log("[DB Proxy] Closing active database connection...");
        return activeDb.close();
      };
    }
    const value = Reflect.get(activeDb, prop);
    if (typeof value === 'function') {
      return value.bind(activeDb);
    }
    return value;
  },
  set(_, prop, value) {
    return Reflect.set(activeDb, prop, value);
  }
});

export function closeDatabaseConnection() {
  if (activeDb.open) {
    console.log("[DB] Closing active database connection...");
    activeDb.close();
  }
}

export function reopenDatabaseConnection() {
  console.log(`[DB] Re-opening database connection at ${dbPath}...`);
  activeDb = new Database(dbPath);
  configureDb(activeDb);
}

export function initDb() {
  console.log(`[DB] Initializing database at ${dbPath}...`);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

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
      photo_url TEXT,
      role TEXT DEFAULT 'admin', -- New column for user roles
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      source TEXT DEFAULT 'register',
      is_banned INTEGER DEFAULT 0,
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
    CREATE INDEX IF NOT EXISTS idx_analytics_cat_time ON analytics_events(category, timestamp);
    CREATE INDEX IF NOT EXISTS idx_analytics_key_time ON analytics_events(category, event_key, timestamp);

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

    CREATE TABLE IF NOT EXISTS podcast_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      feed_json TEXT NOT NULL,
      url TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      image_url TEXT,
      content TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_blogs_published_created ON blogs(is_published, created_at);

    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      image_url TEXT,
      content TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_features_published_created ON features(is_published, created_at);

    CREATE TABLE IF NOT EXISTS advertisements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slider_type TEXT NOT NULL, -- 'single' or 'triple'
      image_url TEXT NOT NULL,
      link_url TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      target_pages TEXT DEFAULT 'all',
      position TEXT DEFAULT 'bottom',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blogs'").get();
    if (tableExists) {
      db.exec(`
        INSERT OR IGNORE INTO features (id, slug, title, excerpt, image_url, content, is_published, created_at, updated_at)
        SELECT id, slug, title, excerpt, image_url, content, is_published, created_at, updated_at FROM blogs;
      `);
    }
  } catch (e) {
    console.error("[DB Migration] Error copying blogs to features:", e);
  }

  const runMigration = (id: string, sql: string) => {
    const exists = db.prepare("SELECT 1 FROM migrations WHERE id = ?").get(id);
    if (!exists) {
      try {
        db.exec(sql);
        db.prepare("INSERT INTO migrations (id) VALUES (?)").run(id);
      } catch (e) {
        db.prepare("INSERT INTO migrations (id) VALUES (?)").run(id);
      }
    }
  };

  // Migrations for existing databases
  runMigration('admin_profile_fields', "ALTER TABLE admins ADD COLUMN bio TEXT; ALTER TABLE admins ADD COLUMN photo_url TEXT;");
  runMigration('dj_social_fields', "ALTER TABLE djs ADD COLUMN image_url TEXT; ALTER TABLE djs ADD COLUMN instagram TEXT; ALTER TABLE djs ADD COLUMN soundcloud TEXT; ALTER TABLE djs ADD COLUMN mixcloud TEXT;");
  runMigration('user_source_field', "ALTER TABLE users ADD COLUMN source TEXT DEFAULT 'register';");
  runMigration('admin_role_field', "ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin';");
  runMigration('user_ban_field', "ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;");
  runMigration('advertisement_target_pages', "ALTER TABLE advertisements ADD COLUMN target_pages TEXT DEFAULT 'all';");
  runMigration('advertisement_position_v1', "ALTER TABLE advertisements ADD COLUMN position TEXT DEFAULT 'bottom';");
  runMigration('popups_table_v2', `
    CREATE TABLE IF NOT EXISTS popups (
      id TEXT PRIMARY KEY,
      heading TEXT,
      text TEXT,
      btn_text TEXT,
      btn_link TEXT,
      type TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  runMigration('audit_logs_table', "CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, role TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, resource_id TEXT, details TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);");
  runMigration('correct_rss_endpoint', "UPDATE settings SET value = 'https://dejavufmpodcast.podomatic.com/rss2.xml' WHERE key = 'rss_feed_url' AND value = 'https://dejavufm.podomatic.com/rss2.xml';");
  runMigration('advanced_features_flag', "INSERT OR IGNORE INTO settings (key, value) VALUES ('advanced_features_enabled', '1');");
  runMigration('backup_enabled_flag', "INSERT OR IGNORE INTO settings (key, value) VALUES ('backup_enabled', '1');");
  runMigration('backup_status_logging', "INSERT OR IGNORE INTO settings (key, value) VALUES ('backup_last_attempt', ''), ('backup_last_status', 'never');");
  runMigration('backup_metadata_table', "CREATE TABLE IF NOT EXISTS backup_metadata (filename TEXT PRIMARY KEY, label TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);");
  runMigration('backup_retention_days_init', "INSERT OR IGNORE INTO settings (key, value) VALUES ('backup_retention_days', '30');");
  runMigration('backup_frequency_hours_init', "INSERT OR IGNORE INTO settings (key, value) VALUES ('backup_frequency_hours', '24');");
  runMigration('ad_auto_scroll_init', "INSERT OR IGNORE INTO settings (key, value) VALUES ('ad_auto_scroll', '1');");
  runMigration('user_avatar_field', "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL;");
  runMigration('user_email_field', "ALTER TABLE users ADD COLUMN email TEXT DEFAULT NULL;");
  runMigration('admin_email_field', "ALTER TABLE admins ADD COLUMN email TEXT;");
  runMigration('private_messages_table', "CREATE TABLE IF NOT EXISTS private_messages (id TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL, text TEXT, imageUrl TEXT, imageName TEXT, audioUrl TEXT, audioName TEXT, timestamp INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS idx_private_messages_participants ON private_messages(sender, recipient);");
  try {
    db.exec("UPDATE users SET email = username WHERE email IS NULL AND username LIKE '%@%'");
  } catch (e) {}

  // Initialize hours
  const insertHour = db.prepare('INSERT OR IGNORE INTO hourly_stats (hour, peak_listeners) VALUES (?, 0)');
  for (let i = 0; i < 24; i++) {
    insertHour.run(i);
  }

  // Initialize stats if not exists
  const statsKeys = ['page_views', 'stream_starts'];
  const insertStat = db.prepare('INSERT OR IGNORE INTO site_stats (category, count) VALUES (?, 0)');
  statsKeys.forEach(key => insertStat.run(key));
  
  // Data migration: If photo_url exists but image_url is null, migrate it
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
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('rss_feed_url', 'https://dejavufmpodcast.podomatic.com/rss2.xml');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('studio_video_url', 'https://player.twitch.tv/?channel=bbcnews&parent=localhost');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_name', 'DEJAVU FM');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_title', 'DEJAVU FM | THE SOUND OF LONDON');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_tagline', 'The Underground Worldwide');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('font_sans', 'Inter');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('font_display', 'Inter');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('logo_url', '');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('logo_dark', '');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('logo_light', '');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('favicon', '/favicon.ico');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('primary_color', '#b026ff');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('secondary_color', '#00d2ff');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('is_on_air', '0');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_chat', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_shoutouts', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_cinematic', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_pwa', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_bookings', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_live_tools', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('feat_stream_quality', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('advanced_features_enabled', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('backup_frequency_hours', '24');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('backup_enabled', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('backup_last_attempt', '');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT DO NOTHING').run('backup_last_status', 'never');
  }

  // Ensure admin secret exists
  const envSecret = process.env.ADMIN_SECRET;
  try {
    const currentSecretRow = db.prepare("SELECT value FROM settings WHERE key = ?").get('admin_secret') as any;
    const currentSecret = currentSecretRow?.value;
    
    // We only enforce/initialize if it's missing or set to the old generic 'Admin' or a system-generated long string
    const IS_SYSTEM_GENERATED = currentSecret && currentSecret.length > 50; 
    
    if (!currentSecret || currentSecret === "" || currentSecret === "Admin" || IS_SYSTEM_GENERATED) {
      const target = (envSecret && envSecret.length < 50) ? envSecret : 'waynee';
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('admin_secret', target);
    } else {
      console.log(`[DB] admin_secret is already set in database. Preserving existing value.`);
    }
  } catch (err) {
    const fallback = envSecret || 'waynee';
    console.error("[DB] Failed to check admin_secret, falling back to:", fallback, err);
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run('admin_secret', fallback);
  }

  const countDjs = db.prepare('SELECT COUNT(*) as count FROM djs').get() as {count: number};
  if (countDjs.count === 0) {
    const djs = [
      { id: '1', name: 'DJ DEJA', bio: 'Founding resident and jungle pioneer.', instagram: 'djdeja', soundcloud: 'djdeja', image_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=800' },
      { id: '2', name: 'LADY L', bio: 'Reggae and Dancehall specialist.', instagram: 'ladyl_radio', soundcloud: 'ladyl', image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800' },
      { id: '3', name: 'VIBE MASTER', bio: 'Old school house and garage connoisseur.', instagram: 'vibemaster', soundcloud: 'vibemaster', image_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800' }
    ];
    const insertDj = db.prepare('INSERT INTO djs (id, name, bio, instagram, soundcloud, image_url) VALUES (?, ?, ?, ?, ?, ?)');
    djs.forEach(dj => insertDj.run(dj.id, dj.name, dj.bio, dj.instagram, dj.soundcloud, dj.image_url));

    const insertSchedule = db.prepare('INSERT INTO schedule (dj_id, day_of_week, start_time, end_time, show_name) VALUES (?, ?, ?, ?, ?)');
    for (let day = 0; day < 7; day++) {
       insertSchedule.run('1', day, '10:00', '14:00', 'Morning Grooves');
       insertSchedule.run('2', day, '14:00', '18:00', 'Afternoon Selection');
       insertSchedule.run('3', day, '20:00', '23:59', 'The Night Mix');
    }
  } else {
    // Patch existing seeded DJ image URLs in case they are broken
    try {
      db.prepare("UPDATE djs SET image_url = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=800' WHERE image_url LIKE '%photo-1571266028243-e4733b0f0bb1%'").run();
      db.prepare("UPDATE djs SET image_url = 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=800' WHERE image_url LIKE '%photo-1545620959-1f486effb840%'").run();
      db.prepare("UPDATE djs SET image_url = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800' WHERE image_url LIKE '%photo-1516280440503-4560b4313f8c%'").run();
    } catch (err) {
      console.error("[DB] Failed to update seeded DJ image URLs:", err);
    }
  }

  // Ensure default admin exists
  const countAdmins = db.prepare('SELECT COUNT(*) as count FROM admins').get() as {count: number};
  if (countAdmins.count === 0) {
    const defaultHash = bcrypt.hashSync('password', 10);
    console.log("[DB] Seeding default admin user (admin/password)");
    db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)').run('admin', defaultHash, 'admin');
  }

  // Ensure Wayne admin exists
  const wayneExists = db.prepare("SELECT 1 FROM admins WHERE LOWER(email) = ? OR LOWER(username) = ?").get('wayne@creativeengagementservices.com', 'wayne');
  if (!wayneExists) {
    const wayneHash = bcrypt.hashSync('password', 10);
    console.log("[DB] Seeding Wayne admin user (wayne/password)");
    db.prepare('INSERT INTO admins (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run('wayne', 'wayne@creativeengagementservices.com', wayneHash, 'admin');
  } else {
    console.log(`[DB] Already have ${countAdmins.count} admin user(s).`);
  }
  console.log("[DB] Database initialization complete.");
} catch (err) {
  console.error("[DB] CRITICAL ERROR during database initialization:", err);
  throw err;
}
}

/**
 * Delete backups older than the configured retention setting.
 */
export function pruneBackups() {
  if (!fs.existsSync(backupDir)) return;

  const retentionRow = db.prepare("SELECT value FROM settings WHERE key = 'backup_retention_days'").get() as {value: string} | undefined;
  const retentionDays = parseInt(retentionRow?.value || "30");
  const RETENTION_MS = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  fs.readdirSync(backupDir)
    .filter(f => (f.startsWith('backup-') || f.startsWith('manual-backup-')) && (f.endsWith('.db') || f.endsWith('.bundle')))
    .forEach(f => {
      const filePath = path.join(backupDir, f);
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > RETENTION_MS) {
        fs.unlinkSync(filePath);
        db.prepare("DELETE FROM backup_metadata WHERE filename = ?").run(f);
        console.log(`[DB] Pruned expired backup (older than ${retentionDays} days): ${f}`);
      }
    });
}

/**
 * Atomic backup of the SQLite database.
 */
export async function backupDatabase() {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const finalBackupPath = path.join(backupDir, `backup-${timestamp}.bundle`);
  const tempDir = path.join(backupDir, `temp-${timestamp}`);
  
  const now = new Date().toISOString();
  try {
    console.log(`[DB] Starting automated bundled backup...`);
    db.prepare("UPDATE settings SET value = ? WHERE key = 'backup_last_attempt'").run(now);

    // 1. Create temp directory
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // 2. Backup database to temp dir
    const dbBackupPath = path.join(tempDir, 'database.db');
    await db.backup(dbBackupPath);

    // 3. Copy uploads if they exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const destUploads = path.join(tempDir, 'uploads');
      if (!fs.existsSync(destUploads)) fs.mkdirSync(destUploads, { recursive: true });
      fs.cpSync(uploadsDir, destUploads, { recursive: true, force: true });
    }

    // 4. Create tarball bundle
    await tar.c({ gzip: true, file: finalBackupPath, cwd: tempDir }, ['.']);

    db.prepare("UPDATE settings SET value = ? WHERE key = 'backup_last_status'").run('success');
    console.log(`[DB] Bundled backup successful: ${finalBackupPath}`);
    
    // Cleanup temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    pruneBackups();
  } catch (err) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'backup_last_status'").run('failed');
    console.error("[DB] Automated backup failed:", err);
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
