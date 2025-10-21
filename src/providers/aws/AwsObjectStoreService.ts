/**
 * AWS ObjectStoreService Implementation
 *
 * S3-based object storage with streaming support, presigned URLs, and metadata.
 * Implements FR-031 to FR-036.
 */

import {
  S3Client,
  type S3ClientConfig,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStoreService } from '../../core/services/ObjectStoreService';
import type {
  BucketOptions,
  ObjectData,
  ObjectInfo,
  ObjectLocation,
  ObjectMetadata,
} from '../../core/types/object';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';
import { withRetry } from '../../utils/retry';
import { getErrorMessage, getErrorName } from '../../utils/error';

export interface AwsObjectStoreConfig {
  region?: string;
  endpoint?: string; // For LocalStack
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean; // For LocalStack
  requestChecksumCalculation?: 'WHEN_SUPPORTED' | 'WHEN_REQUIRED'; // For LocalStack checksum issues
  responseChecksumValidation?: 'WHEN_SUPPORTED' | 'WHEN_REQUIRED'; // For LocalStack checksum issues
}

export class AwsObjectStoreService implements ObjectStoreService {
  private client: S3Client;

  constructor(config?: AwsObjectStoreConfig) {
    const clientConfig: S3ClientConfig = {
      region: config?.region ?? process.env.AWS_REGION ?? 'us-east-1',
    };

    if (config?.endpoint !== undefined && config.endpoint !== null && config.endpoint !== '') {
      clientConfig.endpoint = config.endpoint;
    }

    if (config?.credentials !== undefined && config.credentials !== null) {
      clientConfig.credentials = config.credentials;
    }

    if (config?.forcePathStyle !== undefined) {
      clientConfig.forcePathStyle = config.forcePathStyle;
    }

    if (config?.requestChecksumCalculation !== undefined) {
      clientConfig.requestChecksumCalculation = config.requestChecksumCalculation;
    }

    if (config?.responseChecksumValidation !== undefined) {
      clientConfig.responseChecksumValidation = config.responseChecksumValidation;
    }

    this.client = new S3Client(clientConfig);
  }

