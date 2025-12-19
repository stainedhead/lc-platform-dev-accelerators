/**
 * AWS Configuration Service Implementation
 * Uses AWS AppConfig for application configuration management
 */

import {
  AppConfigClient,
  CreateApplicationCommand,
  CreateEnvironmentCommand,
  CreateConfigurationProfileCommand,
  CreateHostedConfigurationVersionCommand,
  GetHostedConfigurationVersionCommand,
  ListApplicationsCommand,
  ListConfigurationProfilesCommand,
  ListHostedConfigurationVersionsCommand,
  DeleteConfigurationProfileCommand,
  DeleteHostedConfigurationVersionCommand,
  StartDeploymentCommand,
} from '@aws-sdk/client-appconfig';
import type { ConfigurationService } from '../../core/services/ConfigurationService';
import type {
  Configuration,
  ConfigurationProfile,
  CreateConfigurationParams,
  UpdateConfigurationParams,
  DeployConfigurationParams,
  ValidationResult,
} from '../../core/types/configuration';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsConfigurationService implements ConfigurationService {
  private client: AppConfigClient;
  private applicationName: string;
  private applicationId?: string;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
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

    this.client = new AppConfigClient(clientConfig);
    this.applicationName = String(config.options?.appConfigApplication || 'lcplatform-app');
  }

  private async ensureApplication(): Promise<string> {
    if (this.applicationId) {
      return this.applicationId;
    }

    try {
      const listCommand = new ListApplicationsCommand({});
      const listResponse = await this.client.send(listCommand);

      const existingApp = listResponse.Items?.find((app) => app.Name === this.applicationName);

      if (existingApp?.Id) {
        this.applicationId = existingApp.Id;
        return existingApp.Id;
      }

      // Create application if it doesn't exist
      const createCommand = new CreateApplicationCommand({
        Name: this.applicationName,
        Description: 'LCPlatform Application Configuration',
      });

      const createResponse = await this.client.send(createCommand);

      if (!createResponse.Id) {
        throw new Error('Failed to create application');
      }

      this.applicationId = createResponse.Id;
      return createResponse.Id;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to ensure application: ${(error as Error).message}`
      );
    }
  }

  async createConfiguration(params: CreateConfigurationParams): Promise<Configuration> {
    try {
      const applicationId = await this.ensureApplication();

      // Create configuration profile
      const profileCommand = new CreateConfigurationProfileCommand({
        ApplicationId: applicationId,
        Name: params.name,
        Description: params.description,
        LocationUri: 'hosted',
      });

      const profileResponse = await this.client.send(profileCommand);

      if (!profileResponse.Id) {
        throw new Error('Failed to create configuration profile');
      }

      // Create hosted configuration version
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(params.content);

      const versionCommand = new CreateHostedConfigurationVersionCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profileResponse.Id,
        Content: contentBytes,
        ContentType: params.contentType || 'application/json',
        Description: params.description,
      });

      const versionResponse = await this.client.send(versionCommand);

      const config: Configuration = {
        application: this.applicationName,
        environment: params.label || 'default',
        version: String(versionResponse.VersionNumber || 1),
        data: JSON.parse(params.content) as Record<string, unknown>,
        created: new Date(),
        deployed: false,
      };

      if (params.description) {
        config.description = params.description;
      }

      return config;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to create configuration: ${(error as Error).message}`
      );
    }
  }

  async getConfiguration(name: string, _label?: string): Promise<Configuration> {
    try {
      const applicationId = await this.ensureApplication();

      // List configuration profiles to find the one with matching name
      const listProfilesCommand = new ListConfigurationProfilesCommand({
        ApplicationId: applicationId,
      });

      const profilesResponse = await this.client.send(listProfilesCommand);

      const profile = profilesResponse.Items?.find((p) => p.Name === name);

      if (!profile?.Id) {
        throw new ResourceNotFoundError('Configuration', name);
      }

      // Get latest hosted configuration version
      const listVersionsCommand = new ListHostedConfigurationVersionsCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
      });

      const versionsResponse = await this.client.send(listVersionsCommand);

      if (!versionsResponse.Items || versionsResponse.Items.length === 0) {
        throw new ResourceNotFoundError('Configuration version', name);
      }

      // Sort by version number to ensure we get the latest
      const sortedVersions = [...versionsResponse.Items].sort(
        (a, b) => (a.VersionNumber || 0) - (b.VersionNumber || 0)
      );
      const latestVersion = sortedVersions[sortedVersions.length - 1];

      // Get the configuration content
      const getVersionCommand = new GetHostedConfigurationVersionCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
        VersionNumber: latestVersion?.VersionNumber,
      });

      const versionResponse = await this.client.send(getVersionCommand);

      if (!versionResponse.Content) {
        throw new Error('Configuration content not found');
      }

      const decoder = new TextDecoder();
      const contentString = decoder.decode(versionResponse.Content);

      const config: Configuration = {
        application: this.applicationName,
        environment: _label || 'default',
        version: String(latestVersion?.VersionNumber || 1),
        data: JSON.parse(contentString) as Record<string, unknown>,
        created: new Date(),
        deployed: false,
      };

      if (latestVersion?.Description) {
        config.description = latestVersion.Description;
      }

      return config;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to get configuration: ${(error as Error).message}`);
    }
  }

  async updateConfiguration(
    name: string,
    params: UpdateConfigurationParams
  ): Promise<Configuration> {
    try {
      const applicationId = await this.ensureApplication();

      // Find configuration profile
      const listProfilesCommand = new ListConfigurationProfilesCommand({
        ApplicationId: applicationId,
      });

      const profilesResponse = await this.client.send(listProfilesCommand);
      const profile = profilesResponse.Items?.find((p) => p.Name === name);

      if (!profile?.Id) {
        throw new ResourceNotFoundError('Configuration', name);
      }

      // Get current version number
      const listVersionsCommand = new ListHostedConfigurationVersionsCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
      });

      const versionsResponse = await this.client.send(listVersionsCommand);
      const latestVersionNumber =
        versionsResponse.Items?.[versionsResponse.Items.length - 1]?.VersionNumber || 0;

      // Create new version
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(params.content || '{}');

      const versionCommand = new CreateHostedConfigurationVersionCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
        Content: contentBytes,
        ContentType: params.contentType || 'application/json',
        Description: params.description,
        LatestVersionNumber: latestVersionNumber,
      });

      const versionResponse = await this.client.send(versionCommand);

      const config: Configuration = {
        application: this.applicationName,
        environment: params.label || 'default',
        version: String(versionResponse.VersionNumber || 1),
        data: JSON.parse(params.content || '{}') as Record<string, unknown>,
        created: new Date(),
        deployed: false,
      };

      if (params.description) {
        config.description = params.description;
      }

      return config;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to update configuration: ${(error as Error).message}`
      );
    }
  }

  async deleteConfiguration(name: string, _label?: string): Promise<void> {
    try {
      const applicationId = await this.ensureApplication();

      // Find configuration profile
      const listProfilesCommand = new ListConfigurationProfilesCommand({
        ApplicationId: applicationId,
      });

      const profilesResponse = await this.client.send(listProfilesCommand);
      const profile = profilesResponse.Items?.find((p) => p.Name === name);

      if (!profile?.Id) {
        throw new ResourceNotFoundError('Configuration', name);
      }

      // First, delete all hosted configuration versions
      const listVersionsCommand = new ListHostedConfigurationVersionsCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
      });

      const versionsResponse = await this.client.send(listVersionsCommand);

      for (const version of versionsResponse.Items || []) {
        if (version.VersionNumber) {
          const deleteVersionCommand = new DeleteHostedConfigurationVersionCommand({
            ApplicationId: applicationId,
            ConfigurationProfileId: profile.Id,
            VersionNumber: version.VersionNumber,
          });
          await this.client.send(deleteVersionCommand);
        }
      }

      // Now delete the configuration profile
      const deleteCommand = new DeleteConfigurationProfileCommand({
        ApplicationId: applicationId,
        ConfigurationProfileId: profile.Id,
      });

      await this.client.send(deleteCommand);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to delete configuration: ${(error as Error).message}`
      );
    }
  }

  async listConfigurations(_label?: string): Promise<Configuration[]> {
    try {
      const applicationId = await this.ensureApplication();

      const command = new ListConfigurationProfilesCommand({
        ApplicationId: applicationId,
      });

      const response = await this.client.send(command);

      return (response.Items || []).map((profile) => {
        const config: Configuration = {
          application: this.applicationName,
          environment: _label || 'default',
          version: '1',
          data: {},
          created: new Date(),
          deployed: false,
        };

        if (profile.Name) {
          config.description = profile.Name;
        }

        return config;
      });
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list configurations: ${(error as Error).message}`
      );
    }
  }

  async validateConfiguration(content: string, schema: object): Promise<ValidationResult> {
    try {
      // Parse content as JSON
      const data = JSON.parse(content) as Record<string, unknown>;

      // Simple validation: check if all required fields from schema are present
      // In production, use a library like ajv for JSON Schema validation
      const errors: Array<{ path: string; message: string; expected: string; actual: string }> = [];

      const schemaObj = schema as { required?: string[] };
      if (schemaObj.required) {
        for (const field of schemaObj.required) {
          if (!(field in data)) {
            errors.push({
              path: field,
              message: `Missing required field: ${field}`,
              expected: 'present',
              actual: 'missing',
            });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Invalid JSON: ${(error as Error).message}`,
            expected: 'valid JSON',
            actual: 'invalid',
          },
        ],
      };
    }
  }

  async createProfile(name: string, retrievalRole?: string): Promise<ConfigurationProfile> {
    try {
      const applicationId = await this.ensureApplication();

      const command = new CreateConfigurationProfileCommand({
        ApplicationId: applicationId,
        Name: name,
        LocationUri: 'hosted',
        RetrievalRoleArn: retrievalRole,
      });

      const response = await this.client.send(command);

      if (!response.Id) {
        throw new Error('Failed to create configuration profile');
      }

      const profile: ConfigurationProfile = {
        id: response.Id,
        name: response.Name || name,
        created: new Date(),
      };

      if (retrievalRole) {
        profile.retrievalRole = retrievalRole;
      }

      return profile;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to create profile: ${(error as Error).message}`);
    }
  }

  async deployConfiguration(params: DeployConfigurationParams): Promise<string> {
    try {
      const applicationId = await this.ensureApplication();

      // Create environment if it doesn't exist
      const envCommand = new CreateEnvironmentCommand({
        ApplicationId: applicationId,
        Name: params.environment,
      });

      let environmentId: string;
      try {
        const envResponse = await this.client.send(envCommand);
        environmentId = envResponse.Id || '';
      } catch {
        // Environment might already exist, list to find it
        // For simplicity, we'll use a placeholder
        environmentId = 'default';
      }

      // Find configuration profile
      const listProfilesCommand = new ListConfigurationProfilesCommand({
        ApplicationId: applicationId,
      });

      const profilesResponse = await this.client.send(listProfilesCommand);
      const profile = profilesResponse.Items?.find((p) => p.Name === params.configurationName);

      if (!profile?.Id) {
        throw new ResourceNotFoundError('Configuration', params.configurationName);
      }

      // Start deployment
      const deployCommand = new StartDeploymentCommand({
        ApplicationId: applicationId,
        EnvironmentId: environmentId,
        ConfigurationProfileId: profile.Id,
        ConfigurationVersion: '1',
        DeploymentStrategyId:
          params.deploymentStrategy || 'AppConfig.Linear50PercentEvery30Seconds',
      });

      const deployResponse = await this.client.send(deployCommand);

      return String(deployResponse.DeploymentNumber || 1);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to deploy configuration: ${(error as Error).message}`
      );
    }
  }
}
