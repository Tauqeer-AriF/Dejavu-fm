import { db } from "./db.ts";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:image', 'itunesImage'],
      ['itunes:duration', 'duration'],
      ['itunes:author', 'author'],
      ['itunes:summary', 'summary'],
      ['itunes:subtitle', 'subtitle']
    ]
  }
});

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache TTL
const FETCH_TIMEOUT_MS = 45000; // 45s timeout for downloading & parsing large (~9.4MB) XML feed

interface MemoryCache {
  feed: any;
  url: string;
  timestamp: number;
}

let inMemoryPodcastCache: MemoryCache | null = null;
let inFlightFetchPromise: Promise<any> | null = null;

function normalizePodcastUrl(rawUrl: string | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'https://dejavufmpodcast.podomatic.com/rss2.xml';
  }
  let url = rawUrl.trim();
  if (!url) {
    return 'https://dejavufmpodcast.podomatic.com/rss2.xml';
  }

  // Convert web page URLs to RSS feed URLs
  const podomaticMatch = url.match(/podomatic\.com\/podcasts\/([a-zA-Z0-9_-]+)/i);
  if (podomaticMatch) {
    url = `https://${podomaticMatch[1]}.podomatic.com/rss2.xml`;
  } else if (/^https?:\/\/[a-zA-Z0-9_-]+\.podomatic\.com\/?$/i.test(url)) {
    url = url.replace(/\/$/, '') + '/rss2.xml';
  }

  // Fix known inactive / empty channel URL
  if (url === 'https://dejavufm.podomatic.com/rss2.xml') {
    url = 'https://dejavufmpodcast.podomatic.com/rss2.xml';
  }

  return url;
}

async function fetchAndCacheLiveFeed(targetUrl: string): Promise<any> {
  try {
    console.log(`[Podcast] Fetching live RSS feed from: ${targetUrl}...`);
    
    let currentUrl = targetUrl;
    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    let xmlText = await response.text();
    let feed = await parser.parseString(xmlText);

    // If 0 items were returned and URL was dejavufm.podomatic.com, automatically fallback to active dejavufmpodcast.podomatic.com
    if ((!feed.items || feed.items.length === 0) && currentUrl.includes('dejavufm.podomatic.com')) {
      console.log('[Podcast] Feed returned 0 items. Retrying with active dejavufmpodcast.podomatic.com/rss2.xml...');
      currentUrl = 'https://dejavufmpodcast.podomatic.com/rss2.xml';
      const fallbackResp = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });
      if (fallbackResp.ok) {
        xmlText = await fallbackResp.text();
        feed = await parser.parseString(xmlText);
        try {
          if (db.open) {
            db.prepare("UPDATE settings SET value = ? WHERE key = 'rss_feed_url'").run(currentUrl);
          }
        } catch (_) {}
      }
    }

    // Enhance and normalize items image and enclosure metadata
    const feedDefaultImage = feed.image?.url || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600";
    if (feed.items && Array.isArray(feed.items)) {
      feed.items = feed.items.map((item: any) => {
        const itunesImage = item.itunesImage?.['$']?.href || item.itunesImage?.href || item.itunes?.image || feedDefaultImage;
        return {
          ...item,
          imageUrl: itunesImage,
          itunes: {
            ...item.itunes,
            image: itunesImage
          }
        };
      });
    }

    // Update memory cache
    const now = Date.now();
    inMemoryPodcastCache = {
      feed,
      url: currentUrl,
      timestamp: now
    };

    // Update database cache
    if (db.open) {
      try {
        const feedJson = JSON.stringify(feed);
        db.prepare(`
          INSERT INTO podcast_cache (id, feed_json, url, timestamp)
          VALUES (1, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET feed_json = excluded.feed_json, url = excluded.url, timestamp = excluded.timestamp
        `).run(feedJson, currentUrl, now);
      } catch (dbErr) {
        console.warn("[Podcast Cache] Could not write to podcast_cache table:", dbErr);
      }
    }

    console.log(`[Podcast] Successfully fetched and cached RSS feed (${feed.items?.length || 0} episodes)`);
    return feed;
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout') || err?.message?.includes('aborted');
    console.warn(`[Podcast] ${isTimeout ? 'Feed fetch timed out' : 'Feed fetch failed'}: ${err?.message || err}. Checking for cached fallback.`);

    // Fallback 1: Return in-memory cache if available
    if (inMemoryPodcastCache?.feed?.items?.length) {
      console.log("[Podcast] Serving stale in-memory cached feed.");
      return inMemoryPodcastCache.feed;
    }

    // Fallback 2: Return SQLite database cache if available
    if (db.open) {
      try {
        const cachedRow = db.prepare("SELECT feed_json FROM podcast_cache WHERE id = 1").get() as { feed_json: string } | undefined;
        if (cachedRow?.feed_json) {
          const parsed = JSON.parse(cachedRow.feed_json);
          if (parsed?.items?.length > 0) {
            console.log(`[Podcast] Serving stale database cached feed (${parsed.items.length} episodes).`);
            inMemoryPodcastCache = {
              feed: parsed,
              url: targetUrl,
              timestamp: Date.now()
            };
            return parsed;
          }
        }
      } catch (fallbackErr) {
        console.warn("[Podcast] Stale cache fallback read failed:", fallbackErr);
      }
    }

    // Fallback 3: Safe empty feed fallback
    return {
      title: "dejavufm Podcasts",
      description: "Underground Radio Archives",
      items: [],
      error: true,
      message: err instanceof Error ? err.message : String(err)
    };
  } finally {
    inFlightFetchPromise = null;
  }
}

