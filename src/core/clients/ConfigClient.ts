/**
 * ConfigClient Interface - Data Plane
 *
 * Runtime interface for configuration access in hosted applications.
 * Provides read-only access without configuration management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { ConfigurationData } from '../types/configuration';

export interface ConfigClient {
  /**
   * Get full configuration data
   * @param configName - Name of the configuration
   * @param environment - Optional environment/profile
   * @returns Configuration data as key-value object
   */
  get(configName: string, environment?: string): Promise<ConfigurationData>;

  /**
   * Get a string configuration value
   * @param configName - Name of the configuration
   * @param key - Configuration key
   * @param defaultValue - Default value if key not found
   * @returns String value
   */
  getString(configName: string, key: string, defaultValue?: string): Promise<string>;

  /**
   * Get a number configuration value
   * @param configName - Name of the configuration
   * @param key - Configuration key
   * @param defaultValue - Default value if key not found
   * @returns Number value
   */
  getNumber(configName: string, key: string, defaultValue?: number): Promise<number>;

  /**
   * Get a boolean configuration value
   * @param configName - Name of the configuration
   * @param key - Configuration key
   * @param defaultValue - Default value if key not found
   * @returns Boolean value
   */
  getBoolean(configName: string, key: string, defaultValue?: boolean): Promise<boolean>;
}
