/**
 * LRU Cache Wrapper
 *
 * Provides TTL-based caching for secrets and configuration.
 * Used to meet SC-004 (<100ms cached secret retrieval) and SC-005 (5-minute config refresh).
 *
 * Based on research.md decision #8: LRU cache with TTL
 */

import { LRUCache } from 'lru-cache';

export interface CacheOptions<V> {
  maxSize?: number;
  ttlMs?: number;
  onEviction?: (key: string, value: V) => void;
}

export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_TTL_MS = 300000; // 5 minutes (default for configuration)

/**
 * TTL-based LRU Cache
 *
 * Combines Least Recently Used eviction with Time To Live expiration.
 * Provides fast in-memory caching for frequently accessed data.
 */
export class TtlCache<V> {
  private cache: LRUCache<string, CacheEntry<V>>;
  private ttlMs: number;

  constructor(options: CacheOptions<V> = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

    this.cache = new LRUCache<string, CacheEntry<V>>({
      max: options.maxSize ?? DEFAULT_MAX_SIZE,
      dispose: (value, key) => {
        if (options.onEviction !== null && options.onEviction !== undefined) {
          options.onEviction(key, value.value);
        }
      },
    });
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  public get(key: string): V | undefined {
    const entry = this.cache.get(key);

    if (entry === null || entry === undefined) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  public set(key: string, value: V, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.ttlMs;
    const entry: CacheEntry<V> = {
      value,
      expiresAt: Date.now() + effectiveTtl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete value from cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Get cache size
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute value
   * If cache miss, compute value and store it
   */
  public async getOrCompute(key: string, compute: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }
}

/**
 * Predefined caches for common use cases
 */

/**
 * Secret cache: 5 minutes TTL (SC-004: <100ms cached retrieval)
 */
export function createSecretCache<V>(): TtlCache<V> {
  return new TtlCache<V>({
    maxSize: 500,
    ttlMs: 300000, // 5 minutes
  });
}

/**
 * Configuration cache: 5 minutes TTL (SC-005: 5-minute default refresh)
 */
export function createConfigCache<V>(): TtlCache<V> {
  return new TtlCache<V>({
    maxSize: 200,
    ttlMs: 300000, // 5 minutes
  });
}

/**
 * Short-lived cache: 1 minute TTL (for temporary data)
 */
export function createShortLivedCache<V>(): TtlCache<V> {
  return new TtlCache<V>({
    maxSize: 1000,
    ttlMs: 60000, // 1 minute
  });
}
