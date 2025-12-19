/**
 * Mock ObjectClient Implementation
 *
 * In-memory object storage client for testing without cloud resources.
 * Simulates object get/put/delete operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { ObjectClient } from '../../../core/clients/ObjectClient';
import type { ObjectData, ObjectMetadata, ObjectInfo } from '../../../core/types/object';
import type { ListOptions } from '../../../core/types/runtime';
import { ResourceNotFoundError, ValidationError } from '../../../core/types/common';
import { createHash, randomBytes } from 'crypto';

interface StoredObject {
  data: Buffer;
  metadata: ObjectMetadata;
  etag: string;
  lastModified: Date;
  size: number;
  contentType: string;
}

export class MockObjectClient implements ObjectClient {
  private buckets = new Map<string, Map<string, StoredObject>>();
  private signedUrls = new Map<string, { bucket: string; key: string; operation: 'get' | 'put' }>();

  /**
   * Reset all mock data
   */
  reset(): void {
    this.buckets.clear();
    this.signedUrls.clear();
  }

  /**
   * Pre-create a bucket for testing
   */
  createTestBucket(bucketName: string): void {
    if (!this.buckets.has(bucketName)) {
      this.buckets.set(bucketName, new Map());
    }
  }

  private getOrCreateBucket(bucketName: string): Map<string, StoredObject> {
    let bucket = this.buckets.get(bucketName);
    if (!bucket) {
      bucket = new Map();
      this.buckets.set(bucketName, bucket);
    }
    return bucket;
  }

  async get(bucket: string, key: string): Promise<ObjectData> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const bucketData = this.buckets.get(bucket);
    if (!bucketData) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }

    const obj = bucketData.get(key);
    if (!obj) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }

    return {
      bucket,
      key,
      data: obj.data,
      size: obj.size,
      contentType: obj.contentType,
      metadata: obj.metadata,
      etag: obj.etag,
      lastModified: obj.lastModified,
    };
  }

  async put(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const bucketData = this.getOrCreateBucket(bucket);

    let buffer: Buffer;
    if (data instanceof Buffer) {
      buffer = data;
    } else {
      // Handle ReadableStream
      const chunks: Uint8Array[] = [];
      const reader = (data as ReadableStream<Uint8Array>).getReader();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }
      buffer = Buffer.concat(chunks);
    }

    const etag = createHash('md5').update(buffer).digest('hex');

    bucketData.set(key, {
      data: buffer,
      metadata: metadata ?? {},
      etag,
      lastModified: new Date(),
      size: buffer.length,
      contentType: metadata?.contentType ?? 'application/octet-stream',
    });
  }

  async delete(bucket: string, key: string): Promise<void> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const bucketData = this.buckets.get(bucket);
    if (bucketData) {
      bucketData.delete(key);
    }
  }

  async deleteBatch(bucket: string, keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(bucket, key);
    }
  }

  async list(bucket: string, prefix?: string, options?: ListOptions): Promise<ObjectInfo[]> {
    if (!bucket) {
      throw new ValidationError('Bucket is required');
    }

    const bucketData = this.buckets.get(bucket);
    if (!bucketData) {
      return [];
    }

    let results: ObjectInfo[] = [];

    for (const [key, obj] of bucketData.entries()) {
      if (!prefix || key.startsWith(prefix)) {
        results.push({
          bucket,
          key,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
          contentType: obj.contentType,
        });
      }
    }

    // Sort by key
    results.sort((a, b) => a.key.localeCompare(b.key));

    // Apply max keys limit
    if (options?.maxKeys) {
      results = results.slice(0, options.maxKeys);
    }

    return results;
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const bucketData = this.buckets.get(bucket);
    if (!bucketData) {
      return false;
    }

    return bucketData.has(key);
  }

  async getMetadata(bucket: string, key: string): Promise<ObjectMetadata> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const bucketData = this.buckets.get(bucket);
    if (!bucketData) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }

    const obj = bucketData.get(key);
    if (!obj) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }

    return { ...obj.metadata };
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    const token = randomBytes(32).toString('hex');
    const url = `mock://signed/${bucket}/${key}?token=${token}&expires=${expiresIn ?? 3600}`;

    this.signedUrls.set(token, { bucket, key, operation });

    return url;
  }
}
