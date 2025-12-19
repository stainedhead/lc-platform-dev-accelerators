/**
 * Integration Test: AwsObjectClient with LocalStack
 *
 * Tests AWS S3 Object Client implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * T028: Integration test for AWS ObjectClient with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsObjectClient } from '../../../../../src/providers/aws/clients/AwsObjectClient';
import {
  AwsObjectStoreService,
  type AwsObjectStoreConfig,
} from '../../../../../src/providers/aws/AwsObjectStoreService';
import { ProviderType, type ProviderConfig } from '../../../../../src/core/types/common';

// LocalStack S3 endpoint - use environment variable if available
const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const TEST_BUCKET = `test-object-client-${Date.now()}`;

const clientConfig: ProviderConfig = {
  provider: ProviderType.AWS,
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
};

const serviceConfig: AwsObjectStoreConfig = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
  forcePathStyle: true, // Required for LocalStack compatibility
  // Disable checksum validation for LocalStack (checksums don't match)
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
};

describe('AwsObjectClient Integration (LocalStack)', () => {
  let client: AwsObjectClient;
  let objectStoreService: AwsObjectStoreService;

  beforeAll(async () => {
    // Configure client to use LocalStack
    client = new AwsObjectClient(clientConfig);

    // Use ObjectStoreService (Control Plane) to create the test bucket
    objectStoreService = new AwsObjectStoreService(serviceConfig);
    await objectStoreService.createBucket(TEST_BUCKET);
  });

  afterAll(async () => {
    // Cleanup: Delete all objects and bucket
    try {
      const objects = await client.list(TEST_BUCKET);
      if (objects.length > 0) {
        await client.deleteBatch(
          TEST_BUCKET,
          objects.map((o) => o.key)
        );
      }
      // Note: deleteBucket would be called via the service
    } catch {
      // Ignore cleanup errors
    }
  });

  test('put - should upload object to LocalStack S3', async () => {
    const data = Buffer.from('Hello LocalStack S3!');

    await client.put(TEST_BUCKET, 'test-file.txt', data, {
      contentType: 'text/plain',
      metadata: { creator: 'integration-test' },
    });
  });

  test('get - should retrieve uploaded object', async () => {
    const data = Buffer.from('Test content for retrieval');
    await client.put(TEST_BUCKET, 'retrieve-test.txt', data, {
      contentType: 'text/plain',
    });

    const result = await client.get(TEST_BUCKET, 'retrieve-test.txt');

    expect(result.bucket).toBe(TEST_BUCKET);
    expect(result.key).toBe('retrieve-test.txt');
    expect(result.contentType).toBe('text/plain');
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    expect(result.data.toString()).toBe('Test content for retrieval');
  });

  test('delete - should delete object', async () => {
    await client.put(TEST_BUCKET, 'to-delete.txt', Buffer.from('delete me'));

    await client.delete(TEST_BUCKET, 'to-delete.txt');

    // Verify deletion
    const exists = await client.exists(TEST_BUCKET, 'to-delete.txt');
    expect(exists).toBe(false);
  });

  test('deleteBatch - should delete multiple objects', async () => {
    // Upload multiple objects
    await client.put(TEST_BUCKET, 'batch-1.txt', Buffer.from('batch 1'));
    await client.put(TEST_BUCKET, 'batch-2.txt', Buffer.from('batch 2'));
    await client.put(TEST_BUCKET, 'batch-3.txt', Buffer.from('batch 3'));

    await client.deleteBatch(TEST_BUCKET, ['batch-1.txt', 'batch-2.txt', 'batch-3.txt']);

    // Verify deletion
    const exists1 = await client.exists(TEST_BUCKET, 'batch-1.txt');
    const exists2 = await client.exists(TEST_BUCKET, 'batch-2.txt');
    const exists3 = await client.exists(TEST_BUCKET, 'batch-3.txt');

    expect(exists1).toBe(false);
    expect(exists2).toBe(false);
    expect(exists3).toBe(false);
  });

  test('list - should list objects in bucket', async () => {
    // Upload multiple objects with different prefixes
    await client.put(TEST_BUCKET, 'dir1/file1.txt', Buffer.from('file1'));
    await client.put(TEST_BUCKET, 'dir1/file2.txt', Buffer.from('file2'));
    await client.put(TEST_BUCKET, 'dir2/other.txt', Buffer.from('other'));

    const allObjects = await client.list(TEST_BUCKET);
    expect(allObjects.length).toBeGreaterThanOrEqual(3);

    const dir1Objects = await client.list(TEST_BUCKET, 'dir1/');
    expect(dir1Objects.length).toBe(2);
    expect(dir1Objects.some((obj) => obj.key === 'dir1/file1.txt')).toBe(true);
    expect(dir1Objects.some((obj) => obj.key === 'dir1/file2.txt')).toBe(true);
  });

  test('exists - should return true for existing object', async () => {
    await client.put(TEST_BUCKET, 'exists-test.txt', Buffer.from('exists'));

    const exists = await client.exists(TEST_BUCKET, 'exists-test.txt');
    expect(exists).toBe(true);
  });

  test('exists - should return false for non-existing object', async () => {
    const exists = await client.exists(TEST_BUCKET, 'nonexistent-file.txt');
    expect(exists).toBe(false);
  });

  test('getMetadata - should retrieve object metadata', async () => {
    await client.put(TEST_BUCKET, 'metadata-test.txt', Buffer.from('metadata test'), {
      contentType: 'text/plain',
      cacheControl: 'max-age=3600',
      metadata: { 'x-custom': 'value' },
    });

    const metadata = await client.getMetadata(TEST_BUCKET, 'metadata-test.txt');

    expect(metadata.contentType).toBe('text/plain');
    expect(metadata.cacheControl).toBe('max-age=3600');
    expect(metadata.metadata?.['x-custom']).toBe('value');
  });

  test('getSignedUrl - should generate presigned URL for GET', async () => {
    await client.put(TEST_BUCKET, 'presigned-test.txt', Buffer.from('presigned'));

    const url = await client.getSignedUrl(TEST_BUCKET, 'presigned-test.txt', 'get', 3600);

    expect(url).toContain('localhost:4566');
    expect(url).toContain(TEST_BUCKET);
    expect(url).toContain('presigned-test.txt');
    expect(url).toContain('X-Amz-Signature');
  });

  test('getSignedUrl - should generate presigned URL for PUT', async () => {
    const url = await client.getSignedUrl(TEST_BUCKET, 'upload-target.txt', 'put', 3600);

    expect(url).toContain('localhost:4566');
    expect(url).toContain(TEST_BUCKET);
    expect(url).toContain('upload-target.txt');
    expect(url).toContain('X-Amz-Signature');
  });

  test('binary data - should handle binary data correctly', async () => {
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header

    await client.put(TEST_BUCKET, 'binary-test.png', binaryData, {
      contentType: 'image/png',
    });

    const result = await client.get(TEST_BUCKET, 'binary-test.png');

    expect(result.contentType).toBe('image/png');
    expect(Buffer.compare(result.data as Buffer, binaryData)).toBe(0); // Exact binary match
  });

  test('large file - should handle files > 1MB', async () => {
    // Create 2MB file
    const largeData = Buffer.alloc(2 * 1024 * 1024, 'x');

    await client.put(TEST_BUCKET, 'large-file.bin', largeData, {
      contentType: 'application/octet-stream',
    });

    const result = await client.get(TEST_BUCKET, 'large-file.bin');

    expect(result.size).toBe(2 * 1024 * 1024);
    expect((result.data as Buffer).length).toBe(2 * 1024 * 1024);
  });

  test('list with options - should paginate results', async () => {
    // Upload several objects
    for (let i = 0; i < 5; i++) {
      await client.put(TEST_BUCKET, `page-test-${i}.txt`, Buffer.from(`content ${i}`));
    }

    const firstPage = await client.list(TEST_BUCKET, 'page-test-', { maxKeys: 2 });

    expect(firstPage.length).toBeLessThanOrEqual(2);
  });
});
