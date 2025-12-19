/**
 * Unit Tests for MockObjectClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockObjectClient } from '../../../../../src/providers/mock/clients/MockObjectClient';
import { ResourceNotFoundError, ValidationError } from '../../../../../src/core/types/common';

describe('MockObjectClient', () => {
  let client: MockObjectClient;

  beforeEach(() => {
    client = new MockObjectClient();
    client.reset();
  });

  describe('put', () => {
    test('should put an object', async () => {
      const data = Buffer.from('Hello World');
      await client.put('test-bucket', 'test-key', data);

      const obj = await client.get('test-bucket', 'test-key');
      expect((obj.data as Buffer).toString()).toBe('Hello World');
    });

    test('should put object with metadata', async () => {
      const data = Buffer.from('test');
      await client.put('test-bucket', 'test-key', data, {
        contentType: 'text/plain',
        metadata: { author: 'test' },
      });

      const obj = await client.get('test-bucket', 'test-key');
      expect(obj.contentType).toBe('text/plain');
    });

    test('should throw ValidationError for empty bucket', async () => {
      expect(client.put('', 'key', Buffer.from(''))).rejects.toBeInstanceOf(ValidationError);
    });

    test('should throw ValidationError for empty key', async () => {
      expect(client.put('bucket', '', Buffer.from(''))).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('get', () => {
    test('should get an object', async () => {
      await client.put('test-bucket', 'test-key', Buffer.from('content'));

      const obj = await client.get('test-bucket', 'test-key');
      expect(obj.bucket).toBe('test-bucket');
      expect(obj.key).toBe('test-key');
      expect(obj.data).toBeInstanceOf(Buffer);
    });

    test('should throw ResourceNotFoundError for non-existent object', async () => {
      expect(client.get('bucket', 'non-existent')).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    test('should include etag and lastModified', async () => {
      await client.put('test-bucket', 'test-key', Buffer.from('content'));
      const obj = await client.get('test-bucket', 'test-key');

      expect(obj.etag).toBeDefined();
      expect(obj.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    test('should delete an object', async () => {
      await client.put('test-bucket', 'test-key', Buffer.from('content'));
      await client.delete('test-bucket', 'test-key');

      expect(client.get('test-bucket', 'test-key')).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    test('should not throw for non-existent object', async () => {
      await client.delete('bucket', 'non-existent');
      // Should not throw
    });
  });

  describe('deleteBatch', () => {
    test('should delete multiple objects', async () => {
      await client.put('test-bucket', 'key1', Buffer.from('1'));
      await client.put('test-bucket', 'key2', Buffer.from('2'));
      await client.put('test-bucket', 'key3', Buffer.from('3'));

      await client.deleteBatch('test-bucket', ['key1', 'key2']);

      expect(client.exists('test-bucket', 'key1')).resolves.toBe(false);
      expect(client.exists('test-bucket', 'key2')).resolves.toBe(false);
      expect(client.exists('test-bucket', 'key3')).resolves.toBe(true);
    });
  });

  describe('list', () => {
    test('should list objects in bucket', async () => {
      await client.put('test-bucket', 'file1.txt', Buffer.from('1'));
      await client.put('test-bucket', 'file2.txt', Buffer.from('2'));
      await client.put('test-bucket', 'folder/file3.txt', Buffer.from('3'));

      const objects = await client.list('test-bucket');
      expect(objects.length).toBe(3);
    });

    test('should filter by prefix', async () => {
      await client.put('test-bucket', 'logs/2024/01.log', Buffer.from('1'));
      await client.put('test-bucket', 'logs/2024/02.log', Buffer.from('2'));
      await client.put('test-bucket', 'data/file.csv', Buffer.from('3'));

      const logs = await client.list('test-bucket', 'logs/');
      expect(logs.length).toBe(2);
    });

    test('should respect maxKeys option', async () => {
      await client.put('test-bucket', 'key1', Buffer.from('1'));
      await client.put('test-bucket', 'key2', Buffer.from('2'));
      await client.put('test-bucket', 'key3', Buffer.from('3'));

      const objects = await client.list('test-bucket', undefined, { maxKeys: 2 });
      expect(objects.length).toBe(2);
    });

    test('should return empty array for non-existent bucket', async () => {
      const objects = await client.list('non-existent');
      expect(objects).toEqual([]);
    });
  });

  describe('exists', () => {
    test('should return true for existing object', async () => {
      await client.put('test-bucket', 'test-key', Buffer.from('content'));
      expect(client.exists('test-bucket', 'test-key')).resolves.toBe(true);
    });

    test('should return false for non-existent object', async () => {
      expect(client.exists('test-bucket', 'non-existent')).resolves.toBe(false);
    });
  });

  describe('getMetadata', () => {
    test('should get object metadata', async () => {
      await client.put('test-bucket', 'test-key', Buffer.from('content'), {
        contentType: 'text/plain',
        metadata: { custom: 'value' },
      });

      const metadata = await client.getMetadata('test-bucket', 'test-key');
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.metadata?.custom).toBe('value');
    });

    test('should throw ResourceNotFoundError for non-existent object', async () => {
      expect(client.getMetadata('bucket', 'non-existent')).rejects.toBeInstanceOf(
        ResourceNotFoundError
      );
    });
  });

  describe('getSignedUrl', () => {
    test('should generate signed URL for get', async () => {
      const url = await client.getSignedUrl('test-bucket', 'test-key', 'get');
      expect(url).toContain('mock://signed/');
      expect(url).toContain('test-bucket');
      expect(url).toContain('test-key');
    });

    test('should generate signed URL for put', async () => {
      const url = await client.getSignedUrl('test-bucket', 'test-key', 'put');
      expect(url).toContain('mock://signed/');
    });

    test('should include expiration', async () => {
      const url = await client.getSignedUrl('test-bucket', 'test-key', 'get', 7200);
      expect(url).toContain('expires=7200');
    });
  });

  describe('integration', () => {
    test('should support full object lifecycle', async () => {
      // Put object
      await client.put('uploads', 'image.png', Buffer.from('image data'), {
        contentType: 'image/png',
      });

      // Get object
      const obj = await client.get('uploads', 'image.png');
      expect(obj.contentType).toBe('image/png');

      // List objects
      const objects = await client.list('uploads');
      expect(objects.length).toBe(1);

      // Delete object
      await client.delete('uploads', 'image.png');
      expect(client.exists('uploads', 'image.png')).resolves.toBe(false);
    });
  });
});
