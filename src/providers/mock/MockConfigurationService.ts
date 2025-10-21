/**
 * Mock Configuration Service Implementation
 * In-memory configuration management for testing
 */

import type { ConfigurationService } from '../../core/services/ConfigurationService';
import type {
  Configuration,
  ConfigurationProfile,
  CreateConfigurationParams,
  UpdateConfigurationParams,
  DeployConfigurationParams,
  ValidationResult,
} from '../../core/types/configuration';
import { ResourceNotFoundError } from '../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredConfiguration {
  name: string;
  label: string;
  content: string;
  contentType: string;
  description?: string;
  created: Date;
  lastModified: Date;
}

export class MockConfigurationService implements ConfigurationService {
  private configurations: StoredConfiguration[] = [];
  private profiles = new Map<string, ConfigurationProfile>();
  private deployments = new Map<string, string>();

  async createConfiguration(
    params: CreateConfigurationParams
  ): Promise<Configuration> {
    const now = new Date();
    const label = params.label ?? 'latest';

    const stored: StoredConfiguration = {
      name: params.name,
      label,
      content: params.content,
      contentType: params.contentType ?? 'application/json',
      created: now,
      lastModified: now,
    };

    if (params.description) {
      stored.description = params.description;
    }

    this.configurations.push(stored);

    return this.toConfiguration(stored);
  }

  async getConfiguration(name: string, label?: string): Promise<Configuration> {
    const targetLabel = label ?? 'latest';

    const config = this.configurations.find(
      (c) => c.name === name && c.label === targetLabel
    );

    if (!config) {
      throw new ResourceNotFoundError('Configuration', `${name}:${targetLabel}`);
    }

    return this.toConfiguration(config);
  }

  async updateConfiguration(
    name: string,
    params: UpdateConfigurationParams
  ): Promise<Configuration> {
    const label = params.label ?? 'latest';

    const config = this.configurations.find(
      (c) => c.name === name && c.label === label
    );

    if (!config) {
      throw new ResourceNotFoundError('Configuration', `${name}:${label}`);
    }

    if (params.content !== undefined) {
      config.content = params.content;
    }
    if (params.contentType !== undefined) {
      config.contentType = params.contentType;
    }
    if (params.description !== undefined) {
      config.description = params.description;
    }

    config.lastModified = new Date();

    return this.toConfiguration(config);
  }

  async deleteConfiguration(name: string, label?: string): Promise<void> {
    if (label) {
      // Delete specific version
      const index = this.configurations.findIndex(
        (c) => c.name === name && c.label === label
      );
      if (index === -1) {
        throw new ResourceNotFoundError('Configuration', `${name}:${label}`);
      }
      this.configurations.splice(index, 1);
    } else {
      // Delete all versions
      const initialLength = this.configurations.length;
      this.configurations = this.configurations.filter((c) => c.name !== name);

      if (this.configurations.length === initialLength) {
        throw new ResourceNotFoundError('Configuration', name);
      }
    }
  }

  async listConfigurations(label?: string): Promise<Configuration[]> {
    let configs = this.configurations;

    if (label) {
      configs = configs.filter((c) => c.label === label);
    }

    return configs.map((c) => this.toConfiguration(c));
  }

  async validateConfiguration(
    content: string,
    _schema: object
  ): Promise<ValidationResult> {
    try {
      // Simple validation: try to parse as JSON
      JSON.parse(content);

      // Mock validation always passes
      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: 'Invalid JSON format',
            expected: 'valid JSON',
            actual: content.substring(0, 50),
          },
        ],
      };
    }
  }

  async createProfile(
    name: string,
    retrievalRole?: string
  ): Promise<ConfigurationProfile> {
    const profile: ConfigurationProfile = {
      name,
      id: randomBytes(8).toString('hex'),
      created: new Date(),
    };

    if (retrievalRole) {
      profile.retrievalRole = retrievalRole;
    }

    this.profiles.set(name, profile);
    return profile;
  }

  async deployConfiguration(params: DeployConfigurationParams): Promise<string> {
    const deploymentId = randomBytes(8).toString('hex');

    // Verify configuration exists
    const label = params.label ?? 'latest';
    const config = this.configurations.find(
      (c) => c.name === params.configurationName && c.label === label
    );

    if (!config) {
      throw new ResourceNotFoundError(
        'Configuration',
        `${params.configurationName}:${label}`
      );
    }

    this.deployments.set(deploymentId, params.configurationName);

    return deploymentId;
  }

  // Helper methods
  private toConfiguration(stored: StoredConfiguration): Configuration {
    // Parse content to extract data
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(stored.content) as Record<string, unknown>;
    } catch {
      // If not JSON, store raw content
      data = { raw: stored.content };
    }

    const config: Configuration = {
      application: stored.name,
      environment: stored.label,
      version: '1.0',
      data,
      created: stored.created,
      deployed: true,
    };

    if (stored.description) {
      config.description = stored.description;
    }

    return config;
  }
}
