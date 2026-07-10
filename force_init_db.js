import { initDb, db } from './src/server/db.js';
try {
  initDb();
  console.log("DB Initialized");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", tables);
} catch (e) {
  console.error("Initialization failed:", e);
} finally {
  db.close();
}
