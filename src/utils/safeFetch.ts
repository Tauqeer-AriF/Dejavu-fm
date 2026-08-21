export function getPodcastId(item: any): string {
  if (!item) return '';
  const raw = String(item.guid || item.link || item.title || '');
  try {
    return btoa(unescape(encodeURIComponent(raw))).replace(/=/g, '');
  } catch {
    return btoa(raw.replace(/[^\x00-\x7F]/g, "")).replace(/=/g, '');
  }
}

export async function safeFetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("application/json")) {
    console.warn(`[safeFetchJson] Non-JSON or error response from ${url}: status ${res.status}, type: ${contentType}`);
    throw new Error(`HTTP ${res.status}: Invalid JSON response from server`);
  }
  return res.json();
}
