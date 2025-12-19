/**
 * ObjectClient Interface - Data Plane
 *
 * Runtime interface for object storage operations in hosted applications.
 * Provides read/write operations without bucket management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { ObjectData, ObjectMetadata, ObjectInfo } from '../types/object';
import type { ListOptions } from '../types/runtime';

export interface ObjectClient {
  /**
   * Get an object from storage
   * @param bucket - Bucket name
   * @param key - Object key
   * @returns Object data including content and metadata
   */
  get(bucket: string, key: string): Promise<ObjectData>;

  /**
   * Put an object to storage
   * @param bucket - Bucket name
   * @param key - Object key
   * @param data - Object content (Buffer or stream)
   * @param metadata - Optional metadata
   */
  put(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void>;

  /**
   * Delete an object from storage
   * @param bucket - Bucket name
   * @param key - Object key
   */
  delete(bucket: string, key: string): Promise<void>;

  /**
   * Delete multiple objects at once
   * @param bucket - Bucket name
   * @param keys - Array of object keys
   */
  deleteBatch(bucket: string, keys: string[]): Promise<void>;

  /**
   * List objects in a bucket
   * @param bucket - Bucket name
   * @param prefix - Optional prefix filter
   * @param options - Optional list parameters
   * @returns Array of object info
   */
  list(bucket: string, prefix?: string, options?: ListOptions): Promise<ObjectInfo[]>;

  /**
   * Check if an object exists
   * @param bucket - Bucket name
   * @param key - Object key
   * @returns True if object exists
   */
  exists(bucket: string, key: string): Promise<boolean>;

  /**
   * Get object metadata without downloading content
   * @param bucket - Bucket name
   * @param key - Object key
   * @returns Object metadata
   */
  getMetadata(bucket: string, key: string): Promise<ObjectMetadata>;

  /**
   * Generate a pre-signed URL for temporary access
   * @param bucket - Bucket name
   * @param key - Object key
   * @param operation - 'get' for download, 'put' for upload
   * @param expiresIn - URL expiration in seconds (default: 3600)
   * @returns Pre-signed URL
   */
  getSignedUrl(
    bucket: string,
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string>;
}