export async function getPodcastFeed(forceRefresh: boolean = false) {
  try {
    if (!db.open) {
      if (inMemoryPodcastCache?.feed) {
        return inMemoryPodcastCache.feed;
      }
      return {
        title: "dejavufm Podcasts",
        description: "Direct from London's heartbeat.",
        items: []
      };
    }

    // 1. Get the configured RSS Feed URL from settings
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'rss_feed_url'").get() as { value: string } | undefined;
    const rawRssUrl = settingRow?.value;
    const rssUrl = normalizePodcastUrl(rawRssUrl);

    // If setting was outdated or pointing to empty feed, update the setting in DB
    if (rawRssUrl && rawRssUrl !== rssUrl && rawRssUrl.includes('dejavufm.podomatic.com')) {
      try {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'rss_feed_url'").run(rssUrl);
        console.log(`[Podcast] Auto-corrected settings.rss_feed_url to: ${rssUrl}`);
      } catch (uErr) {
        console.warn('[Podcast] Could not update settings table with normalized URL:', uErr);
      }
    }

    const now = Date.now();

    // 2. Fast Path: Check In-Memory Cache
    if (!forceRefresh && inMemoryPodcastCache && inMemoryPodcastCache.url === rssUrl) {
      const isFresh = (now - inMemoryPodcastCache.timestamp) < CACHE_TTL_MS;
      if (isFresh && inMemoryPodcastCache.feed?.items?.length > 0) {
        return inMemoryPodcastCache.feed;
      }
      // If stale, return memory cache immediately and revalidate in background
      if (inMemoryPodcastCache.feed?.items?.length > 0 && !inFlightFetchPromise) {
        inFlightFetchPromise = fetchAndCacheLiveFeed(rssUrl);
        return inMemoryPodcastCache.feed;
      }
    }

    // 3. Check Database Cache
    if (!forceRefresh) {
      try {
        const cachedRow = db.prepare("SELECT feed_json, url, timestamp FROM podcast_cache WHERE id = 1").get() as { feed_json: string, url: string, timestamp: number } | undefined;
        if (cachedRow && cachedRow.url === rssUrl) {
          const isFresh = (now - cachedRow.timestamp) < CACHE_TTL_MS;
          const parsedCache = JSON.parse(cachedRow.feed_json);
          if (parsedCache?.items?.length > 0) {
            inMemoryPodcastCache = {
              feed: parsedCache,
              url: rssUrl,
              timestamp: cachedRow.timestamp
            };
            if (isFresh) {
              return parsedCache;
            }
            // Stale-while-revalidate: return DB cache immediately and refresh in background
            if (!inFlightFetchPromise) {
              inFlightFetchPromise = fetchAndCacheLiveFeed(rssUrl);
            }
            return parsedCache;
          }
        }
      } catch (parseErr) {
        console.warn("[Podcast Cache] Could not read from database cache:", parseErr);
      }
    }

    // 4. If in-flight request is already running, await it (prevents thundering herd)
    if (inFlightFetchPromise) {
      return await inFlightFetchPromise;
    }

    // 5. Fetch live feed
    inFlightFetchPromise = fetchAndCacheLiveFeed(rssUrl);
    return await inFlightFetchPromise;
  } catch (err) {
    console.warn("[Podcast] Unexpected error in getPodcastFeed:", err);
    if (inMemoryPodcastCache?.feed) {
      return inMemoryPodcastCache.feed;
    }
    return {
      title: "dejavufm Podcasts",
      description: "Underground Radio Archives",
      items: [],
      error: true,
      message: err instanceof Error ? err.message : String(err)
    };
  }
}

export function clearPodcastCache() {
  inMemoryPodcastCache = null;
  inFlightFetchPromise = null;
  try {
    if (!db.open) return;
    db.prepare("DELETE FROM podcast_cache WHERE id = 1").run();
    console.log("[Podcast Cache] Cache cleared successfully");
  } catch (err) {
    console.error("[Podcast Cache] Failed to clear cache:", err);
  }
}

