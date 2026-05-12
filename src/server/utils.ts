import Parser from "rss-parser";
import { db } from "./db.js";

let inProgressFetch: Promise<any> | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getPodcastFeed() {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("rss_feed_url") as {value: string};
  const rssUrl = row?.value;

  if (!rssUrl) return { items: [] };

  // 1. Check DB cache
  const cached = db.prepare("SELECT feed_json, timestamp, url FROM podcast_cache WHERE id = 1").get() as {feed_json: string, timestamp: number, url: string};
  
  if (cached && cached.url === rssUrl && Date.now() - cached.timestamp < CACHE_TTL) {
    try {
      return JSON.parse(cached.feed_json);
    } catch (e) {
      console.error("[RSS Utils] Cache parse failed", e);
    }
  }

  // 2. Prevent multiple simultaneous fetches
  if (inProgressFetch) return inProgressFetch;

  inProgressFetch = (async () => {
    try {
      console.log(`[RSS Utils] Fetching new feed from ${rssUrl}`);
      const parser = new Parser({
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });

      const feed = await parser.parseURL(rssUrl);
      if (!feed.items) feed.items = [];

      // Update DB cache
      db.prepare("INSERT OR REPLACE INTO podcast_cache (id, feed_json, url, timestamp) VALUES (1, ?, ?, ?)")
        .run(JSON.stringify(feed), rssUrl, Date.now());

      return feed;
    } catch (err) {
      console.error(`[RSS Utils] Failed for ${rssUrl}:`, err);
      // Fallback to expired cache if available
      if (cached && cached.url === rssUrl) {
        try { return JSON.parse(cached.feed_json); } catch(e) {}
      }
      return { items: [] };
    } finally {
      inProgressFetch = null;
    }
  })();

  return inProgressFetch;
}

export function clearPodcastCache() {
  db.prepare("DELETE FROM podcast_cache").run();
}
