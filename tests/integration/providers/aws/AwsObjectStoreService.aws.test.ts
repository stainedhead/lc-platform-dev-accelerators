/**
 * Integration Test: AwsObjectStoreService with Real AWS S3
 *
 * Tests AWS S3 implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates test bucket during tests
 * - Cleans up all objects and bucket in afterAll
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsObjectStoreService } from '../../../../src/providers/aws/AwsObjectStoreService';
import {
  S3Client,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;
const TEST_BUCKET = `${TEST_PREFIX}-bucket`.toLowerCase(); // S3 bucket names must be lowercase

describe('AwsObjectStoreService Integration (AWS)', () => {
  let service: AwsObjectStoreService;
  let s3Client: S3Client;

  // Track created buckets for cleanup
  const createdBuckets: string[] = [];

  beforeAll(() => {
    // Configure service to use real AWS (no endpoint override)
    service = new AwsObjectStoreService({
      region: AWS_REGION,
    });

    s3Client = new S3Client({ region: AWS_REGION });
  });

  afterAll(async () => {
    // Cleanup: Delete all objects and buckets
    console.log(`Cleaning up ${createdBuckets.length} test buckets...`);

    for (const bucketName of createdBuckets) {
      try {
        // First, delete all objects in the bucket
        const listResponse = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deleteObjects = listResponse.Contents.map((obj) => ({ Key: obj.Key }));
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: { Objects: deleteObjects },
            })
          );
          console.log(`Deleted ${deleteObjects.length} objects from ${bucketName}`);
        }

        // Then delete the bucket
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        console.log(`Deleted bucket: ${bucketName}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete bucket ${bucketName}: ${(error as Error).message}`
        );
      }
    }
  });

  test('createBucket - should create S3 bucket', async () => {
    await service.createBucket(TEST_BUCKET);
    createdBuckets.push(TEST_BUCKET);

    // Verify bucket exists by listing objects (will throw if bucket doesn't exist)
    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects).toBeInstanceOf(Array);
    expect(objects.length).toBe(0);
  });

  test('createBucket - should create bucket with versioning enabled', async () => {
    const bucketName = `${TEST_PREFIX}-versioned`.toLowerCase();

    await service.createBucket(bucketName, { versioning: true });
    createdBuckets.push(bucketName);

    // Bucket should exist
    const objects = await service.listObjects(bucketName);
    expect(objects).toBeInstanceOf(Array);
  });

  test('putObject - should upload string content', async () => {
    const key = 'test-string.txt';
    const content = 'Hello, AWS S3!';

    await service.putObject(TEST_BUCKET, key, Buffer.from(content));

    // Verify by listing objects
    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(true);
  });

  test('putObject - should upload with metadata', async () => {
    const key = 'test-metadata.txt';
    const content = 'Content with metadata';

    await service.putObject(TEST_BUCKET, key, Buffer.from(content), {
      contentType: 'text/plain',
      tags: {
        environment: 'test',
        project: 'lcplatform',
      },
    });

    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(true);
  });

  test('putObject - should upload JSON content', async () => {
    const key = 'test-data.json';
    const content = JSON.stringify({
      name: 'test',
      values: [1, 2, 3],
      nested: { a: 'b' },
    });

    await service.putObject(TEST_BUCKET, key, Buffer.from(content), {
      contentType: 'application/json',
    });

    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(true);
  });

  test('putObject - should upload binary content', async () => {
    const key = 'test-binary.bin';
    const content = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);

    await service.putObject(TEST_BUCKET, key, content, {
      contentType: 'application/octet-stream',
    });

    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(true);
  });

  test('getObject - should retrieve uploaded content', async () => {
    const key = 'test-retrieve.txt';
    const content = 'Content to retrieve';

    await service.putObject(TEST_BUCKET, key, Buffer.from(content));

    const retrieved = await service.getObject(TEST_BUCKET, key);

    expect(retrieved.data).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(retrieved.data.toString()).toBe(content);
  });

  test('getObject - should retrieve JSON content', async () => {
    const key = 'test-retrieve.json';
    const originalData = { test: 'value', number: 42 };

    await service.putObject(TEST_BUCKET, key, Buffer.from(JSON.stringify(originalData)), {
      contentType: 'application/json',
    });

    const retrieved = await service.getObject(TEST_BUCKET, key);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const parsedData = JSON.parse(retrieved.data.toString()) as Record<string, unknown>;

    expect(parsedData).toEqual(originalData);
  });

  test('getObject - should retrieve binary content', async () => {
    const key = 'test-retrieve-binary.bin';
    const content = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

    await service.putObject(TEST_BUCKET, key, content);

    const retrieved = await service.getObject(TEST_BUCKET, key);

    // Handle both Buffer and ReadableStream return types
    const retrievedData = Buffer.isBuffer(retrieved.data)
      ? retrieved.data
      : Buffer.from(await new Response(retrieved.data).arrayBuffer());
    expect(Buffer.compare(retrievedData, content)).toBe(0);
  });

  test('listObjects - should list all objects in bucket', async () => {
    // Upload multiple objects
    const keys = ['list-test-1.txt', 'list-test-2.txt', 'list-test-3.txt'];

    for (const key of keys) {
      await service.putObject(TEST_BUCKET, key, Buffer.from(`Content for ${key}`));
    }

    const objects = await service.listObjects(TEST_BUCKET);

    expect(objects).toBeInstanceOf(Array);
    for (const key of keys) {
      expect(objects.some((obj) => obj.key === key)).toBe(true);
    }
  });

  test('listObjects - should filter by prefix', async () => {
    // Upload objects with different prefixes
    await service.putObject(TEST_BUCKET, 'folder-a/file1.txt', Buffer.from('A1'));
    await service.putObject(TEST_BUCKET, 'folder-a/file2.txt', Buffer.from('A2'));
    await service.putObject(TEST_BUCKET, 'folder-b/file1.txt', Buffer.from('B1'));

    const objectsA = await service.listObjects(TEST_BUCKET, 'folder-a/');
    const objectsB = await service.listObjects(TEST_BUCKET, 'folder-b/');

    expect(objectsA.length).toBe(2);
    expect(objectsA.every((obj) => obj.key.startsWith('folder-a/'))).toBe(true);

    expect(objectsB.length).toBe(1);
    expect(objectsB[0]?.key).toBe('folder-b/file1.txt');
  });

  test('deleteObject - should delete object', async () => {
    const key = 'test-delete.txt';

    await service.putObject(TEST_BUCKET, key, Buffer.from('To be deleted'));

    // Verify object exists
    let objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(true);

    // Delete object
    await service.deleteObject(TEST_BUCKET, key);

    // Verify object is deleted
    objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === key)).toBe(false);
  });

  test('copyObject - should copy object within same bucket', async () => {
    const sourceKey = 'copy-source.txt';
    const destKey = 'copy-destination.txt';
    const content = 'Content to copy';

    await service.putObject(TEST_BUCKET, sourceKey, Buffer.from(content));

    await service.copyObject(
      { bucket: TEST_BUCKET, key: sourceKey },
      { bucket: TEST_BUCKET, key: destKey }
    );

    // Verify both objects exist
    const objects = await service.listObjects(TEST_BUCKET);
    expect(objects.some((obj) => obj.key === sourceKey)).toBe(true);
    expect(objects.some((obj) => obj.key === destKey)).toBe(true);

    // Verify content matches
    const retrieved = await service.getObject(TEST_BUCKET, destKey);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(retrieved.data.toString()).toBe(content);
  });

  test('copyObject - should copy object to different bucket', async () => {
    const destBucket = `${TEST_PREFIX}-copy-dest`.toLowerCase();
    const sourceKey = 'cross-bucket-source.txt';
    const destKey = 'cross-bucket-dest.txt';
    const content = 'Cross-bucket content';

    // Create destination bucket
    await service.createBucket(destBucket);
    createdBuckets.push(destBucket);

    // Upload source
    await service.putObject(TEST_BUCKET, sourceKey, Buffer.from(content));

    // Copy to different bucket
    await service.copyObject(
      { bucket: TEST_BUCKET, key: sourceKey },
      { bucket: destBucket, key: destKey }
    );

    // Verify copy exists in destination bucket
    const destObjects = await service.listObjects(destBucket);
    expect(destObjects.some((obj) => obj.key === destKey)).toBe(true);

    // Verify content matches
    const retrieved = await service.getObject(destBucket, destKey);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(retrieved.data.toString()).toBe(content);
  });

  test('generatePresignedUrl - should generate valid presigned URL', async () => {
    const key = 'presigned-test.txt';
    const content = 'Presigned URL content';

    await service.putObject(TEST_BUCKET, key, Buffer.from(content));

    const url = await service.generatePresignedUrl(TEST_BUCKET, key);

    expect(url).toBeDefined();
    expect(url).toContain(TEST_BUCKET);
    expect(url).toContain(key);
    expect(url).toContain('X-Amz-Signature');

    // URL should be accessible (we can't easily test this without making HTTP request)
  });

  test('generatePresignedUrl - should respect custom expiration', async () => {
    const key = 'presigned-expiry.txt';

    await service.putObject(TEST_BUCKET, key, Buffer.from('Expiry test'));

    const url = await service.generatePresignedUrl(TEST_BUCKET, key, 300); // 5 minutes

    expect(url).toBeDefined();
    expect(url).toContain('X-Amz-Expires=300');
  });

  test('Large file upload - should handle larger content', async () => {
    const key = 'large-file.txt';
    // Create 1MB of content
    const content = Buffer.alloc(1024 * 1024, 'x');

    await service.putObject(TEST_BUCKET, key, content);

    const objects = await service.listObjects(TEST_BUCKET);
    const uploadedObj = objects.find((obj) => obj.key === key);

    expect(uploadedObj).toBeDefined();
    expect(uploadedObj?.size).toBe(1024 * 1024);
  });

  test('Special characters in key - should handle special characters', async () => {
    const key = 'special/path with spaces/file-name_test.txt';
    const content = 'Special characters test';

    await service.putObject(TEST_BUCKET, key, Buffer.from(content));

    const retrieved = await service.getObject(TEST_BUCKET, key);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(retrieved.data.toString()).toBe(content);

    // Cleanup
    await service.deleteObject(TEST_BUCKET, key);
  });

  test('Error handling - should throw on non-existent object', async () => {
    await expect(service.getObject(TEST_BUCKET, `nonexistent-${Date.now()}.txt`)).rejects.toThrow();
  });

  test('Error handling - should throw on non-existent bucket', async () => {
    await expect(
      service.getObject(`nonexistent-bucket-${Date.now()}`, 'test.txt')
    ).rejects.toThrow();
  });

  test('Concurrent operations - should handle parallel uploads', async () => {
    const keys = Array.from({ length: 5 }, (_, i) => `concurrent-${i}.txt`);

    const uploadPromises = keys.map((key, i) =>
      service.putObject(TEST_BUCKET, key, Buffer.from(`Concurrent content ${i}`))
    );

    await Promise.all(uploadPromises);

    const objects = await service.listObjects(TEST_BUCKET);
    for (const key of keys) {
      expect(objects.some((obj) => obj.key === key)).toBe(true);
    }
  });
});
