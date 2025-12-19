/**
 * AWS Config Client Implementation
 * Uses AWS AppConfig and SSM Parameter Store for configuration
 *
 * Constitution Principle I: Provider Independence
 */

import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import type { ConfigClient } from '../../../core/clients/ConfigClient';
import type { ConfigurationData } from '../../../core/types/configuration';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsConfigClient implements ConfigClient {
  private ssmClient: SSMClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
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

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.ssmClient = new SSMClient(clientConfig);
  }

  async get(configName: string, environment?: string): Promise<ConfigurationData> {
    if (!configName) {
      throw new ValidationError('Configuration name is required');
    }

    try {
      // Build the parameter path
      const path = environment ? `/${environment}/${configName}` : `/${configName}`;

      // Try to get all parameters under this path
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: true,
      });

      const response = await this.ssmClient.send(command);

      if (!response.Parameters || response.Parameters.length === 0) {
        // Try getting a single parameter
        const singleCommand = new GetParameterCommand({
          Name: path,
          WithDecryption: true,
        });

        try {
          const singleResponse = await this.ssmClient.send(singleCommand);
          if (singleResponse.Parameter?.Value) {
            try {
              return JSON.parse(singleResponse.Parameter.Value) as ConfigurationData;
            } catch {
              return { value: singleResponse.Parameter.Value };
            }
          }
        } catch {
          throw new ResourceNotFoundError('Configuration', configName);
        }
      }

      // Convert parameters to configuration data
      const data: ConfigurationData = {};
      for (const param of response.Parameters ?? []) {
        if (param.Name && param.Value) {
          const key = param.Name.replace(`${path}/`, '').replace(/\//g, '.');
          try {
            data[key] = JSON.parse(param.Value);
          } catch {
            data[key] = param.Value;
          }
        }
      }

      return data;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      if ((error as Error).name === 'ParameterNotFound') {
        throw new ResourceNotFoundError('Configuration', configName);
      }
      throw new ServiceUnavailableError(`Failed to get configuration: ${(error as Error).message}`);
    }
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
