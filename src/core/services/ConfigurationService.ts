/**
 * Configuration Service Interface
 * Provides cloud-agnostic application configuration management
 */

import type {
  Configuration,
  ConfigurationProfile,
  CreateConfigurationParams,
  UpdateConfigurationParams,
  DeployConfigurationParams,
  ValidationResult,
} from '../types/configuration';

export interface ConfigurationService {
  /**
   * Create a new configuration
   * @param params Configuration name, content, and metadata
   * @returns The created configuration
   */
  createConfiguration(params: CreateConfigurationParams): Promise<Configuration>;

  /**
   * Retrieve a configuration by name and optional label
   * @param name Configuration name
   * @param label Optional version label (defaults to latest)
   * @returns The configuration content and metadata
   */
  getConfiguration(name: string, label?: string): Promise<Configuration>;

  /**
   * Update an existing configuration
   * @param name Configuration name
   * @param params New content and optional label
   * @returns The updated configuration
   */
  updateConfiguration(name: string, params: UpdateConfigurationParams): Promise<Configuration>;

  /**
   * Delete a configuration
   * @param name Configuration name
   * @param label Optional version label (if not specified, deletes all versions)
   */
  deleteConfiguration(name: string, label?: string): Promise<void>;

  /**
   * List all configurations
   * @param label Optional filter by label
   * @returns Array of configurations
   */
  listConfigurations(label?: string): Promise<Configuration[]>;

  /**
   * Validate configuration content against a schema
   * @param content Configuration content to validate
   * @param schema JSON schema or validator function
   * @returns Validation result with any errors
   */
  validateConfiguration(content: string, schema: object): Promise<ValidationResult>;

  /**
   * Create a configuration profile for deployment
   * @param name Profile name
   * @param retrievalRole Optional role for retrieving configuration
   * @returns The created profile
   */
  createProfile(name: string, retrievalRole?: string): Promise<ConfigurationProfile>;

  /**
   * Deploy a configuration to an environment
   * @param params Deployment parameters
   * @returns Deployment ID
   */
  deployConfiguration(params: DeployConfigurationParams): Promise<string>;
}
