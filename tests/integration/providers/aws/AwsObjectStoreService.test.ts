/**
 * Integration Test: AwsObjectStoreService with LocalStack
 *
 * Tests AWS S3 implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * T027: Integration test for AWS ObjectStoreService with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsObjectStoreService } from '../../../../src/providers/aws/AwsObjectStoreService';

// LocalStack S3 endpoint
const LOCALSTACK_ENDPOINT = 'http://localhost:4566';
const TEST_BUCKET = 'test-integration-bucket';

describe('AwsObjectStoreService Integration (LocalStack)', () => {
  let service: AwsObjectStoreService;

  beforeAll(() => {
    // Configure service to use LocalStack
    service = new AwsObjectStoreService({
      region: 'us-east-1',
      endpoint: LOCALSTACK_ENDPOINT,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test bucket
    // Note: S3 requires buckets to be empty before deletion
    try {
      const objects = await service.listObjects(TEST_BUCKET);
      for (const obj of objects) {
        await service.deleteObject(TEST_BUCKET, obj.key);
      }
      // Note: deleteBucket not in interface, LocalStack will clean up automatically
    } catch {
      // Ignore cleanup errors
    }
  });

  test('createBucket - should create S3 bucket in LocalStack', async () => {
    await expect(service.createBucket(TEST_BUCKET)).resolves.not.toThrow();
  });

  test('putObject - should upload object to LocalStack S3', async () => {
    const data = Buffer.from('Hello LocalStack S3!');

    await expect(
      service.putObject(TEST_BUCKET, 'test-file.txt', data, {
        contentType: 'text/plain',
        metadata: { creator: 'integration-test' },
      })
    ).resolves.not.toThrow();
  });

  test('getObject - should retrieve uploaded object from LocalStack', async () => {
    const data = Buffer.from('Test content for retrieval');
    await service.putObject(TEST_BUCKET, 'retrieve-test.txt', data, {
      contentType: 'text/plain',
    });

    const result = await service.getObject(TEST_BUCKET, 'retrieve-test.txt');

    expect(result.bucket).toBe(TEST_BUCKET);
    expect(result.key).toBe('retrieve-test.txt');
    expect(result.contentType).toBe('text/plain');
    expect(result.data.toString()).toBe('Test content for retrieval');
  });

  test('listObjects - should list objects in bucket', async () => {
    // Upload multiple objects
    await service.putObject(TEST_BUCKET, 'dir/file1.txt', Buffer.from('file1'));
    await service.putObject(TEST_BUCKET, 'dir/file2.txt', Buffer.from('file2'));
    await service.putObject(TEST_BUCKET, 'other.txt', Buffer.from('other'));

    const allObjects = await service.listObjects(TEST_BUCKET);
    expect(allObjects.length).toBeGreaterThanOrEqual(5); // Including previous test files

    const dirObjects = await service.listObjects(TEST_BUCKET, 'dir/');
    expect(dirObjects.length).toBe(2);
    expect(dirObjects.some((obj) => obj.key === 'dir/file1.txt')).toBe(true);
    expect(dirObjects.some((obj) => obj.key === 'dir/file2.txt')).toBe(true);
  });

  test('deleteObject - should delete object from LocalStack', async () => {
    await service.putObject(TEST_BUCKET, 'to-delete.txt', Buffer.from('delete me'));

    await expect(service.deleteObject(TEST_BUCKET, 'to-delete.txt')).resolves.not.toThrow();

    // Verify deletion
    const objects = await service.listObjects(TEST_BUCKET, 'to-delete.txt');
    expect(objects).toHaveLength(0);
  });

  test('copyObject - should copy object between buckets in LocalStack', async () => {
    const sourceBucket = TEST_BUCKET;
    const destBucket = `${TEST_BUCKET}-copy-dest`;

    // Create destination bucket
    await service.createBucket(destBucket);

    // Upload source object
    const sourceData = Buffer.from('Copy test data');
    await service.putObject(sourceBucket, 'source.txt', sourceData, {
      contentType: 'text/plain',
    });

    // Copy object using ObjectLocation interface
    await service.copyObject(
      { bucket: sourceBucket, key: 'source.txt' },
      { bucket: destBucket, key: 'copied.txt' }
    );

    // Verify copy
    const copiedObject = await service.getObject(destBucket, 'copied.txt');
    const copiedData = Buffer.isBuffer(copiedObject.data)
      ? copiedObject.data.toString()
      : 'stream';
    expect(copiedData).toBe('Copy test data');
    expect(copiedObject.contentType).toBe('text/plain');

    // Cleanup destination bucket
    await service.deleteObject(destBucket, 'copied.txt');
  });

  test('generatePresignedUrl - should generate presigned URL for LocalStack object', async () => {
    await service.putObject(TEST_BUCKET, 'presigned-test.txt', Buffer.from('presigned'));

    const url = await service.generatePresignedUrl(TEST_BUCKET, 'presigned-test.txt', 3600);

    expect(url).toContain('localhost:4566');
    expect(url).toContain(TEST_BUCKET);
    expect(url).toContain('presigned-test.txt');
    expect(url).toContain('X-Amz-Signature');
  });

  test('putObject with metadata and tags - should store metadata in LocalStack', async () => {
    const data = Buffer.from('Metadata test');

    await service.putObject(TEST_BUCKET, 'metadata-test.txt', data, {
      contentType: 'text/plain',
      metadata: {
        'x-custom-field': 'custom-value',
        'x-author': 'integration-test',
      },
    });

    const result = await service.getObject(TEST_BUCKET, 'metadata-test.txt');

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.metadata?.['x-custom-field']).toBe('custom-value');
    expect(result.metadata?.metadata?.['x-author']).toBe('integration-test');
  });

  test('Binary data preservation - should handle binary data correctly', async () => {
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header

    await service.putObject(TEST_BUCKET, 'binary-test.png', binaryData, {
      contentType: 'image/png',
    });

    const result = await service.getObject(TEST_BUCKET, 'binary-test.png');

    expect(result.contentType).toBe('image/png');

    // Handle Buffer or ReadableStream
    const resultData = Buffer.isBuffer(result.data) ? result.data : Buffer.from([]);
    expect(Buffer.compare(resultData, binaryData)).toBe(0); // Exact binary match
  });

  test('Large file handling - should handle files > 1MB', async () => {
    // Create 2MB file
    const largeData = Buffer.alloc(2 * 1024 * 1024, 'x');

    await service.putObject(TEST_BUCKET, 'large-file.bin', largeData, {
      contentType: 'application/octet-stream',
    });

    const result = await service.getObject(TEST_BUCKET, 'large-file.bin');

    expect(result.size).toBe(2 * 1024 * 1024);

    // Handle Buffer or ReadableStream
    if (Buffer.isBuffer(result.data)) {
      expect(result.data.length).toBe(2 * 1024 * 1024);
    } else {
      // ReadableStream case - just verify size is correct
      expect(result.size).toBe(2 * 1024 * 1024);
    }
  });
});
