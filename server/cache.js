/**
 * cache.js — In-memory LRU cache for expensive queries.
 * Enterprise production: TTL-based caching with automatic eviction.
 */
class LRUCache {
  constructor(maxSize = 100, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  invalidate(key) {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Pre-configured caches
const caches = {
  overview: new LRUCache(10, 30000),
  stats: new LRUCache(10, 15000),
  findings: new LRUCache(50, 30000),
  search: new LRUCache(100, 60000),
  amaya: new LRUCache(200, 300000),
};

module.exports = { LRUCache, caches };