/**
 * Unit tests for MockObjectStoreService
 *
 * Tests the in-memory object storage implementation.
 * TDD: These tests define the expected behavior before AWS implementation.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockObjectStoreService } from '../../../../src/providers/mock/MockObjectStoreService';
import { ResourceNotFoundError, ValidationError } from '../../../../src/core/types/common';

describe('MockObjectStoreService', () => {
  let service: MockObjectStoreService;
  const testBucket = 'test-bucket';

  beforeEach(() => {
    service = new MockObjectStoreService();
  });

  describe('createBucket', () => {
    it('should create a new bucket', async () => {
      await service.createBucket(testBucket);
      const objects = await service.listObjects(testBucket);
      expect(objects).toEqual([]);
    });

    it('should throw error if bucket already exists', async () => {
      await service.createBucket(testBucket);
      expect(service.createBucket(testBucket)).rejects.toThrow(ValidationError);
    });
  });

  describe('putObject and getObject', () => {
    beforeEach(async () => {
      await service.createBucket(testBucket);
    });

    it('should store and retrieve an object', async () => {
      const data = Buffer.from('Hello World');
      await service.putObject(testBucket, 'test.txt', data);

      const obj = await service.getObject(testBucket, 'test.txt');
      expect(obj.bucket).toBe(testBucket);
      expect(obj.key).toBe('test.txt');
      expect(obj.data).toEqual(data);
      expect(obj.size).toBe(data.length);
    });

    it('should store object with metadata', async () => {
      const data = Buffer.from('test');
      const metadata = {
        contentType: 'text/plain',
        metadata: { author: 'test' },
      };

      await service.putObject(testBucket, 'file.txt', data, metadata);
      const obj = await service.getObject(testBucket, 'file.txt');

      expect(obj.contentType).toBe('text/plain');
      expect(obj.metadata?.metadata?.['author']).toBe('test');
    });

    it('should throw error if object not found', async () => {
      expect(service.getObject(testBucket, 'missing.txt')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('deleteObject', () => {
    beforeEach(async () => {
      await service.createBucket(testBucket);
      await service.putObject(testBucket, 'delete-me.txt', Buffer.from('data'));
    });

    it('should delete an object', async () => {
      await service.deleteObject(testBucket, 'delete-me.txt');
      expect(service.getObject(testBucket, 'delete-me.txt')).rejects.toThrow();
    });

    it('should throw error if object does not exist', async () => {
      expect(service.deleteObject(testBucket, 'missing.txt')).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('listObjects', () => {
    beforeEach(async () => {
      await service.createBucket(testBucket);
      await service.putObject(testBucket, 'dir1/file1.txt', Buffer.from('1'));
      await service.putObject(testBucket, 'dir1/file2.txt', Buffer.from('2'));
      await service.putObject(testBucket, 'dir2/file3.txt', Buffer.from('3'));
    });

    it('should list all objects', async () => {
      const objects = await service.listObjects(testBucket);
      expect(objects.length).toBe(3);
    });

    it('should list objects with prefix', async () => {
      const objects = await service.listObjects(testBucket, 'dir1/');
      expect(objects.length).toBe(2);
      expect(objects.every((obj) => obj.key.startsWith('dir1/'))).toBe(true);
    });
  });

  describe('copyObject', () => {
    beforeEach(async () => {
      await service.createBucket(testBucket);
      await service.createBucket('dest-bucket');
      await service.putObject(testBucket, 'source.txt', Buffer.from('copy me'));
    });

    it('should copy object to new location', async () => {
      await service.copyObject(
        { bucket: testBucket, key: 'source.txt' },
        { bucket: 'dest-bucket', key: 'copied.txt' }
      );

      const copied = await service.getObject('dest-bucket', 'copied.txt');
      expect(copied.data).toEqual(Buffer.from('copy me'));
    });
  });

  describe('generatePresignedUrl', () => {
    beforeEach(async () => {
      await service.createBucket(testBucket);
    });

    it('should generate a presigned URL', async () => {
      const url = await service.generatePresignedUrl(testBucket, 'file.txt', 3600);
      expect(url).toContain(testBucket);
      expect(url).toContain('file.txt');
      expect(url).toContain('expires=3600');
    });
  });
});
