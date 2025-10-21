/**
 * AWS Secrets Service Implementation
 * Uses AWS Secrets Manager for secure secret storage
 */

import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  RotateSecretCommand,
  TagResourceCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import type { SecretsService } from '../../core/services/SecretsService';
import type {
  Secret,
  SecretValue,
  CreateSecretParams,
  UpdateSecretParams,
  RotationConfig,
} from '../../core/types/secret';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsSecretsService implements SecretsService {
  private client: SecretsManagerClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
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

    this.client = new SecretsManagerClient(clientConfig);
  }

  async createSecret(params: CreateSecretParams): Promise<Secret> {
    try {
      const secretString =
        typeof params.value === 'string' ? params.value : JSON.stringify(params.value);

      const command = new CreateSecretCommand({
        Name: params.name,
        Description: params.description,
        SecretString: secretString,
        Tags: params.tags
          ? Object.entries(params.tags).map(([Key, Value]) => ({ Key, Value }))
          : undefined,
      });

      const response = await this.client.send(command);

      const now = new Date();
      const secret: Secret = {
        name: response.Name || params.name,
        version: response.VersionId || '1',
        created: now,
        lastModified: now,
        rotationEnabled: false,
      };

      return secret;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to create secret: ${(error as Error).message}`);
    }
  }

  async getSecretValue(secretName: string): Promise<SecretValue> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        // Try to parse as JSON, fall back to string
        try {
          return JSON.parse(response.SecretString);
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
      throw new ServiceUnavailableError(`Failed to get secret value: ${(error as Error).message}`);
    }
  }

  async updateSecret(secretName: string, params: UpdateSecretParams): Promise<Secret> {
    try {
      const secretString =
        typeof params.value === 'string' ? params.value : JSON.stringify(params.value);

      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretString,
      });

      const response = await this.client.send(command);

      // Get full secret metadata
      const describeCommand = new DescribeSecretCommand({
        SecretId: secretName,
      });

      const describeResponse = await this.client.send(describeCommand);

      const secret: Secret = {
        name: describeResponse.Name || secretName,
        version: response.VersionId || '1',
        created: describeResponse.CreatedDate ? new Date(describeResponse.CreatedDate) : new Date(),
        lastModified: describeResponse.LastChangedDate
          ? new Date(describeResponse.LastChangedDate)
          : new Date(),
        rotationEnabled: describeResponse.RotationEnabled ?? false,
      };

      if (describeResponse.RotationRules?.AutomaticallyAfterDays) {
        secret.rotationDays = describeResponse.RotationRules.AutomaticallyAfterDays;
      }

      if (describeResponse.LastRotatedDate) {
        secret.lastRotated = new Date(describeResponse.LastRotatedDate);
      }

      return secret;
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Secret', secretName);
      }
      throw new ServiceUnavailableError(`Failed to update secret: ${(error as Error).message}`);
    }
  }

  async deleteSecret(secretName: string, forceDelete?: boolean): Promise<void> {
    try {
      const command = new DeleteSecretCommand({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: forceDelete,
        RecoveryWindowInDays: forceDelete ? undefined : 30,
      });

      await this.client.send(command);
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Secret', secretName);
      }
      throw new ServiceUnavailableError(`Failed to delete secret: ${(error as Error).message}`);
    }
  }

  async listSecrets(): Promise<Secret[]> {
    try {
      const command = new ListSecretsCommand({
        MaxResults: 100,
      });

      const response = await this.client.send(command);

      return (response.SecretList || []).map((s) => {
        const secret: Secret = {
          name: s.Name || '',
          version: '1', // SecretListEntry doesn't expose version
          created: s.CreatedDate ? new Date(s.CreatedDate) : new Date(),
          lastModified: s.LastChangedDate ? new Date(s.LastChangedDate) : new Date(),
          rotationEnabled: s.RotationEnabled ?? false,
        };

        if (s.RotationRules?.AutomaticallyAfterDays) {
          secret.rotationDays = s.RotationRules.AutomaticallyAfterDays;
        }

        if (s.LastRotatedDate) {
          secret.lastRotated = new Date(s.LastRotatedDate);
        }

        return secret;
      });
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to list secrets: ${(error as Error).message}`);
    }
  }

  async rotateSecret(secretName: string, config: RotationConfig): Promise<Secret> {
    try {
      // Note: AWS requires a Lambda function ARN for rotation
      // For simplicity, we'll assume the rotation function is deployed
      const command = new RotateSecretCommand({
        SecretId: secretName,
        RotationRules: {
          AutomaticallyAfterDays: config.rotationDays,
        },
        // RotationLambdaARN would be required in production
      });

      await this.client.send(command);

      // Get updated metadata
      const describeCommand = new DescribeSecretCommand({
        SecretId: secretName,
      });

      const response = await this.client.send(describeCommand);

      const secret: Secret = {
        name: response.Name || secretName,
        version: response.VersionIdsToStages
          ? Object.keys(response.VersionIdsToStages)[0] || ''
          : '',
        created: response.CreatedDate ? new Date(response.CreatedDate) : new Date(),
        lastModified: response.LastChangedDate ? new Date(response.LastChangedDate) : new Date(),
        rotationEnabled: response.RotationEnabled ?? false,
      };

      if (response.RotationRules?.AutomaticallyAfterDays) {
        secret.rotationDays = response.RotationRules.AutomaticallyAfterDays;
      }

      if (response.LastRotatedDate) {
        secret.lastRotated = new Date(response.LastRotatedDate);
      }

      return secret;
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Secret', secretName);
      }
      throw new ServiceUnavailableError(`Failed to rotate secret: ${(error as Error).message}`);
    }
  }

  async tagSecret(secretName: string, tags: Record<string, string>): Promise<void> {
    try {
      // First, get the ARN
      const describeCommand = new DescribeSecretCommand({
        SecretId: secretName,
      });

      const describeResponse = await this.client.send(describeCommand);

      if (!describeResponse.ARN) {
        throw new Error('Secret ARN not found');
      }

      const command = new TagResourceCommand({
        SecretId: describeResponse.ARN,
        Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      });

      await this.client.send(command);
    } catch (error) {
      if ((error as Error).name === 'ResourceNotFoundException') {
        throw new ResourceNotFoundError('Secret', secretName);
      }
      throw new ServiceUnavailableError(`Failed to tag secret: ${(error as Error).message}`);
    }
  }
}
