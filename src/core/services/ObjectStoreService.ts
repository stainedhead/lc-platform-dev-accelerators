/**
 * ObjectStoreService Interface
 *
 * Cloud-agnostic interface for object/file storage operations.
 * No AWS/Azure-specific types - pure abstraction.
 *
 * FR-031 to FR-036
 * Constitution Principle I: Provider Independence
 */

import type {
  BucketOptions,
  ObjectData,
  ObjectInfo,
  ObjectLocation,
  ObjectMetadata,
} from '../types/object';

export interface ObjectStoreService {
  /**
   * Create a storage bucket
   * FR-031: Create buckets with versioning and encryption
   */
  createBucket(name: string, options?: BucketOptions): Promise<void>;

  /**
   * Upload an object to storage
   * FR-032: Upload objects with metadata and tags
   */
  putObject(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void>;

  /**
   * Download an object from storage
   * FR-033: Download objects with streaming support
   */
  getObject(bucket: string, key: string): Promise<ObjectData>;

  /**
   * Delete an object from storage
   * FR-034: Delete objects
   */
  deleteObject(bucket: string, key: string): Promise<void>;

  /**
   * List objects in a bucket
   * FR-035: List objects with prefix filtering
   */
  listObjects(bucket: string, prefix?: string): Promise<ObjectInfo[]>;

  /**
   * Generate a presigned URL for temporary access
   * FR-036: Generate presigned URLs (default 1 hour expiration)
   */
  generatePresignedUrl(bucket: string, key: string, expires?: number): Promise<string>;

  /**
   * Copy an object between locations
   * FR-034: Copy objects within or across buckets
   */
  copyObject(source: ObjectLocation, destination: ObjectLocation): Promise<void>;
}
