import { db } from './src/server/db.js';
db.prepare("UPDATE settings SET value = ? WHERE key = ?").run('https://dejavufmpodcast.podomatic.com/rss2.xml', 'rss_feed_url');
console.log("Updated DB");
