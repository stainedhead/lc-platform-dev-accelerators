/**
 * Secrets Service Interface
 * Provides cloud-agnostic secrets management capabilities
 */

import type {
  Secret,
  SecretValue,
  CreateSecretParams,
  UpdateSecretParams,
  RotationConfig,
} from '../types/secret';

export interface SecretsService {
  /**
   * Create a new secret
   * @param params Secret name, value, and optional configuration
   * @returns The created secret metadata
   */
  createSecret(params: CreateSecretParams): Promise<Secret>;

  /**
   * Retrieve the current value of a secret
   * @param secretName Name or ARN of the secret
   * @returns The secret value (string or binary)
   */
  getSecretValue(secretName: string): Promise<SecretValue>;

  /**
   * Update an existing secret's value
   * @param secretName Name or ARN of the secret
   * @param params New value and optional version stage
   * @returns The updated secret metadata
   */
  updateSecret(secretName: string, params: UpdateSecretParams): Promise<Secret>;

  /**
   * Delete a secret (may support recovery period)
   * @param secretName Name or ARN of the secret
   * @param forceDelete If true, delete immediately without recovery period
   */
  deleteSecret(secretName: string, forceDelete?: boolean): Promise<void>;

  /**
   * List all secrets
   * @returns Array of secret metadata (without values)
   */
  listSecrets(): Promise<Secret[]>;

  /**
   * Configure automatic rotation for a secret
   * @param secretName Name or ARN of the secret
   * @param config Rotation schedule and function
   * @returns The updated secret metadata
   */
  rotateSecret(secretName: string, config: RotationConfig): Promise<Secret>;

  /**
   * Tag a secret with metadata
   * @param secretName Name or ARN of the secret
   * @param tags Key-value pairs to attach
   */
  tagSecret(secretName: string, tags: Record<string, string>): Promise<void>;
}
