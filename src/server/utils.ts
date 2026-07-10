import { db } from "./db.ts";
import Parser from "rss-parser";

const parser = new Parser();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

export async function getPodcastFeed(forceRefresh: boolean = false) {
  try {
    if (!db.open) {
      console.warn("[Podcast] Database connection is closed, returning generic response.");
      return {
        title: "Dejavu FM Podcasts",
        description: "Direct from London's heartbeat.",
        items: []
      };
    }
    // 1. Get the configured RSS Feed URL from settings
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'rss_feed_url'").get() as { value: string } | undefined;
    const rssUrl = settingRow?.value;

    if (!rssUrl || rssUrl.trim() === "") {
      console.log("[Podcast] RSS Feed URL is empty, returning empty feed.");
      return {
        title: "Catchup & Archive",
        description: "No podcasts currently available.",
        items: []
      };
    }

    // 2. Check if we have a valid, unexpired cached feed in podcast_cache
    if (!forceRefresh) {
      const cachedRow = db.prepare("SELECT feed_json, url, timestamp FROM podcast_cache WHERE id = 1").get() as { feed_json: string, url: string, timestamp: number } | undefined;
      
      const now = Date.now();
      if (cachedRow && cachedRow.url === rssUrl && (now - cachedRow.timestamp) < CACHE_TTL_MS) {
        try {
          return JSON.parse(cachedRow.feed_json);
        } catch (parseErr) {
          console.error("[Podcast Cache] Failed to parse cached JSON, refetching...", parseErr);
        }
      }
    }

    // 3. Fetch and parse the live RSS feed
    console.log(`[Podcast] Fetching live RSS feed from: ${rssUrl} (Forced: ${forceRefresh})`);
    const feed = await parser.parseURL(rssUrl);

    // 4. Update the cache in the database
    const now = Date.now();
    const feedJson = JSON.stringify(feed);
    db.prepare(`
      INSERT INTO podcast_cache (id, feed_json, url, timestamp)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET feed_json = excluded.feed_json, url = excluded.url, timestamp = excluded.timestamp
    `).run(feedJson, rssUrl, now);

    return feed;
  } catch (err) {
    console.error("[Podcast] Failed to fetch or parse RSS feed:", err);
    
    // Fallback: If live fetch fails, try to return any stale cached feed we have
    try {
      const cachedRow = db.prepare("SELECT feed_json FROM podcast_cache WHERE id = 1").get() as { feed_json: string } | undefined;
      if (cachedRow?.feed_json) {
        console.log("[Podcast] Returning stale cached feed due to live fetch failure");
        return JSON.parse(cachedRow.feed_json);
      }
    } catch (fallbackErr) {
      console.error("[Podcast] Stale cache fallback failed:", fallbackErr);
    }

    // Ultimate fallback to prevent client crash
    return {
      title: "Dejavu FM Podcasts",
      description: "Underground Radio Archives",
      items: [],
      error: true,
      message: err instanceof Error ? err.message : String(err)
    };
  }
}

export function clearPodcastCache() {
  try {
    if (!db.open) return;
    db.prepare("DELETE FROM podcast_cache WHERE id = 1").run();
    console.log("[Podcast Cache] Cache cleared successfully");
  } catch (err) {
    console.error("[Podcast Cache] Failed to clear cache:", err);
  }
}
