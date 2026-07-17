import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
  db.prepare("ALTER TABLE public_messages ADD COLUMN avatar_url TEXT;").run();
  console.log("Migration successful");
} catch (e) {
  console.log(e.message);
}
