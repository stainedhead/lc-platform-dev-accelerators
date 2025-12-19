/**
 * Mock ConfigClient Implementation
 *
 * In-memory configuration client for testing without cloud resources.
 * Simulates configuration retrieval operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { ConfigClient } from '../../../core/clients/ConfigClient';
import type { ConfigurationData } from '../../../core/types/configuration';
import { ResourceNotFoundError, ValidationError } from '../../../core/types/common';

interface StoredConfig {
  data: ConfigurationData;
  environments: Map<string, ConfigurationData>;
}

export class MockConfigClient implements ConfigClient {
  private configs = new Map<string, StoredConfig>();

  /**
   * Reset all mock data
   */
  reset(): void {
    this.configs.clear();
  }

  /**
   * Pre-create a configuration for testing
   */
  setConfig(configName: string, data: ConfigurationData, environment?: string): void {
    let config = this.configs.get(configName);
    if (!config) {
      config = { data: {}, environments: new Map() };
      this.configs.set(configName, config);
    }

    if (environment) {
      config.environments.set(environment, data);
    } else {
      config.data = data;
    }
  }

  async get(configName: string, environment?: string): Promise<ConfigurationData> {
    if (!configName) {
      throw new ValidationError('Configuration name is required');
    }

    const config = this.configs.get(configName);
    if (!config) {
      throw new ResourceNotFoundError('Configuration', configName);
    }

    if (environment) {
      const envData = config.environments.get(environment);
      if (envData === undefined) {
        throw new ResourceNotFoundError('Configuration', `${configName}:${environment}`);
      }
      return { ...envData };
    }

    return { ...config.data };
  }

  async getString(configName: string, key: string, defaultValue?: string): Promise<string> {
    if (!key) {
      throw new ValidationError('Configuration key is required');
    }

    try {
      const data = await this.get(configName);
      const value = data[key];

      if (value === undefined) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new ResourceNotFoundError('ConfigurationKey', `${configName}.${key}`);
      }

      return String(value);
    } catch (error) {
      if (error instanceof ResourceNotFoundError && defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  async getNumber(configName: string, key: string, defaultValue?: number): Promise<number> {
    if (!key) {
      throw new ValidationError('Configuration key is required');
    }

    try {
      const data = await this.get(configName);
      const value = data[key];

      if (value === undefined) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new ResourceNotFoundError('ConfigurationKey', `${configName}.${key}`);
      }

      const num = Number(value);
      if (isNaN(num)) {
        throw new ValidationError(`Configuration key '${key}' is not a valid number`);
      }

      return num;
    } catch (error) {
      if (error instanceof ResourceNotFoundError && defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  async getBoolean(configName: string, key: string, defaultValue?: boolean): Promise<boolean> {
    if (!key) {
      throw new ValidationError('Configuration key is required');
    }

    try {
      const data = await this.get(configName);
      const value = data[key];

      if (value === undefined) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new ResourceNotFoundError('ConfigurationKey', `${configName}.${key}`);
      }

      if (typeof value === 'boolean') {
        return value;
      }

      const strValue = String(value).toLowerCase();
      return strValue === 'true' || strValue === '1' || strValue === 'yes';
    } catch (error) {
      if (error instanceof ResourceNotFoundError && defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }
}
