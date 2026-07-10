const Database = require('better-sqlite3');
const db = new Database('dejavufm.db');
try {
  const metadata = db.prepare("SELECT * FROM backup_metadata").all();
  console.log("Metadata:", JSON.stringify(metadata, null, 2));
} catch (e) {
  console.error("Query failed:", e.message);
}
