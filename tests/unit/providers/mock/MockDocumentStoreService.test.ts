/**
 * Unit tests for MockDocumentStoreService
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockDocumentStoreService } from '../../../../src/providers/mock/MockDocumentStoreService';
import { ResourceNotFoundError } from '../../../../src/core/types/common';

interface TestDocument {
  name: string;
  age: number;
  email?: string;
  status: string;
  createdAt?: Date;
}

describe('MockDocumentStoreService', () => {
  let service: MockDocumentStoreService;

  beforeEach(() => {
    service = new MockDocumentStoreService();
  });

  describe('Collection Management', () => {
    it('should create a collection', async () => {
      const collection = await service.createCollection('users');

      expect(collection.name).toBe('users');
      expect(collection.indexes).toEqual([]);
      expect(collection.documentCount).toBe(0);
    });

    it('should create a collection with options', async () => {
      const collection = await service.createCollection('sessions', {
        ttl: 3600,
        indexes: [
          { field: 'userId', unique: true },
          { field: 'sessionId', unique: false },
        ],
      });

      expect(collection.name).toBe('sessions');
      expect(collection.ttl).toBe(3600);
      expect(collection.indexes).toHaveLength(2);
    });

    it('should throw error when creating duplicate collection', async () => {
      await service.createCollection('users');

      expect(service.createCollection('users')).rejects.toThrow('Collection users already exists');
    });

    it('should get collection metadata', async () => {
      await service.createCollection('users');
      const collection = await service.getCollection('users');

      expect(collection.name).toBe('users');
      expect(collection.documentCount).toBe(0);
    });

    it('should throw error when getting non-existent collection', async () => {
      expect(service.getCollection('nonexistent')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should delete collection', async () => {
      await service.createCollection('users');
      await service.deleteCollection('users');

      expect(service.getCollection('users')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw error when deleting non-existent collection', async () => {
      expect(service.deleteCollection('nonexistent')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should list all collections', async () => {
      await service.createCollection('users');
      await service.createCollection('sessions');
      await service.createCollection('logs');

      const collections = await service.listCollections();

      expect(collections).toHaveLength(3);
      expect(collections).toContain('users');
      expect(collections).toContain('sessions');
      expect(collections).toContain('logs');
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await service.createCollection('users');
    });

    it('should insert a document', async () => {
      const doc = await service.insertDocument<TestDocument>('users', {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        status: 'active',
      });

      expect(doc._id).toBeDefined();
      expect((doc as unknown as TestDocument & { _id: string }).name).toBe('John Doe');
      expect((doc as unknown as TestDocument & { _id: string }).age).toBe(30);
      expect((doc as unknown as TestDocument & { _id: string }).email).toBe('john@example.com');
    });

    it('should throw error when inserting into non-existent collection', async () => {
      expect(service.insertDocument('nonexistent', { name: 'Test' })).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    it('should find document by ID', async () => {
      const inserted = await service.insertDocument<TestDocument>('users', {
        name: 'Jane Doe',
        age: 25,
        status: 'active',
      });

      const found = await service.findById<TestDocument>('users', inserted._id);

      expect(found).not.toBeNull();
      expect(found?._id).toBe(inserted._id);
      expect(found?.name).toBe('Jane Doe');
    });

    it('should return null for non-existent document', async () => {
      const found = await service.findById('users', 'nonexistent-id');

      expect(found).toBeNull();
    });

    it('should update a document', async () => {
      const inserted = await service.insertDocument<TestDocument>('users', {
        name: 'Bob Smith',
        age: 35,
        status: 'active',
      });

      const updated = await service.updateDocument<TestDocument>('users', inserted._id, {
        age: 36,
        email: 'bob@example.com',
      });

      const updatedDoc = updated as unknown as TestDocument & { _id: string };
      expect(updated._id).toBe(inserted._id);
      expect(updatedDoc.name).toBe('Bob Smith');
      expect(updatedDoc.age).toBe(36);
      expect(updatedDoc.email).toBe('bob@example.com');
    });

    it('should throw error when updating non-existent document', async () => {
      expect(
        service.updateDocument<TestDocument>('users', 'nonexistent-id', { age: 40 })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should delete a document', async () => {
      const inserted = await service.insertDocument<TestDocument>('users', {
        name: 'Alice Johnson',
        age: 28,
        status: 'active',
      });

      await service.deleteDocument('users', inserted._id);

      const found = await service.findById('users', inserted._id);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent document', async () => {
      expect(service.deleteDocument('users', 'nonexistent-id')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    it('should update document count', async () => {
      await service.insertDocument<TestDocument>('users', {
        name: 'User 1',
        age: 20,
        status: 'active',
      });
      await service.insertDocument<TestDocument>('users', {
        name: 'User 2',
        age: 25,
        status: 'active',
      });

      const collection = await service.getCollection('users');
      expect(collection.documentCount).toBe(2);

      const doc = await service.insertDocument<TestDocument>('users', {
        name: 'User 3',
        age: 30,
        status: 'active',
      });
      await service.deleteDocument('users', doc._id);

      const updatedCollection = await service.getCollection('users');
      expect(updatedCollection.documentCount).toBe(2);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await service.createCollection('users');

      // Insert test data
      await service.insertDocument<TestDocument>('users', {
        name: 'Alice',
        age: 25,
        status: 'active',
      });
      await service.insertDocument<TestDocument>('users', {
        name: 'Bob',
        age: 30,
        status: 'active',
      });
      await service.insertDocument<TestDocument>('users', {
        name: 'Charlie',
        age: 35,
        status: 'inactive',
      });
      await service.insertDocument<TestDocument>('users', {
        name: 'David',
        age: 40,
        status: 'active',
      });
    });

    it('should find documents with equality query', async () => {
      const results = await service.find<TestDocument>('users', {
        status: 'active',
      });

      expect(results).toHaveLength(3);
      expect(results.every((doc) => doc.status === 'active')).toBe(true);
    });

    it('should find documents with $eq operator', async () => {
      const results = await service.find<TestDocument>('users', {
        status: { $eq: 'inactive' } as const,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Charlie');
    });

    it('should find documents with $ne operator', async () => {
      const results = await service.find<TestDocument>('users', {
        status: { $ne: 'active' },
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Charlie');
    });

    it('should find documents with $gt operator', async () => {
      const results = await service.find<TestDocument>('users', {
        age: { $gt: 30 } as const,
      });

      expect(results).toHaveLength(2);
      expect(results.every((doc) => typeof doc.age === 'number' && doc.age > 30)).toBe(true);
    });

    it('should find documents with $gte operator', async () => {
      const results = await service.find<TestDocument>('users', {
        age: { $gte: 30 } as const,
      });

      expect(results).toHaveLength(3);
      expect(results.every((doc) => typeof doc.age === 'number' && doc.age >= 30)).toBe(true);
    });

    it('should find documents with $lt operator', async () => {
      const results = await service.find<TestDocument>('users', {
        age: { $lt: 35 } as const,
      });

      expect(results).toHaveLength(2);
      expect(results.every((doc) => typeof doc.age === 'number' && doc.age < 35)).toBe(true);
    });

    it('should find documents with $lte operator', async () => {
      const results = await service.find<TestDocument>('users', {
        age: { $lte: 35 } as const,
      });

      expect(results).toHaveLength(3);
      expect(results.every((doc) => typeof doc.age === 'number' && doc.age <= 35)).toBe(true);
    });

    it('should find documents with $in operator', async () => {
      const results = await service.find<TestDocument>('users', {
        name: { $in: ['Alice', 'Charlie'] },
      });

      expect(results).toHaveLength(2);
      expect(results.map((doc) => doc.name).sort()).toEqual(['Alice', 'Charlie']);
    });

    it('should find documents with $nin operator', async () => {
      const results = await service.find<TestDocument>('users', {
        name: { $nin: ['Alice', 'Charlie'] },
      });

      expect(results).toHaveLength(2);
      expect(results.map((doc) => doc.name).sort()).toEqual(['Bob', 'David']);
    });

    it('should find documents with limit', async () => {
      const results = await service.find<TestDocument>('users', { status: 'active' }, 2);

      expect(results).toHaveLength(2);
    });

    it('should find documents with multiple conditions', async () => {
      const results = await service.find<TestDocument>('users', {
        status: 'active',
        age: { $gte: 30 } as const,
      });

      expect(results).toHaveLength(2);
      expect(
        results.every(
          (doc) => doc.status === 'active' && typeof doc.age === 'number' && doc.age >= 30
        )
      ).toBe(true);
    });

    it('should return empty array when no documents match', async () => {
      const results = await service.find<TestDocument>('users', {
        status: 'deleted',
      });

      expect(results).toHaveLength(0);
    });

    it('should count all documents', async () => {
      const count = await service.count('users');

      expect(count).toBe(4);
    });

    it('should count documents matching query', async () => {
      const count = await service.count('users', { status: 'active' });

      expect(count).toBe(3);
    });

    it('should count documents with complex query', async () => {
      const count = await service.count('users', {
        status: 'active',
        age: { $gt: 25 } as const,
      });

      expect(count).toBe(2);
    });
  });

  describe('Date Query Operations', () => {
    let referenceDate: Date;
    let yesterday: Date;
    let tomorrow: Date;

    beforeEach(async () => {
      await service.createCollection('events');

      referenceDate = new Date();
      yesterday = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
      tomorrow = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);

      await service.insertDocument('events', {
        name: 'Event 1',
        createdAt: yesterday,
        status: 'completed',
      });
      await service.insertDocument('events', {
        name: 'Event 2',
        createdAt: referenceDate,
        status: 'active',
      });
      await service.insertDocument('events', {
        name: 'Event 3',
        createdAt: tomorrow,
        status: 'scheduled',
      });
    });

    it('should find documents with date $gt operator', async () => {
      const results = await service.find('events', {
        createdAt: { $gt: referenceDate },
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Event 3');
    });

    it('should find documents with date $gte operator', async () => {
      const results = await service.find('events', {
        createdAt: { $gte: referenceDate },
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should find documents with date $lt operator', async () => {
      const results = await service.find('events', {
        createdAt: { $lt: referenceDate },
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Event 1');
    });

    it('should find documents with date $lte operator', async () => {
      const results = await service.find('events', {
        createdAt: { $lte: referenceDate },
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });
});
