/**
 * AWS Object Client Implementation
 * Uses Amazon S3 for object storage
 *
 * Constitution Principle I: Provider Independence
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectClient } from '../../../core/clients/ObjectClient';
import type { ObjectData, ObjectMetadata, ObjectInfo } from '../../../core/types/object';
import type { ListOptions } from '../../../core/types/runtime';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsObjectClient implements ObjectClient {
  private s3Client: S3Client;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // Required for LocalStack
    }

    this.s3Client = new S3Client(clientConfig);
  }

  async get(bucket: string, key: string): Promise<ObjectData> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No content returned');
      }

      // Convert the body stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Build metadata object with only defined values
      const metadata: ObjectMetadata = {};
      if (response.ContentType) {
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

      const result: ObjectData = {
        bucket,
        key,
        data: buffer,
        size: response.ContentLength ?? buffer.length,
        etag: response.ETag ?? '',
        lastModified: response.LastModified ?? new Date(),
      };
      if (response.ContentType) {
        result.contentType = response.ContentType;
      }
      if (Object.keys(metadata).length > 0) {
        result.metadata = metadata;
      }

      return result;
    } catch (error) {
      if ((error as Error).name === 'NoSuchKey' || (error as Error).name === 'NotFound') {
        throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
      }
      throw new ServiceUnavailableError(`Failed to get object: ${(error as Error).message}`);
    }
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

    try {
      let body: Buffer;
      if (data instanceof Buffer) {
        body = data;
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
        body = Buffer.concat(chunks);
      }

      const command = new PutObjectCommand({
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
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join('&')
          : undefined,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to put object: ${(error as Error).message}`);
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to delete object: ${(error as Error).message}`);
    }
  }

  async deleteBatch(bucket: string, keys: string[]): Promise<void> {
    if (!bucket) {
      throw new ValidationError('Bucket is required');
    }

    if (keys.length === 0) {
      return;
    }

    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to delete objects: ${(error as Error).message}`);
    }
  }

  async list(bucket: string, prefix?: string, options?: ListOptions): Promise<ObjectInfo[]> {
    if (!bucket) {
      throw new ValidationError('Bucket is required');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: options?.maxKeys,
        ContinuationToken: options?.continuationToken,
        Delimiter: options?.delimiter,
      });

      const response = await this.s3Client.send(command);

      return (response.Contents ?? []).map((obj) => ({
        bucket,
        key: obj.Key ?? '',
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
        etag: obj.ETag ?? '',
      }));
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to list objects: ${(error as Error).message}`);
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as Error).name === 'NotFound' || (error as Error).name === 'NoSuchKey') {
        return false;
      }
      throw new ServiceUnavailableError(`Failed to check object: ${(error as Error).message}`);
    }
  }

  async getMetadata(bucket: string, key: string): Promise<ObjectMetadata> {
    if (!bucket || !key) {
      throw new ValidationError('Bucket and key are required');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Build metadata object with only defined values
      const result: ObjectMetadata = {};
      if (response.ContentType) {
        result.contentType = response.ContentType;
      }
      if (response.CacheControl) {
        result.cacheControl = response.CacheControl;
      }
      if (response.ContentDisposition) {
        result.contentDisposition = response.ContentDisposition;
      }
      if (response.ContentEncoding) {
        result.contentEncoding = response.ContentEncoding;
      }
      if (response.Metadata) {
        result.metadata = response.Metadata;
      }
      return result;
    } catch (error) {
      if ((error as Error).name === 'NotFound' || (error as Error).name === 'NoSuchKey') {
        throw new ResourceNotFoundError('Object', `${bucket}/${key}`);
      }
      throw new ServiceUnavailableError(`Failed to get metadata: ${(error as Error).message}`);
    }
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

    try {
      const command =
        operation === 'get'
          ? new GetObjectCommand({ Bucket: bucket, Key: key })
          : new PutObjectCommand({ Bucket: bucket, Key: key });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: expiresIn ?? 3600 });
      return url;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to get signed URL: ${(error as Error).message}`);
    }
  }
}
