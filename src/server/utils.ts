import Parser from "rss-parser";
import { db } from "./db.js";

let podcastCache: { feed: any, timestamp: number, url: string } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getPodcastFeed() {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("rss_feed_url") as {value: string};
  const rssUrl = row?.value;

  if (!rssUrl) return { items: [] };

  if (podcastCache && podcastCache.url === rssUrl && Date.now() - podcastCache.timestamp < CACHE_TTL) {
    return podcastCache.feed;
  }

  try {
    const parser = new Parser({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    const feed = await parser.parseURL(rssUrl);
    if (!feed.items) feed.items = [];

    podcastCache = { feed, timestamp: Date.now(), url: rssUrl };
    return feed;
  } catch (err) {
    console.error(`[RSS Utils] Failed for ${rssUrl}:`, err);
    return { items: [] };
  }
}

export function clearPodcastCache() {
  podcastCache = null;
}
