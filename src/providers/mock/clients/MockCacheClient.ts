/**
 * Mock Cache Client Implementation
 * In-memory implementation of CacheClient for testing
 */

import type { CacheClient } from '../../../core/clients/CacheClient';
import type { CacheSetOptions, BatchCacheResult } from '../../../core/types/runtime';
import { ValidationError } from '../../../core/types/common';
import { MockCacheService } from '../MockCacheService';

interface CacheEntry {
  value: string;
  expiresAt?: Date;
}

export class MockCacheClient implements CacheClient {
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredKeys();
    }, 60000);
  }

  private cleanupExpiredKeys(): void {
    const now = new Date();
    for (const [, data] of MockCacheService.clusterDataStore.entries()) {
      for (const [key, entry] of data.entries()) {
        if (entry.expiresAt && entry.expiresAt <= now) {
          data.delete(key);
        }
      }
    }
  }

  private getClusterData(clusterName: string): Map<string, CacheEntry> {
    let data = MockCacheService.clusterDataStore.get(clusterName);
    if (!data) {
      data = new Map<string, CacheEntry>();
      MockCacheService.clusterDataStore.set(clusterName, data);
    }
    return data;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.expiresAt) {
      return false;
    }
    return entry.expiresAt <= new Date();
  }

  async get(clusterName: string, key: string): Promise<string | null> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      data.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    clusterName: string,
    key: string,
    value: unknown,
    options: CacheSetOptions = {}
  ): Promise<void> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const exists = data.has(key);

    if (options.onlyIfNotExists && exists) {
      return;
    }

    if (options.onlyIfExists && !exists) {
      return;
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const entry: CacheEntry = {
      value: stringValue,
    };

    if (options.ttl) {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + options.ttl);
      entry.expiresAt = expiresAt;
    }

    data.set(key, entry);
  }

  async delete(clusterName: string, key: string): Promise<boolean> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    return data.delete(key);
  }

  async exists(clusterName: string, key: string): Promise<boolean> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      data.delete(key);
      return false;
    }

    return true;
  }

  async expire(clusterName: string, key: string, seconds: number): Promise<boolean> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    if (!entry || this.isExpired(entry)) {
      return false;
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + seconds);
    entry.expiresAt = expiresAt;

    return true;
  }

  async ttl(clusterName: string, key: string): Promise<number> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    if (!entry) {
      return -2;
    }

    if (this.isExpired(entry)) {
      data.delete(key);
      return -2;
    }

    if (!entry.expiresAt) {
      return -1;
    }

    const now = new Date();
    const ttlMs = entry.expiresAt.getTime() - now.getTime();
    return Math.ceil(ttlMs / 1000);
  }

  async persist(clusterName: string, key: string): Promise<boolean> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    if (!entry || this.isExpired(entry)) {
      return false;
    }

    delete entry.expiresAt;
    return true;
  }

  async increment(clusterName: string, key: string, amount: number = 1): Promise<number> {
    if (!clusterName || !key) {
      throw new ValidationError('Cluster name and key are required');
    }

    const data = this.getClusterData(clusterName);
    const entry = data.get(key);

    let currentValue = 0;
    if (entry && !this.isExpired(entry)) {
      currentValue = Number.parseInt(entry.value, 10);
      if (Number.isNaN(currentValue)) {
        throw new Error('Value is not an integer');
      }
    }

    const newValue = currentValue + amount;
    data.set(key, { value: newValue.toString() });

    return newValue;
  }

  async decrement(clusterName: string, key: string, amount: number = 1): Promise<number> {
    return this.increment(clusterName, key, -amount);
  }

  async mget(clusterName: string, keys: string[]): Promise<Map<string, string>> {
    if (!clusterName) {
      throw new ValidationError('Cluster name is required');
    }

    const result = new Map<string, string>();
    const data = this.getClusterData(clusterName);

    for (const key of keys) {
      const entry = data.get(key);
      if (entry && !this.isExpired(entry)) {
        result.set(key, entry.value);
      }
    }

    return result;
  }

  async mset(
    clusterName: string,
    entries: Map<string, unknown>,
    options: CacheSetOptions = {}
  ): Promise<void> {
    if (!clusterName) {
      throw new ValidationError('Cluster name is required');
    }

    for (const [key, value] of entries.entries()) {
      await this.set(clusterName, key, value, options);
    }
  }

  async mdel(clusterName: string, keys: string[]): Promise<BatchCacheResult> {
    if (!clusterName) {
      throw new ValidationError('Cluster name is required');
    }

    const successful: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];
    const data = this.getClusterData(clusterName);

    for (const key of keys) {
      try {
        const deleted = data.delete(key);
        if (deleted) {
          successful.push(key);
        } else {
          failed.push({ key, error: 'Key not found' });
        }
      } catch (error) {
        failed.push({ key, error: (error as Error).message });
      }
    }

    return { successful, failed };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