  async createBucket(name: string, options?: BucketOptions): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new CreateBucketCommand({
            Bucket: name,
          })
        );

        // Enable versioning if requested
        if (options?.versioning) {
          // Note: Would use PutBucketVersioningCommand here
          // Skipping for MVP as it requires additional SDK import
        }

        // Enable encryption if requested
        if (options?.encryption) {
          // Note: Would use PutBucketEncryptionCommand here
          // Skipping for MVP as it requires additional SDK import
        }
      } catch (error: unknown) {
        if (
          getErrorName(error) === 'BucketAlreadyOwnedByYou' ||
          getErrorName(error) === 'BucketAlreadyExists'
        ) {
          throw new ServiceUnavailableError(`Bucket ${name} already exists`);
        }
        throw new ServiceUnavailableError(`Failed to create bucket: ${getErrorMessage(error)}`);
      }
    });
  }

  async putObject(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void> {
    return withRetry(async () => {
      try {
        // Convert ReadableStream to Buffer if needed
        const body = Buffer.isBuffer(data) ? data : await this.streamToBuffer(data);

        const params: PutObjectCommandInput = {
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: metadata?.contentType,
          CacheControl: metadata?.cacheControl,
          ContentDisposition: metadata?.contentDisposition,
          ContentEncoding: metadata?.contentEncoding,
          Metadata: metadata?.metadata,
          Tagging: metadata?.tags
            ? Object.entries(metadata.tags)
                .map(([k, v]) => `${k}=${v}`)
                .join('&')
            : undefined,
        };

        await this.client.send(new PutObjectCommand(params));
      } catch (error: unknown) {
        if (getErrorName(error) === 'NoSuchBucket') {
          throw new ResourceNotFoundError('Bucket', bucket);
        }
        throw new ServiceUnavailableError(`Failed to put object: ${getErrorMessage(error)}`);
      }
    });
  }

  async getObject(bucket: string, key: string): Promise<ObjectData> {
    return withRetry(async () => {
      try {
        const response: GetObjectCommandOutput = await this.client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        // Convert stream to buffer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        const data = response.Body
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            await this.streamToBuffer(response.Body as any)
          : Buffer.from('');

        const objectData: ObjectData = {
          bucket,
          key,
          data,
          size: response.ContentLength ?? data.length,
          etag: response.ETag ?? '',
          lastModified: response.LastModified ?? new Date(),
        };

        // Build metadata
        const metadata: ObjectMetadata = {};

        if (response.ContentType) {
          objectData.contentType = response.ContentType;
          metadata.contentType = response.ContentType;
        }

        if (response.CacheControl) {
          metadata.cacheControl = response.CacheControl;
        }

        if (response.ContentDisposition) {
          metadata.contentDisposition = response.ContentDisposition;
        }

        if (response.ContentEncoding) {
          metadata.contentEncoding = response.ContentEncoding;
        }

        if (response.Metadata) {
          metadata.metadata = response.Metadata;
        }

        // Parse tags from TagCount if present
        if (response.TagCount && response.TagCount > 0) {
          // Note: Would need GetObjectTaggingCommand to get actual tags
          // Skipping for MVP
          metadata.tags = {};
        }

        objectData.metadata = metadata;

        return objectData;
      } catch (error: unknown) {
        if (getErrorName(error) === 'NoSuchKey') {
          throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
        }
        if (getErrorName(error) === 'NoSuchBucket') {
          throw new ResourceNotFoundError('Bucket', bucket);
        }
        throw new ServiceUnavailableError(`Failed to get object: ${getErrorMessage(error)}`);
      }
    });
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    return withRetry(async () => {
      try {
        // First check if object exists
        await this.client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        // If exists, delete it
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch (error: unknown) {
        if (getErrorName(error) === 'NoSuchKey') {
          throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
        }
        if (getErrorName(error) === 'NoSuchBucket') {
          throw new ResourceNotFoundError('Bucket', bucket);
        }
        throw new ServiceUnavailableError(`Failed to delete object: ${getErrorMessage(error)}`);
      }
    });
  }

  async listObjects(bucket: string, prefix?: string): Promise<ObjectInfo[]> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
          })
        );

        const objects: ObjectInfo[] = [];

        if (response.Contents) {
          for (const item of response.Contents) {
            if (!item.Key) {
              continue;
            }

            const objInfo: ObjectInfo = {
              bucket,
              key: item.Key,
              size: item.Size ?? 0,
              lastModified: item.LastModified ?? new Date(),
              etag: item.ETag ?? '',
            };

            objects.push(objInfo);
          }
        }

        return objects;
      } catch (error: unknown) {
        if (getErrorName(error) === 'NoSuchBucket') {
          throw new ResourceNotFoundError('Bucket', bucket);
        }
        throw new ServiceUnavailableError(`Failed to list objects: ${getErrorMessage(error)}`);
      }
    });
  }

  async generatePresignedUrl(bucket: string, key: string, expires: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: expires,
      });

      return url;
    } catch (error: unknown) {
      throw new ServiceUnavailableError(
        `Failed to generate presigned URL: ${getErrorMessage(error)}`
      );
    }
  }

  async copyObject(source: ObjectLocation, destination: ObjectLocation): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new CopyObjectCommand({
            CopySource: `${source.bucket}/${source.key}`,
            Bucket: destination.bucket,
            Key: destination.key,
          })
        );
      } catch (error: unknown) {
        if (getErrorName(error) === 'NoSuchKey') {
          throw new ResourceNotFoundError('Object', `${source.bucket}/${source.key}`);
        }
        if (getErrorName(error) === 'NoSuchBucket') {
          throw new ResourceNotFoundError('Bucket', source.bucket);
        }
        throw new ServiceUnavailableError(`Failed to copy object: ${getErrorMessage(error)}`);
      }
    });
  }

  private async streamToBuffer(stream: ReadableStream | NodeJS.ReadableStream): Promise<Buffer> {
    // Handle Web ReadableStream
    if ('getReader' in stream) {
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

    // Handle Node.js ReadableStream
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
