/**
 * Mock SecretsClient Implementation
 *
 * In-memory secrets client for testing without cloud resources.
 * Simulates secret retrieval operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { SecretsClient } from '../../../core/clients/SecretsClient';
import type { SecretValue } from '../../../core/types/secret';
import { ResourceNotFoundError, ValidationError } from '../../../core/types/common';

interface StoredSecret {
  value: SecretValue;
  versions: Map<string, SecretValue>;
}

export class MockSecretsClient implements SecretsClient {
  private secrets = new Map<string, StoredSecret>();

  /**
   * Reset all mock data
   */
  reset(): void {
    this.secrets.clear();
  }

  /**
   * Pre-create a secret for testing
   */
  setSecret(secretName: string, value: SecretValue, version?: string): void {
    let secret = this.secrets.get(secretName);
    if (!secret) {
      secret = { value, versions: new Map() };
      this.secrets.set(secretName, secret);
    }

    if (version) {
      secret.versions.set(version, value);
    } else {
      secret.value = value;
    }
  }

  async get(secretName: string, version?: string): Promise<SecretValue> {
    if (!secretName) {
      throw new ValidationError('Secret name is required');
    }

    const secret = this.secrets.get(secretName);
    if (!secret) {
      throw new ResourceNotFoundError('Secret', secretName);
    }

    if (version) {
      const versionValue = secret.versions.get(version);
      if (versionValue === undefined) {
        throw new ResourceNotFoundError('SecretVersion', `${secretName}:${version}`);
      }
      return versionValue;
    }

    return secret.value;
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
