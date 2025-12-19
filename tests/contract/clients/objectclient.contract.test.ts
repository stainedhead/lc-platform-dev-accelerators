/**
 * Contract Test: ObjectClient
 *
 * Verifies that both AWS and Mock providers implement the ObjectClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { ObjectClient } from '../../../src/core/clients/ObjectClient';
import { MockObjectClient } from '../../../src/providers/mock/clients/MockObjectClient';
import { ResourceNotFoundError, ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the ObjectClient contract.
 */
function testObjectClientContract(
  name: string,
  createClient: () => ObjectClient,
  cleanup?: () => void
) {
  describe(`ObjectClient Contract: ${name}`, () => {
    let client: ObjectClient;
    const testBucket = 'test-bucket';

    beforeEach(() => {
      client = createClient();
      if (cleanup) {
        cleanup();
      }
    });

    describe('put', () => {
      test('should put object with Buffer data', async () => {
        const data = Buffer.from('Hello, World!');
        await expect(client.put(testBucket, 'test.txt', data)).resolves.toBeUndefined();
      });

      test('should put object with metadata', async () => {
        const data = Buffer.from('Content with metadata');
        await expect(
          client.put(testBucket, 'meta.txt', data, {
            contentType: 'text/plain',
            metadata: { author: 'test' },
          })
        ).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.put('', 'key', Buffer.from('data'))).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.put(testBucket, '', Buffer.from('data'))).rejects.toThrow(
          ValidationError
        );
      });
    });

    describe('get', () => {
      test('should get previously stored object', async () => {
        const originalData = Buffer.from('Retrieved content');
        await client.put(testBucket, 'data.txt', originalData, { contentType: 'text/plain' });

        const result = await client.get(testBucket, 'data.txt');

        expect(result).toBeDefined();
        expect(result.bucket).toBe(testBucket);
        expect(result.key).toBe('data.txt');
        expect(Buffer.isBuffer(result.data)).toBe(true);
        expect((result.data as Buffer).toString()).toBe('Retrieved content');
        expect(result.size).toBe(originalData.length);
        expect(result.etag).toBeDefined();
        expect(result.lastModified).toBeInstanceOf(Date);
      });

      test('should throw ResourceNotFoundError for non-existent object', async () => {
        await expect(client.get(testBucket, 'nonexistent.txt')).rejects.toThrow(
          ResourceNotFoundError
        );
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.get('', 'key')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.get(testBucket, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('delete', () => {
      test('should delete existing object', async () => {
        await client.put(testBucket, 'to-delete.txt', Buffer.from('Delete me'));

        await expect(client.delete(testBucket, 'to-delete.txt')).resolves.toBeUndefined();

        // Verify it's deleted
        await expect(client.get(testBucket, 'to-delete.txt')).rejects.toThrow(
          ResourceNotFoundError
        );
      });

      test('should not throw for non-existent object', async () => {
        // S3 delete is idempotent
        await expect(client.delete(testBucket, 'nonexistent.txt')).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.delete('', 'key')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.delete(testBucket, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('deleteBatch', () => {
      test('should delete multiple objects', async () => {
        await client.put(testBucket, 'file1.txt', Buffer.from('1'));
        await client.put(testBucket, 'file2.txt', Buffer.from('2'));
        await client.put(testBucket, 'file3.txt', Buffer.from('3'));

        await expect(
          client.deleteBatch(testBucket, ['file1.txt', 'file2.txt', 'file3.txt'])
        ).resolves.toBeUndefined();

        // Verify all deleted
        await expect(client.get(testBucket, 'file1.txt')).rejects.toThrow(ResourceNotFoundError);
        await expect(client.get(testBucket, 'file2.txt')).rejects.toThrow(ResourceNotFoundError);
        await expect(client.get(testBucket, 'file3.txt')).rejects.toThrow(ResourceNotFoundError);
      });

      test('should handle empty keys array', async () => {
        await expect(client.deleteBatch(testBucket, [])).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.deleteBatch('', ['key'])).rejects.toThrow(ValidationError);
      });
    });

    describe('list', () => {
      test('should list objects in bucket', async () => {
        await client.put(testBucket, 'list1.txt', Buffer.from('1'));
        await client.put(testBucket, 'list2.txt', Buffer.from('2'));

        const objects = await client.list(testBucket);

        expect(Array.isArray(objects)).toBe(true);
        expect(objects.length).toBeGreaterThanOrEqual(2);
        objects.forEach((obj) => {
          expect(obj.bucket).toBe(testBucket);
          expect(obj.key).toBeDefined();
          expect(typeof obj.size).toBe('number');
          expect(obj.lastModified).toBeInstanceOf(Date);
          expect(obj.etag).toBeDefined();
        });
      });

      test('should filter by prefix', async () => {
        await client.put(testBucket, 'docs/file1.md', Buffer.from('doc1'));
        await client.put(testBucket, 'docs/file2.md', Buffer.from('doc2'));
        await client.put(testBucket, 'images/pic.jpg', Buffer.from('img'));

        const docObjects = await client.list(testBucket, 'docs/');

        expect(docObjects.every((o) => o.key.startsWith('docs/'))).toBe(true);
      });

      test('should return empty array for non-matching prefix', async () => {
        const objects = await client.list(testBucket, 'nonexistent-prefix/');

        expect(objects).toEqual([]);
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.list('')).rejects.toThrow(ValidationError);
      });
    });

    describe('exists', () => {
      test('should return true for existing object', async () => {
        await client.put(testBucket, 'exists.txt', Buffer.from('I exist'));

        const exists = await client.exists(testBucket, 'exists.txt');

        expect(exists).toBe(true);
      });

      test('should return false for non-existent object', async () => {
        const exists = await client.exists(testBucket, 'does-not-exist.txt');

        expect(exists).toBe(false);
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.exists('', 'key')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.exists(testBucket, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('getMetadata', () => {
      test('should get metadata for existing object', async () => {
        await client.put(testBucket, 'with-meta.txt', Buffer.from('data'), {
          contentType: 'text/plain',
          metadata: { custom: 'value' },
        });

        const metadata = await client.getMetadata(testBucket, 'with-meta.txt');

        expect(metadata).toBeDefined();
        expect(metadata.contentType).toBe('text/plain');
      });

      test('should throw ResourceNotFoundError for non-existent object', async () => {
        await expect(client.getMetadata(testBucket, 'nonexistent.txt')).rejects.toThrow(
          ResourceNotFoundError
        );
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.getMetadata('', 'key')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.getMetadata(testBucket, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('getSignedUrl', () => {
      test('should generate signed URL for get operation', async () => {
        await client.put(testBucket, 'signed.txt', Buffer.from('signed content'));

        const url = await client.getSignedUrl(testBucket, 'signed.txt', 'get');

        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });

      test('should generate signed URL for put operation', async () => {
        const url = await client.getSignedUrl(testBucket, 'upload.txt', 'put');

        expect(url).toBeDefined();
        expect(typeof url).toBe('string');
      });

      test('should accept custom expiration time', async () => {
        const url = await client.getSignedUrl(testBucket, 'expiry.txt', 'get', 7200);

        expect(url).toBeDefined();
      });

      test('should throw ValidationError for empty bucket', async () => {
        await expect(client.getSignedUrl('', 'key', 'get')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.getSignedUrl(testBucket, '', 'get')).rejects.toThrow(ValidationError);
      });
    });

    describe('binary data integrity', () => {
      test('should preserve binary data', async () => {
        const binaryData = Buffer.from([0, 1, 127, 128, 255, 0, 255]);
        await client.put(testBucket, 'binary.dat', binaryData);

        const result = await client.get(testBucket, 'binary.dat');

        expect(Buffer.isBuffer(result.data)).toBe(true);
        expect((result.data as Buffer).equals(binaryData)).toBe(true);
      });

      test('should handle empty buffer', async () => {
        const emptyData = Buffer.from([]);
        await client.put(testBucket, 'empty.dat', emptyData);

        const result = await client.get(testBucket, 'empty.dat');

        expect(result.size).toBe(0);
      });
    });
  });
}

// Run contract tests against Mock provider
testObjectClientContract(
  'MockObjectClient',
  () => new MockObjectClient(),
  () => {
    // Cleanup is handled by creating new instance
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsObjectClient } from '../../../src/providers/aws/clients/AwsObjectClient';
// testObjectClientContract('AwsObjectClient', () => new AwsObjectClient({ provider: ProviderType.AWS }));
