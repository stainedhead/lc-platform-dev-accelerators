/**
 * Unit Tests for MockDocumentClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockDocumentClient } from '../../../../../src/providers/mock/clients/MockDocumentClient';
import { ResourceNotFoundError, ValidationError } from '../../../../../src/core/types/common';

describe('MockDocumentClient', () => {
  let client: MockDocumentClient;

  beforeEach(() => {
    client = new MockDocumentClient();
    client.reset();
  });

  describe('put', () => {
    test('should put a document', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice', age: 30 });
      const doc = await client.get('users', 'u1');
      expect(doc?.name).toBe('Alice');
      expect(doc?.age).toBe(30);
    });

    test('should overwrite existing document', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });
      await client.put('users', { _id: 'u1', name: 'Bob' });

      const doc = await client.get('users', 'u1');
      expect(doc?.name).toBe('Bob');
    });

    test('should throw ValidationError for missing _id', async () => {
      expect(client.put('users', { name: 'Alice' } as never)).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    test('should throw ValidationError for empty collection', async () => {
      expect(client.put('', { _id: 'u1' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('get', () => {
    test('should get a document by ID', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });
      const doc = await client.get('users', 'u1');
      expect(doc?._id).toBe('u1');
      expect(doc?.name).toBe('Alice');
    });

    test('should return null for non-existent document', async () => {
      const doc = await client.get('users', 'non-existent');
      expect(doc).toBeNull();
    });

    test('should return null for non-existent collection', async () => {
      const doc = await client.get('non-existent', 'id');
      expect(doc).toBeNull();
    });
  });

  describe('update', () => {
    test('should update specific fields', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice', age: 30 });
      await client.update('users', 'u1', { age: 31 });

      const doc = await client.get('users', 'u1');
      expect(doc?.name).toBe('Alice');
      expect(doc?.age).toBe(31);
    });

    test('should add new fields', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });
      await client.update('users', 'u1', { email: 'alice@example.com' });

      const doc = await client.get('users', 'u1');
      expect(doc?.email).toBe('alice@example.com');
    });

    test('should throw ResourceNotFoundError for non-existent document', async () => {
      expect(client.update('users', 'non-existent', { name: 'Bob' })).rejects.toBeInstanceOf(
        ResourceNotFoundError
      );
    });
  });

  describe('delete', () => {
    test('should delete a document', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });
      await client.delete('users', 'u1');

      const doc = await client.get('users', 'u1');
      expect(doc).toBeNull();
    });

    test('should not throw for non-existent document', async () => {
      await client.delete('users', 'non-existent');
      // Should not throw
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await client.put('users', { _id: 'u1', name: 'Alice', age: 30, active: true });
      await client.put('users', { _id: 'u2', name: 'Bob', age: 25, active: false });
      await client.put('users', { _id: 'u3', name: 'Charlie', age: 35, active: true });
    });

    test('should query by equality', async () => {
      const results = await client.query('users', { active: true });
      expect(results.length).toBe(2);
    });

    test('should query with $eq operator', async () => {
      const results = await client.query('users', { name: { $eq: 'Alice' } });
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe('Alice');
    });

    test('should query with $ne operator', async () => {
      const results = await client.query('users', { name: { $ne: 'Alice' } });
      expect(results.length).toBe(2);
    });

    test('should query with $gt operator', async () => {
      const results = await client.query('users', { age: { $gt: 25 } });
      expect(results.length).toBe(2);
    });

    test('should query with $gte operator', async () => {
      const results = await client.query('users', { age: { $gte: 30 } });
      expect(results.length).toBe(2);
    });

    test('should query with $lt operator', async () => {
      const results = await client.query('users', { age: { $lt: 35 } });
      expect(results.length).toBe(2);
    });

    test('should query with $lte operator', async () => {
      const results = await client.query('users', { age: { $lte: 30 } });
      expect(results.length).toBe(2);
    });

    test('should query with $in operator', async () => {
      const results = await client.query('users', { name: { $in: ['Alice', 'Bob'] } });
      expect(results.length).toBe(2);
    });

    test('should query with $nin operator', async () => {
      const results = await client.query('users', { name: { $nin: ['Alice', 'Bob'] } });
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe('Charlie');
    });

    test('should return empty array for no matches', async () => {
      const results = await client.query('users', { age: { $gt: 100 } });
      expect(results).toEqual([]);
    });

    test('should return empty array for non-existent collection', async () => {
      const results = await client.query('non-existent', {});
      expect(results).toEqual([]);
    });
  });

  describe('batchGet', () => {
    test('should get multiple documents', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });
      await client.put('users', { _id: 'u2', name: 'Bob' });
      await client.put('users', { _id: 'u3', name: 'Charlie' });

      const docs = await client.batchGet('users', ['u1', 'u3']);
      expect(docs.length).toBe(2);
      expect(docs[0]?.name).toBe('Alice');
      expect(docs[1]?.name).toBe('Charlie');
    });

    test('should return null for non-existent documents', async () => {
      await client.put('users', { _id: 'u1', name: 'Alice' });

      const docs = await client.batchGet('users', ['u1', 'u2']);
      expect(docs[0]?.name).toBe('Alice');
      expect(docs[1]).toBeNull();
    });
  });

  describe('batchPut', () => {
    test('should put multiple documents', async () => {
      await client.batchPut('users', [
        { _id: 'u1', name: 'Alice' },
        { _id: 'u2', name: 'Bob' },
        { _id: 'u3', name: 'Charlie' },
      ]);

      const docs = await client.batchGet('users', ['u1', 'u2', 'u3']);
      expect(docs.length).toBe(3);
    });
  });

  describe('integration', () => {
    test('should support typical document store patterns', async () => {
      // Create documents
      await client.put('orders', {
        _id: 'o1',
        userId: 'u1',
        status: 'pending',
        total: 100,
      });

      await client.put('orders', {
        _id: 'o2',
        userId: 'u1',
        status: 'completed',
        total: 200,
      });

      await client.put('orders', {
        _id: 'o3',
        userId: 'u2',
        status: 'pending',
        total: 150,
      });

      // Query orders for a user
      const userOrders = await client.query('orders', { userId: 'u1' });
      expect(userOrders.length).toBe(2);

      // Query pending orders
      const pendingOrders = await client.query('orders', { status: 'pending' });
      expect(pendingOrders.length).toBe(2);

      // Update order status
      await client.update('orders', 'o1', { status: 'completed' });

      const updated = await client.get('orders', 'o1');
      expect(updated?.status).toBe('completed');
    });
  });
});
