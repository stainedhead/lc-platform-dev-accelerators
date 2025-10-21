/**
 * Mock ObjectStoreService Implementation
 *
 * In-memory object storage for testing.
 * Supports streaming via Buffer conversion.
 */

import type { ObjectStoreService } from '../../core/services/ObjectStoreService';
import type {
  BucketOptions,
  ObjectData,
  ObjectInfo,
  ObjectLocation,
  ObjectMetadata,
} from '../../core/types/object';
import { ResourceNotFoundError, ValidationError } from '../../core/types/common';

interface StoredObject {
  data: Buffer;
  metadata: ObjectMetadata;
  etag: string;
  lastModified: Date;
}

export class MockObjectStoreService implements ObjectStoreService {
  private buckets = new Map<string, Map<string, StoredObject>>();

  async createBucket(name: string, _options?: BucketOptions): Promise<void> {
    if (this.buckets.has(name)) {
      throw new ValidationError(`Bucket ${name} already exists`);
    }
    this.buckets.set(name, new Map());
  }

  async putObject(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void> {
    const bucketStore = this.getBucket(bucket);

    // Convert ReadableStream to Buffer if needed
    const buffer: Buffer =
      data instanceof Buffer ? data : await this.streamToBuffer(data as ReadableStream);

    const storedObject: StoredObject = {
      data: buffer,
      metadata: metadata ?? {},
      etag: this.generateEtag(buffer),
      lastModified: new Date(),
    };

    bucketStore.set(key, storedObject);
  }

  async getObject(bucket: string, key: string): Promise<ObjectData> {
    const bucketStore = this.getBucket(bucket);
    const obj = bucketStore.get(key);

    if (!obj) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }

    const result: ObjectData = {
      bucket,
      key,
      data: obj.data,
      size: obj.data.length,
      metadata: obj.metadata,
      etag: obj.etag,
      lastModified: obj.lastModified,
    };

    // Add contentType only if it exists
    if (obj.metadata.contentType) {
      result.contentType = obj.metadata.contentType;
    }

    return result;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const bucketStore = this.getBucket(bucket);
    if (!bucketStore.has(key)) {
      throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
    }
    bucketStore.delete(key);
  }

  async listObjects(bucket: string, prefix?: string): Promise<ObjectInfo[]> {
    const bucketStore = this.getBucket(bucket);
    const objects: ObjectInfo[] = [];

    for (const [key, obj] of bucketStore.entries()) {
      if (!prefix || key.startsWith(prefix)) {
        const objInfo: ObjectInfo = {
          bucket,
          key,
          size: obj.data.length,
          lastModified: obj.lastModified,
          etag: obj.etag,
        };

        // Add contentType only if it exists
        if (obj.metadata.contentType) {
          objInfo.contentType = obj.metadata.contentType;
        }

        objects.push(objInfo);
      }
    }

    return objects;
  }

  async generatePresignedUrl(bucket: string, key: string, expires = 3600): Promise<string> {
    this.getBucket(bucket); // Verify bucket exists
    return `https://mock.lcplatform.com/${bucket}/${key}?expires=${expires}`;
  }

  async copyObject(source: ObjectLocation, destination: ObjectLocation): Promise<void> {
    const sourceObj = await this.getObject(source.bucket, source.key);
    await this.putObject(
      destination.bucket,
      destination.key,
      sourceObj.data as Buffer,
      sourceObj.metadata
    );
  }

  private getBucket(name: string): Map<string, StoredObject> {
    const bucket = this.buckets.get(name);
    if (!bucket) {
      throw new ResourceNotFoundError('Bucket', name);
    }
    return bucket;
  }

  private generateEtag(data: Buffer): string {
    // Simple mock etag (in real implementation, would use MD5 hash)
    return `"${data.length}-${Date.now()}"`;
  }

  private async streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }
}
