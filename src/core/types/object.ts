/**
 * Object Storage Types
 *
 * Types for ObjectStoreService - binary object/file storage
 * Provider-agnostic abstractions for AWS S3, Azure Blob Storage, etc.
 */

export interface ObjectData {
  bucket: string;
  key: string;
  data: Buffer | ReadableStream;
  size: number;
  contentType?: string;
  metadata?: ObjectMetadata;
  etag: string;
  lastModified: Date;
}

export interface ObjectMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface ObjectInfo {
  bucket: string;
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export interface ObjectLocation {
  bucket: string;
  key: string;
}

export interface BucketOptions {
  versioning?: boolean;
  encryption?: boolean;
  publicRead?: boolean;
  lifecycle?: LifecycleRule[];
}

export interface LifecycleRule {
  prefix: string;
  expirationDays: number;
}
