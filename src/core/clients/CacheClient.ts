/**
 * CacheClient Interface - Data Plane
 *
 * Runtime interface for cache operations in hosted applications.
 * Provides key-value operations without cluster management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { CacheSetOptions, BatchCacheResult } from '../types/runtime';

export interface CacheClient {
  /**
   * Get value by key
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @returns Value if found, null if not found
   */
  get(clusterName: string, key: string): Promise<string | null>;

  /**
   * Set key-value pair
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @param value - Value to cache (will be serialized if object)
   * @param options - Optional set parameters (TTL, etc.)
   */
  set(clusterName: string, key: string, value: unknown, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete key from cache
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key to delete
   * @returns True if key existed and was deleted, false otherwise
   */
  delete(clusterName: string, key: string): Promise<boolean>;

  /**
   * Check if key exists in cache
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key to check
   * @returns True if key exists, false otherwise
   */
  exists(clusterName: string, key: string): Promise<boolean>;

  /**
   * Set expiration time for a key
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @param seconds - Time to live in seconds
   * @returns True if timeout was set, false if key doesn't exist
   */
  expire(clusterName: string, key: string, seconds: number): Promise<boolean>;

  /**
   * Get time to live for a key
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiration, -2 if key doesn't exist
   */
  ttl(clusterName: string, key: string): Promise<number>;

  /**
   * Remove expiration from a key
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @returns True if expiration was removed, false if key doesn't exist
   */
  persist(clusterName: string, key: string): Promise<boolean>;

  /**
   * Increment numeric value by amount
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @param amount - Amount to increment (default: 1)
   * @returns New value after increment
   */
  increment(clusterName: string, key: string, amount?: number): Promise<number>;

  /**
   * Decrement numeric value by amount
   * @param clusterName - Name of the cache cluster
   * @param key - Cache key
   * @param amount - Amount to decrement (default: 1)
   * @returns New value after decrement
   */
  decrement(clusterName: string, key: string, amount?: number): Promise<number>;

  /**
   * Get multiple values by keys
   * @param clusterName - Name of the cache cluster
   * @param keys - Array of cache keys
   * @returns Map of key-value pairs
   */
  mget(clusterName: string, keys: string[]): Promise<Map<string, string>>;

  /**
   * Set multiple key-value pairs
   * @param clusterName - Name of the cache cluster
   * @param entries - Map of key-value pairs
   * @param options - Optional set parameters applied to all entries
   */
  mset(
    clusterName: string,
    entries: Map<string, unknown>,
    options?: CacheSetOptions
  ): Promise<void>;

  /**
   * Delete multiple keys
   * @param clusterName - Name of the cache cluster
   * @param keys - Array of cache keys to delete
   * @returns Result with successful and failed deletions
   */
  mdel(clusterName: string, keys: string[]): Promise<BatchCacheResult>;
}
