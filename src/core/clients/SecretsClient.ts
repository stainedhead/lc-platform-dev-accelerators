/**
 * SecretsClient Interface - Data Plane
 *
 * Runtime interface for secrets access in hosted applications.
 * Provides read-only access without secret management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { SecretValue } from '../types/secret';

export interface SecretsClient {
  /**
   * Get a secret value
   * @param secretName - Name of the secret
   * @param version - Optional version ID or stage
   * @returns Secret value (string or object)
   */
  get(secretName: string, version?: string): Promise<SecretValue>;

  /**
   * Get a secret value as parsed JSON
   * @param secretName - Name of the secret
   * @param version - Optional version ID or stage
   * @returns Parsed JSON object
   */
  getJson<T = unknown>(secretName: string, version?: string): Promise<T>;
}
