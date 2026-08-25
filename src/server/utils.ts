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

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache TTL

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

export async function getPodcastFeed(forceRefresh: boolean = false) {
  try {
    if (!db.open) {
      console.warn("[Podcast] Database connection is closed, returning generic response.");
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

    // 2. Check if we have a valid, unexpired cached feed in podcast_cache
    if (!forceRefresh) {
      const cachedRow = db.prepare("SELECT feed_json, url, timestamp FROM podcast_cache WHERE id = 1").get() as { feed_json: string, url: string, timestamp: number } | undefined;
      
      const now = Date.now();
      if (cachedRow && cachedRow.url === rssUrl && (now - cachedRow.timestamp) < CACHE_TTL_MS) {
        try {
          const parsedCache = JSON.parse(cachedRow.feed_json);
          if (parsedCache?.items?.length > 0) {
            return parsedCache;
          }
        } catch (parseErr) {
          console.error("[Podcast Cache] Failed to parse cached JSON, refetching...", parseErr);
        }
      }
    }

    // 3. Fetch and parse the live RSS feed with a 15-second timeout
    console.log(`[Podcast] Fetching live RSS feed from: ${rssUrl} (Forced: ${forceRefresh})`);
    
    let targetUrl = rssUrl;
    let response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    let xmlText = await response.text();
    let feed = await parser.parseString(xmlText);

    // If 0 items were returned and URL was dejavufm.podomatic.com, automatically fallback to active dejavufmpodcast.podomatic.com
    if ((!feed.items || feed.items.length === 0) && targetUrl.includes('dejavufm.podomatic.com')) {
      console.log('[Podcast] Feed returned 0 items. Retrying with active dejavufmpodcast.podomatic.com/rss2.xml...');
      targetUrl = 'https://dejavufmpodcast.podomatic.com/rss2.xml';
      const fallbackResp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        signal: AbortSignal.timeout(15000)
      });
      if (fallbackResp.ok) {
        xmlText = await fallbackResp.text();
        feed = await parser.parseString(xmlText);
        // Persist the corrected URL
        try {
          db.prepare("UPDATE settings SET value = ? WHERE key = 'rss_feed_url'").run(targetUrl);
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

    // 4. Update the cache in the database
    const now = Date.now();
    const feedJson = JSON.stringify(feed);
    db.prepare(`
      INSERT INTO podcast_cache (id, feed_json, url, timestamp)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET feed_json = excluded.feed_json, url = excluded.url, timestamp = excluded.timestamp
    `).run(feedJson, targetUrl, now);

    return feed;
  } catch (err) {
    console.error("[Podcast] Failed to fetch or parse RSS feed:", err);
    
    // Fallback: If live fetch fails, try to return any cached feed we have
    try {
      const cachedRow = db.prepare("SELECT feed_json FROM podcast_cache WHERE id = 1").get() as { feed_json: string } | undefined;
      if (cachedRow?.feed_json) {
        console.log("[Podcast] Returning stale cached feed due to live fetch failure");
        const parsed = JSON.parse(cachedRow.feed_json);
        if (parsed?.items?.length > 0) {
          return parsed;
        }
      }
    } catch (fallbackErr) {
      console.error("[Podcast] Stale cache fallback failed:", fallbackErr);
    }

    // Ultimate fallback
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
  try {
    if (!db.open) return;
    db.prepare("DELETE FROM podcast_cache WHERE id = 1").run();
    console.log("[Podcast Cache] Cache cleared successfully");
  } catch (err) {
    console.error("[Podcast Cache] Failed to clear cache:", err);
  }
}
