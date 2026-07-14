class ApiKeyCache {
  private cache = new Map<string, { prefix: string; description: string; expiresAt: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes TTL

  get(apiKey: string) {
    const cached = this.cache.get(apiKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { prefix: cached.prefix, description: cached.description };
    }
    if (cached) {
      this.cache.delete(apiKey);
    }
    return null;
  }

  set(apiKey: string, metadata: { prefix: string; description: string }) {
    this.cache.set(apiKey, {
      ...metadata,
      expiresAt: Date.now() + this.TTL
    });
  }

  invalidateAll() {
    this.cache.clear();
  }
}

export const apiKeyCache = new ApiKeyCache();
