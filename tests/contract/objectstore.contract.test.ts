/**
 * Contract Test: ObjectStoreService
 *
 * Verifies that both AWS and Mock providers implement the same interface
 * with identical behavior. This ensures cloud-agnostic portability.
 *
 * T021: Contract test for ObjectStoreService interface
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { ObjectStoreService } from '../../src/core/services/ObjectStoreService';
import type { ObjectMetadata, ObjectLocation } from '../../src/core/types/object';
import { MockObjectStoreService } from '../../src/providers/mock/MockObjectStoreService';
import { ResourceNotFoundError, ValidationError } from '../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the ObjectStoreService contract.
 */
function testObjectStoreServiceContract(name: string, createService: () => ObjectStoreService) {
  describe(`ObjectStoreService Contract: ${name}`, () => {
    let service: ObjectStoreService;
    const testBucket = 'test-bucket';

    beforeEach(async () => {
      service = createService();
      await service.createBucket(testBucket);
    });

    test('createBucket - should create a new bucket', async () => {
      expect(service.createBucket('new-bucket')).resolves.not.toThrow();
    });

    test('createBucket - should create bucket with options', async () => {
      await expect(
        service.createBucket('encrypted-bucket', {
          versioning: true,
          encryption: true,
          publicRead: false,
        })
      ).resolves.not.toThrow();
    });

    test('createBucket - should throw error when bucket already exists', async () => {
      expect(service.createBucket(testBucket)).rejects.toThrow(ValidationError);
    });

    test('putObject - should upload object with Buffer data', async () => {
      const data = Buffer.from('Hello, World!');
      const metadata: ObjectMetadata = {
        contentType: 'text/plain',
        metadata: { author: 'test' },
      };

      await expect(
        service.putObject(testBucket, 'test.txt', data, metadata)
      ).resolves.not.toThrow();
    });

    test('putObject - should upload object without metadata', async () => {
      const data = Buffer.from('Simple content');

      await expect(service.putObject(testBucket, 'simple.txt', data)).resolves.not.toThrow();
    });

    test('putObject - should throw error for non-existent bucket', async () => {
      const data = Buffer.from('test');

      await expect(service.putObject('nonexistent-bucket', 'test.txt', data)).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('getObject - should retrieve uploaded object', async () => {
      const originalData = Buffer.from('Retrieved content');
      const metadata: ObjectMetadata = {
        contentType: 'application/json',
        tags: { version: '1.0' },
      };

      await service.putObject(testBucket, 'data.json', originalData, metadata);

      const obj = await service.getObject(testBucket, 'data.json');

      expect(obj).toBeDefined();
      expect(obj.bucket).toBe(testBucket);
      expect(obj.key).toBe('data.json');
      expect(Buffer.isBuffer(obj.data)).toBe(true);
      expect((obj.data as Buffer).toString()).toBe('Retrieved content');
      expect(obj.size).toBe(originalData.length);
      expect(obj.contentType).toBe('application/json');
      expect(obj.metadata?.tags).toEqual({ version: '1.0' });
      expect(obj.etag).toBeDefined();
      expect(obj.lastModified).toBeInstanceOf(Date);
    });

    test('getObject - should throw error for non-existent object', async () => {
      expect(service.getObject(testBucket, 'nonexistent.txt')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('getObject - should throw error for non-existent bucket', async () => {
      await expect(service.getObject('nonexistent-bucket', 'test.txt')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('deleteObject - should delete existing object', async () => {
      const data = Buffer.from('To be deleted');
      await service.putObject(testBucket, 'delete-me.txt', data);

      await expect(service.deleteObject(testBucket, 'delete-me.txt')).resolves.not.toThrow();

      expect(service.getObject(testBucket, 'delete-me.txt')).rejects.toThrow(ResourceNotFoundError);
    });

    test('deleteObject - should throw error for non-existent object', async () => {
      await expect(service.deleteObject(testBucket, 'nonexistent.txt')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('listObjects - should list all objects in bucket', async () => {
      await service.putObject(testBucket, 'file1.txt', Buffer.from('content1'));
      await service.putObject(testBucket, 'file2.txt', Buffer.from('content2'));
      await service.putObject(testBucket, 'file3.txt', Buffer.from('content3'));

      const objects = await service.listObjects(testBucket);

      expect(objects).toHaveLength(3);
      expect(objects.map((o) => o.key).sort()).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);

      objects.forEach((obj) => {
        expect(obj.bucket).toBe(testBucket);
        expect(obj.size).toBeGreaterThan(0);
        expect(obj.etag).toBeDefined();
        expect(obj.lastModified).toBeInstanceOf(Date);
      });
    });

    test('listObjects - should filter objects by prefix', async () => {
      await service.putObject(testBucket, 'docs/file1.md', Buffer.from('doc1'));
      await service.putObject(testBucket, 'docs/file2.md', Buffer.from('doc2'));
      await service.putObject(testBucket, 'images/pic1.jpg', Buffer.from('img1'));

      const docObjects = await service.listObjects(testBucket, 'docs/');

      expect(docObjects).toHaveLength(2);
      expect(docObjects.every((o) => o.key.startsWith('docs/'))).toBe(true);
    });

    test('listObjects - should return empty array for empty bucket', async () => {
      await service.createBucket('empty-bucket');
      const objects = await service.listObjects('empty-bucket');

      expect(objects).toEqual([]);
    });

    test('listObjects - should throw error for non-existent bucket', async () => {
      expect(service.listObjects('nonexistent-bucket')).rejects.toThrow(ResourceNotFoundError);
    });

    test('generatePresignedUrl - should generate URL with default expiration', async () => {
      await service.putObject(testBucket, 'signed.txt', Buffer.from('signed content'));

      const url = await service.generatePresignedUrl(testBucket, 'signed.txt');

      expect(url).toBeDefined();
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toContain(testBucket);
      expect(url).toContain('signed.txt');
    });

    test('generatePresignedUrl - should generate URL with custom expiration', async () => {
      await service.putObject(testBucket, 'custom.txt', Buffer.from('custom'));

      const url = await service.generatePresignedUrl(testBucket, 'custom.txt', 7200);

      expect(url).toBeDefined();
      expect(url).toContain('7200');
    });

    test('generatePresignedUrl - should work for non-existent object (pre-signed upload)', async () => {
      // Presigned URLs can be generated before object exists (for uploads)
      const url = await service.generatePresignedUrl(testBucket, 'future.txt');

      expect(url).toBeDefined();
      expect(url).toMatch(/^https?:\/\//);
    });

    test('copyObject - should copy object within same bucket', async () => {
      const originalData = Buffer.from('Original content');
      const metadata: ObjectMetadata = {
        contentType: 'text/plain',
        metadata: { source: 'original' },
      };

      await service.putObject(testBucket, 'original.txt', originalData, metadata);

      const source: ObjectLocation = { bucket: testBucket, key: 'original.txt' };
      const destination: ObjectLocation = { bucket: testBucket, key: 'copy.txt' };

      await service.copyObject(source, destination);

      const copied = await service.getObject(testBucket, 'copy.txt');

      expect((copied.data as Buffer).toString()).toBe('Original content');
      expect(copied.metadata).toEqual(metadata);
    });

    test('copyObject - should copy object to different bucket', async () => {
      const data = Buffer.from('Cross-bucket content');
      await service.putObject(testBucket, 'source.txt', data);

      await service.createBucket('destination-bucket');

      const source: ObjectLocation = { bucket: testBucket, key: 'source.txt' };
      const destination: ObjectLocation = {
        bucket: 'destination-bucket',
        key: 'dest.txt',
      };

      await service.copyObject(source, destination);

      const copied = await service.getObject('destination-bucket', 'dest.txt');

      expect((copied.data as Buffer).toString()).toBe('Cross-bucket content');
    });

    test('copyObject - should throw error for non-existent source', async () => {
      await service.createBucket('dest-bucket');

      const source: ObjectLocation = { bucket: testBucket, key: 'nonexistent.txt' };
      const destination: ObjectLocation = { bucket: 'dest-bucket', key: 'dest.txt' };

      expect(service.copyObject(source, destination)).rejects.toThrow(ResourceNotFoundError);
    });

    test('putObject/getObject - should preserve binary data integrity', async () => {
      // Create binary data with various byte values
      const binaryData = Buffer.from([0, 1, 127, 128, 255]);

      await service.putObject(testBucket, 'binary.dat', binaryData);

      const retrieved = await service.getObject(testBucket, 'binary.dat');

      expect(Buffer.isBuffer(retrieved.data)).toBe(true);
      expect((retrieved.data as Buffer).equals(binaryData)).toBe(true);
    });

    test('putObject - should handle large metadata', async () => {
      const data = Buffer.from('data with metadata');
      const metadata: ObjectMetadata = {
        contentType: 'application/octet-stream',
        metadata: {
          key1: 'value1',
          key2: 'value2',
          key3: 'value3',
        },
        tags: {
          tag1: 'tagvalue1',
          tag2: 'tagvalue2',
        },
      };

      await service.putObject(testBucket, 'metadata-test.dat', data, metadata);

      const retrieved = await service.getObject(testBucket, 'metadata-test.dat');

      expect(retrieved.metadata?.metadata).toEqual(metadata.metadata);
      expect(retrieved.metadata?.tags).toEqual(metadata.tags);
    });
  });
}

// Run contract tests against Mock provider
testObjectStoreServiceContract('MockObjectStoreService', () => new MockObjectStoreService());

// TODO: Uncomment when AWS provider is implemented
// import { AwsObjectStoreService } from '../../src/providers/aws/AwsObjectStoreService';
// testObjectStoreServiceContract('AwsObjectStoreService', () => new AwsObjectStoreService());
