/**
 * Mock Secrets Service Implementation
 * In-memory secrets management for testing
 */

import type { SecretsService } from '../../core/services/SecretsService';
import type {
  Secret,
  SecretValue,
  CreateSecretParams,
  UpdateSecretParams,
  RotationConfig,
} from '../../core/types/secret';
import { ResourceNotFoundError } from '../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredSecret {
  metadata: Secret;
  value: SecretValue;
  tags: Record<string, string>;
  rotationConfig?: RotationConfig;
}

export class MockSecretsService implements SecretsService {
  private secrets = new Map<string, StoredSecret>();

  async createSecret(params: CreateSecretParams): Promise<Secret> {
    if (this.secrets.has(params.name)) {
      throw new Error(`Secret ${params.name} already exists`);
    }

    const version = this.generateVersion();
    const now = new Date();

    const secret: Secret = {
      name: params.name,
      version,
      created: now,
      lastModified: now,
      rotationEnabled: false,
    };

    this.secrets.set(params.name, {
      metadata: secret,
      value: params.value,
      tags: params.tags ?? {},
    });

    return secret;
  }

  async getSecretValue(secretName: string): Promise<SecretValue> {
    const stored = this.secrets.get(secretName);
    if (!stored) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    return stored.value;
  }

  async updateSecret(secretName: string, params: UpdateSecretParams): Promise<Secret> {
    const stored = this.secrets.get(secretName);
    if (!stored) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    const version = this.generateVersion();
    const now = new Date();

    stored.value = params.value;
    stored.metadata.version = version;
    stored.metadata.lastModified = now;

    return stored.metadata;
  }

  async deleteSecret(secretName: string, _forceDelete?: boolean): Promise<void> {
    const exists = this.secrets.has(secretName);
    if (!exists) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    // In mock, both force and soft delete just remove it
    this.secrets.delete(secretName);
  }

  async listSecrets(): Promise<Secret[]> {
    return Array.from(this.secrets.values()).map((s) => s.metadata);
  }

  async rotateSecret(secretName: string, config: RotationConfig): Promise<Secret> {
    const stored = this.secrets.get(secretName);
    if (!stored) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    stored.rotationConfig = config;
    stored.metadata.rotationEnabled = config.automaticRotation;
    stored.metadata.rotationDays = config.rotationDays;

    // If automatic rotation enabled, rotate now
    if (config.automaticRotation) {
      const newValue = await config.rotationFunction(stored.value);
      stored.value = newValue;
      stored.metadata.version = this.generateVersion();
      stored.metadata.lastModified = new Date();
      stored.metadata.lastRotated = new Date();
    }

    return stored.metadata;
  }

  async tagSecret(secretName: string, tags: Record<string, string>): Promise<void> {
    const stored = this.secrets.get(secretName);
    if (!stored) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    stored.tags = { ...stored.tags, ...tags };
  }

  // Helper methods
  private generateVersion(): string {
    return randomBytes(16).toString('hex');
  }
}
