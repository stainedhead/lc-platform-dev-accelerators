/**
 * Secret Types - Secrets Management
 */

export interface Secret {
  name: string;
  version: string;
  created: Date;
  lastModified: Date;
  lastRotated?: Date;
  rotationEnabled: boolean;
  rotationDays?: number;
}

export interface SecretMetadata {
  name: string;
  version: string;
  created: Date;
  lastModified: Date;
}

export type SecretValue = string | object;
export type RotationFunction = (currentValue: SecretValue) => Promise<SecretValue>;

export interface CreateSecretParams {
  name: string;
  value: SecretValue;
  description?: string;
  tags?: Record<string, string>;
}

export interface UpdateSecretParams {
  value: SecretValue;
  versionStage?: string;
}

export interface RotationConfig {
  rotationDays: number;
  rotationFunction: RotationFunction;
  automaticRotation: boolean;
}
