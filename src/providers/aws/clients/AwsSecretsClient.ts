/**
 * AWS Secrets Client Implementation
 * Uses AWS Secrets Manager for secret retrieval
 *
 * Constitution Principle I: Provider Independence
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { SecretsClient } from '../../../core/clients/SecretsClient';
import type { SecretValue } from '../../../core/types/secret';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsSecretsClient implements SecretsClient {
  private client: SecretsManagerClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
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
    }

    this.client = new SecretsManagerClient(clientConfig);
  }

  async get(secretName: string, version?: string): Promise<SecretValue> {
    if (!secretName) {
      throw new ValidationError('Secret name is required');
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
        VersionId: version,
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        // Try to parse as JSON, fall back to string
        try {
          return JSON.parse(response.SecretString) as SecretValue;
        } catch {
          return response.SecretString;
        }
      }

      if (response.SecretBinary) {
        const decoder = new TextDecoder();
        return decoder.decode(response.SecretBinary);
      }

      throw new Error('Secret has no value');
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Secret', secretName);
      }
      throw new ServiceUnavailableError(`Failed to get secret: ${(error as Error).message}`);
    }
  }

  async getJson<T = unknown>(secretName: string, version?: string): Promise<T> {
    const value = await this.get(secretName, version);

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        throw new ValidationError(`Secret '${secretName}' is not valid JSON`);
      }
    }

    return value as T;
  }
}
