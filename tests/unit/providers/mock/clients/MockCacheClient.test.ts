/**
 * Unit Tests for MockCacheClient
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MockCacheClient } from '../../../../../src/providers/mock/clients/MockCacheClient';
import { MockCacheService } from '../../../../../src/providers/mock/MockCacheService';
import { ValidationError } from '../../../../../src/core/types/common';

describe('MockCacheClient', () => {
  let client: MockCacheClient;
  let service: MockCacheService;
  const clusterName = 'test-cluster';

  beforeEach(async () => {
    client = new MockCacheClient();
    service = new MockCacheService();
    await service.createCluster(clusterName);
  });

  afterEach(() => {
    client.destroy();
    MockCacheService.clusterDataStore.clear();
  });

  describe('get and set operations', () => {
    test('should set and get a string value', async () => {
      await client.set(clusterName, 'key1', 'value1');
      const value = await client.get(clusterName, 'key1');
      expect(value).toBe('value1');
    });

    test('should set and get an object value', async () => {
      const obj = { name: 'test', count: 42, nested: { data: 'value' } };
      await client.set(clusterName, 'key2', obj);
      const value = await client.get(clusterName, 'key2');
      expect(value).toBe(JSON.stringify(obj));
    });

    test('should return null for non-existent key', async () => {
      const value = await client.get(clusterName, 'non-existent');
      expect(value).toBeNull();
    });

    test('should overwrite existing value', async () => {
      await client.set(clusterName, 'key3', 'value1');
      await client.set(clusterName, 'key3', 'value2');
      const value = await client.get(clusterName, 'key3');
      expect(value).toBe('value2');
    });

    test('should throw error for missing cluster name', async () => {
      expect(client.set('', 'key', 'value')).rejects.toThrow(ValidationError);
      expect(client.get('', 'key')).rejects.toThrow(ValidationError);
    });

    test('should throw error for missing key', async () => {
      expect(client.set(clusterName, '', 'value')).rejects.toThrow(ValidationError);
      expect(client.get(clusterName, '')).rejects.toThrow(ValidationError);
    });
  });

  describe('set with options', () => {
    test('should set value with TTL', async () => {
      await client.set(clusterName, 'ttl-key', 'value', { ttl: 1 });
      const value = await client.get(clusterName, 'ttl-key');
      expect(value).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expired = await client.get(clusterName, 'ttl-key');
      expect(expired).toBeNull();
    });

    test('should set only if not exists (NX)', async () => {
      await client.set(clusterName, 'nx-key', 'value1');
      await client.set(clusterName, 'nx-key', 'value2', { onlyIfNotExists: true });

      const value = await client.get(clusterName, 'nx-key');
      expect(value).toBe('value1'); // Should not be updated
    });

    test('should set NX on non-existent key', async () => {
      await client.set(clusterName, 'new-nx-key', 'value', { onlyIfNotExists: true });
      const value = await client.get(clusterName, 'new-nx-key');
      expect(value).toBe('value');
    });

    test('should set only if exists (XX)', async () => {
      await client.set(clusterName, 'xx-key', 'value1', { onlyIfExists: true });
      const value = await client.get(clusterName, 'xx-key');
      expect(value).toBeNull(); // Should not be set

      await client.set(clusterName, 'xx-key', 'value1');
      await client.set(clusterName, 'xx-key', 'value2', { onlyIfExists: true });
      const updated = await client.get(clusterName, 'xx-key');
      expect(updated).toBe('value2');
    });
  });

  describe('delete and exists operations', () => {
    test('should delete existing key', async () => {
      await client.set(clusterName, 'delete-key', 'value');
      const deleted = await client.delete(clusterName, 'delete-key');
      expect(deleted).toBe(true);

      const value = await client.get(clusterName, 'delete-key');
      expect(value).toBeNull();
    });

    test('should return false when deleting non-existent key', async () => {
      const deleted = await client.delete(clusterName, 'non-existent');
      expect(deleted).toBe(false);
    });

    test('should check if key exists', async () => {
      await client.set(clusterName, 'exists-key', 'value');
      const exists = await client.exists(clusterName, 'exists-key');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      const exists = await client.exists(clusterName, 'non-existent');
      expect(exists).toBe(false);
    });

    test('should return false for expired key', async () => {
      await client.set(clusterName, 'expired-key', 'value', { ttl: 1 });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const exists = await client.exists(clusterName, 'expired-key');
      expect(exists).toBe(false);
    });
  });

  describe('TTL operations', () => {
    test('should set TTL on existing key', async () => {
      await client.set(clusterName, 'ttl-key', 'value');
      const result = await client.expire(clusterName, 'ttl-key', 2);
      expect(result).toBe(true);

      const ttl = await client.ttl(clusterName, 'ttl-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(2);
    });

    test('should return false when setting TTL on non-existent key', async () => {
      const result = await client.expire(clusterName, 'non-existent', 10);
      expect(result).toBe(false);
    });

    test('should return -2 for non-existent key', async () => {
      const ttl = await client.ttl(clusterName, 'non-existent');
      expect(ttl).toBe(-2);
    });

    test('should return -1 for key without expiration', async () => {
      await client.set(clusterName, 'no-ttl', 'value');
      const ttl = await client.ttl(clusterName, 'no-ttl');
      expect(ttl).toBe(-1);
    });

    test('should persist key (remove TTL)', async () => {
      await client.set(clusterName, 'persist-key', 'value', { ttl: 10 });
      const result = await client.persist(clusterName, 'persist-key');
      expect(result).toBe(true);

      const ttl = await client.ttl(clusterName, 'persist-key');
      expect(ttl).toBe(-1);
    });

    test('should return false when persisting non-existent key', async () => {
      const result = await client.persist(clusterName, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('increment and decrement operations', () => {
    test('should increment non-existent key from 0', async () => {
      const value = await client.increment(clusterName, 'counter');
      expect(value).toBe(1);
    });

    test('should increment existing numeric value', async () => {
      await client.set(clusterName, 'counter2', '5');
      const value = await client.increment(clusterName, 'counter2');
      expect(value).toBe(6);
    });

    test('should increment by custom amount', async () => {
      await client.set(clusterName, 'counter3', '10');
      const value = await client.increment(clusterName, 'counter3', 5);
      expect(value).toBe(15);
    });

    test('should decrement value', async () => {
      await client.set(clusterName, 'counter4', '10');
      const value = await client.decrement(clusterName, 'counter4');
      expect(value).toBe(9);
    });

    test('should decrement by custom amount', async () => {
      await client.set(clusterName, 'counter5', '20');
      const value = await client.decrement(clusterName, 'counter5', 7);
      expect(value).toBe(13);
    });

    test('should throw error for non-numeric value', async () => {
      await client.set(clusterName, 'non-numeric', 'abc');
      expect(client.increment(clusterName, 'non-numeric')).rejects.toThrow(
        'Value is not an integer'
      );
    });
  });

  describe('batch operations', () => {
    test('should get multiple keys (mget)', async () => {
      await client.set(clusterName, 'key1', 'value1');
      await client.set(clusterName, 'key2', 'value2');
      await client.set(clusterName, 'key3', 'value3');

      const result = await client.mget(clusterName, ['key1', 'key2', 'key3', 'non-existent']);

      expect(result.size).toBe(3);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBe('value3');
      expect(result.has('non-existent')).toBe(false);
    });

    test('should not return expired keys in mget', async () => {
      await client.set(clusterName, 'key1', 'value1');
      await client.set(clusterName, 'key2', 'value2', { ttl: 1 });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await client.mget(clusterName, ['key1', 'key2']);
      expect(result.size).toBe(1);
      expect(result.get('key1')).toBe('value1');
    });

    test('should set multiple keys (mset)', async () => {
      const entries = new Map<string, unknown>([
        ['key1', 'value1'],
        ['key2', { data: 'value2' }],
        ['key3', 'value3'],
      ]);

      await client.mset(clusterName, entries);

      const value1 = await client.get(clusterName, 'key1');
      const value2 = await client.get(clusterName, 'key2');
      const value3 = await client.get(clusterName, 'key3');

      expect(value1).toBe('value1');
      expect(value2).toBe(JSON.stringify({ data: 'value2' }));
      expect(value3).toBe('value3');
    });

    test('should set multiple keys with TTL', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await client.mset(clusterName, entries, { ttl: 1 });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const value1 = await client.get(clusterName, 'key1');
      const value2 = await client.get(clusterName, 'key2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    test('should delete multiple keys (mdel)', async () => {
      await client.set(clusterName, 'key1', 'value1');
      await client.set(clusterName, 'key2', 'value2');
      await client.set(clusterName, 'key3', 'value3');

      const result = await client.mdel(clusterName, ['key1', 'key2', 'non-existent']);

      expect(result.successful).toEqual(['key1', 'key2']);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0]?.key).toBe('non-existent');

      const remaining = await client.get(clusterName, 'key3');
      expect(remaining).toBe('value3');
    });

    test('should throw error for missing cluster name in batch ops', async () => {
      expect(client.mget('', ['key'])).rejects.toThrow(ValidationError);
      expect(client.mset('', new Map([['key', 'value']]))).rejects.toThrow(ValidationError);
      expect(client.mdel('', ['key'])).rejects.toThrow(ValidationError);
    });
  });

  describe('expiration cleanup', () => {
    test('should automatically clean up expired keys', async () => {
      await client.set(clusterName, 'cleanup-key1', 'value1', { ttl: 1 });
      await client.set(clusterName, 'cleanup-key2', 'value2', { ttl: 1 });

      // Wait for expiration and cleanup interval
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Trigger cleanup by calling a method
      const exists = await client.exists(clusterName, 'cleanup-key1');
      expect(exists).toBe(false);
    });
  });

  describe('serialization', () => {
    test('should serialize and deserialize objects', async () => {
      const obj = { name: 'test', age: 30, active: true };
      await client.set(clusterName, 'obj-key', obj);

      const value = await client.get(clusterName, 'obj-key');
      expect(value).toBe(JSON.stringify(obj));
    });

    test('should serialize arrays', async () => {
      const arr = [1, 2, 3, { nested: 'value' }];
      await client.set(clusterName, 'arr-key', arr);

      const value = await client.get(clusterName, 'arr-key');
      expect(value).toBe(JSON.stringify(arr));
    });

    test('should handle null values', async () => {
      await client.set(clusterName, 'null-key', null);
      const value = await client.get(clusterName, 'null-key');
      expect(value).toBe('null');
    });

    test('should handle boolean values', async () => {
      await client.set(clusterName, 'bool-key', true);
      const value = await client.get(clusterName, 'bool-key');
      expect(value).toBe('true');
    });

    test('should handle number values', async () => {
      await client.set(clusterName, 'num-key', 42);
      const value = await client.get(clusterName, 'num-key');
      expect(value).toBe('42');
    });
  });

  describe('multiple clusters', () => {
    const cluster2 = 'test-cluster-2';

    beforeEach(async () => {
      await service.createCluster(cluster2);
    });

    test('should isolate data between clusters', async () => {
      await client.set(clusterName, 'key1', 'value1');
      await client.set(cluster2, 'key1', 'value2');

      const value1 = await client.get(clusterName, 'key1');
      const value2 = await client.get(cluster2, 'key1');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });

    test('should delete from correct cluster', async () => {
      await client.set(clusterName, 'shared-key', 'value1');
      await client.set(cluster2, 'shared-key', 'value2');

      await client.delete(clusterName, 'shared-key');

      const value1 = await client.get(clusterName, 'shared-key');
      const value2 = await client.get(cluster2, 'shared-key');

      expect(value1).toBeNull();
      expect(value2).toBe('value2');
    });
  });
});
