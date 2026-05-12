import Database from 'better-sqlite3';
const db = new Database('dejavufm.db');
db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('advanced_features_enabled', '1');
console.log("Added setting");
