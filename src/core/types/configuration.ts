/**
 * Configuration Types
 */

export interface Configuration {
  application: string;
  environment: string;
  version: string;
  data: Record<string, unknown>;
  schema?: object;
  description?: string;
  created: Date;
  deployed: boolean;
}

export interface ConfigurationParams {
  application: string;
  environment: string;
  data: object;
  schema?: object;
  description?: string;
}

export interface UpdateConfigParams {
  data?: object;
  schema?: object;
  description?: string;
}

export type ConfigurationData = Record<string, unknown>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  expected: string;
  actual: string;
}

export interface CreateConfigurationParams {
  name: string;
  content: string;
  label?: string;
  contentType?: string;
  description?: string;
}

export interface UpdateConfigurationParams {
  content?: string;
  label?: string;
  contentType?: string;
  description?: string;
}

export interface DeployConfigurationParams {
  configurationName: string;
  environment: string;
  label?: string;
  deploymentStrategy?: string;
}

export interface ConfigurationProfile {
  name: string;
  id: string;
  retrievalRole?: string;
  created: Date;
}
