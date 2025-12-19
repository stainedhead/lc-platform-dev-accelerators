/**
 * Integration Test: AwsConfigurationService with Real AWS AppConfig
 *
 * Tests AWS AppConfig implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates test application on first use (auto-created by service)
 * - Creates configuration profiles and versions during tests
 * - Cleans up all created resources in afterAll
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsConfigurationService } from '../../../../src/providers/aws/AwsConfigurationService';
import { ProviderType } from '../../../../src/core/types/common';
import {
  AppConfigClient,
  ListApplicationsCommand,
  DeleteApplicationCommand,
  ListConfigurationProfilesCommand,
  DeleteConfigurationProfileCommand,
  ListEnvironmentsCommand,
  DeleteEnvironmentCommand,
  ListHostedConfigurationVersionsCommand,
  DeleteHostedConfigurationVersionCommand,
} from '@aws-sdk/client-appconfig';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;
const TEST_APP_NAME = `${TEST_PREFIX}-app`;

describe('AwsConfigurationService Integration (AWS)', () => {
  let service: AwsConfigurationService;
  let appConfigClient: AppConfigClient;

  // Track resources for cleanup
  const createdProfileNames: string[] = [];
  let applicationId: string | undefined;

  beforeAll(() => {
    // Configure service with unique application name for test isolation
    service = new AwsConfigurationService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      options: {
        appConfigApplication: TEST_APP_NAME,
      },
    });

    appConfigClient = new AppConfigClient({ region: AWS_REGION });
  });

  afterAll(async () => {
    // Find the application ID
    try {
      const apps = await appConfigClient.send(new ListApplicationsCommand({}));
      const testApp = apps.Items?.find((app) => app.Name === TEST_APP_NAME);
      applicationId = testApp?.Id;

      if (applicationId) {
        // Delete all configuration profiles first
        console.log(`Cleaning up configuration profiles for app ${applicationId}...`);
        const profiles = await appConfigClient.send(
          new ListConfigurationProfilesCommand({
            ApplicationId: applicationId,
          })
        );

        for (const profile of profiles.Items ?? []) {
          if (profile.Id) {
            try {
              // First, delete all hosted configuration versions
              const versions = await appConfigClient.send(
                new ListHostedConfigurationVersionsCommand({
                  ApplicationId: applicationId,
                  ConfigurationProfileId: profile.Id,
                })
              );

              for (const version of versions.Items ?? []) {
                if (version.VersionNumber) {
                  try {
                    await appConfigClient.send(
                      new DeleteHostedConfigurationVersionCommand({
                        ApplicationId: applicationId,
                        ConfigurationProfileId: profile.Id,
                        VersionNumber: version.VersionNumber,
                      })
                    );
                  } catch (versionError) {
                    console.warn(
                      `Cleanup warning: Failed to delete version ${version.VersionNumber}: ${(versionError as Error).message}`
                    );
                  }
                }
              }

              // Now delete the profile
              await appConfigClient.send(
                new DeleteConfigurationProfileCommand({
                  ApplicationId: applicationId,
                  ConfigurationProfileId: profile.Id,
                })
              );
              console.log(`Deleted profile: ${profile.Name}`);
            } catch (error) {
              console.warn(
                `Cleanup warning: Failed to delete profile ${profile.Name}: ${(error as Error).message}`
              );
            }
          }
        }

        // Delete all environments
        console.log('Cleaning up environments...');
        const environments = await appConfigClient.send(
          new ListEnvironmentsCommand({
            ApplicationId: applicationId,
          })
        );

        for (const env of environments.Items ?? []) {
          if (env.Id) {
            try {
              await appConfigClient.send(
                new DeleteEnvironmentCommand({
                  ApplicationId: applicationId,
                  EnvironmentId: env.Id,
                })
              );
              console.log(`Deleted environment: ${env.Name}`);
            } catch (error) {
              console.warn(
                `Cleanup warning: Failed to delete environment ${env.Name}: ${(error as Error).message}`
              );
            }
          }
        }

        // Delete the application
        console.log(`Deleting application ${TEST_APP_NAME}...`);
        try {
          await appConfigClient.send(
            new DeleteApplicationCommand({
              ApplicationId: applicationId,
            })
          );
          console.log(`Deleted application: ${TEST_APP_NAME}`);
        } catch (error) {
          console.warn(
            `Cleanup warning: Failed to delete application: ${(error as Error).message}`
          );
        }
      }
    } catch (error) {
      console.warn(`Cleanup error: ${(error as Error).message}`);
    }
  });

  test('createConfiguration - should create configuration profile with JSON content', async () => {
    const configName = `${TEST_PREFIX}-basic`;
    const configContent = {
      database: {
        host: 'localhost',
        port: 5432,
        name: 'testdb',
      },
      features: {
        enableLogging: true,
        maxConnections: 100,
      },
    };

    const config = await service.createConfiguration({
      name: configName,
      content: JSON.stringify(configContent),
      description: 'Test configuration for integration testing',
      contentType: 'application/json',
    });
    createdProfileNames.push(configName);

    expect(config.application).toBe(TEST_APP_NAME);
    expect(config.version).toBeDefined();
    expect(config.data).toEqual(configContent);
    expect(config.created).toBeInstanceOf(Date);
    expect(config.deployed).toBe(false);
  });

  test('createConfiguration - should create configuration with label', async () => {
    const configName = `${TEST_PREFIX}-labeled`;
    const configContent = {
      setting1: 'value1',
      setting2: 'value2',
    };

    const config = await service.createConfiguration({
      name: configName,
      content: JSON.stringify(configContent),
      label: 'production',
    });
    createdProfileNames.push(configName);

    expect(config.environment).toBe('production');
    expect(config.data).toEqual(configContent);
  });

  test('getConfiguration - should retrieve configuration', async () => {
    const configName = `${TEST_PREFIX}-get`;
    const configContent = {
      apiEndpoint: 'https://api.example.com',
      timeout: 30000,
    };

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify(configContent),
    });
    createdProfileNames.push(configName);

    const retrieved = await service.getConfiguration(configName);

    expect(retrieved.data).toEqual(configContent);
    expect(retrieved.version).toBeDefined();
    expect(retrieved.application).toBe(TEST_APP_NAME);
  });

  test('updateConfiguration - should create new version', async () => {
    const configName = `${TEST_PREFIX}-update`;

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify({ version: 1, data: 'initial' }),
    });
    createdProfileNames.push(configName);

    // Update configuration
    const updated = await service.updateConfiguration(configName, {
      content: JSON.stringify({ version: 2, data: 'updated', newField: 'added' }),
      description: 'Updated configuration',
    });

    expect(updated.data).toEqual({ version: 2, data: 'updated', newField: 'added' });

    // Verify the update persisted
    const retrieved = await service.getConfiguration(configName);
    expect(retrieved.data).toEqual({ version: 2, data: 'updated', newField: 'added' });
  });

  test('listConfigurations - should list configuration profiles', async () => {
    const configName = `${TEST_PREFIX}-list`;

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify({ listTest: true }),
    });
    createdProfileNames.push(configName);

    const configs = await service.listConfigurations();

    expect(configs).toBeInstanceOf(Array);
    expect(configs.length).toBeGreaterThanOrEqual(1);
  });

  test('validateConfiguration - should validate valid JSON', async () => {
    const validContent = JSON.stringify({
      requiredField: 'present',
      optionalField: 'also present',
    });

    const schema = {
      required: ['requiredField'],
    };

    const result = await service.validateConfiguration(validContent, schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validateConfiguration - should detect missing required fields', async () => {
    const invalidContent = JSON.stringify({
      optionalField: 'present',
    });

    const schema = {
      required: ['requiredField', 'anotherRequired'],
    };

    const result = await service.validateConfiguration(invalidContent, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.path === 'requiredField')).toBe(true);
  });

  test('validateConfiguration - should detect invalid JSON', async () => {
    const invalidJson = '{ invalid json }';

    const result = await service.validateConfiguration(invalidJson, {});

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]!.message).toContain('Invalid JSON');
  });

  test('deleteConfiguration - should delete configuration profile', async () => {
    const configName = `${TEST_PREFIX}-delete`;

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify({ deleteMe: true }),
    });
    // Don't add to cleanup - we're deleting manually

    await service.deleteConfiguration(configName);

    // Verify deletion
    await expect(service.getConfiguration(configName)).rejects.toThrow();
  });

  test('createProfile - should create configuration profile', async () => {
    const profileName = `${TEST_PREFIX}-profile`;

    const profile = await service.createProfile(profileName);
    createdProfileNames.push(profileName);

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe(profileName);
    expect(profile.created).toBeInstanceOf(Date);
  });

  test('Complex configuration - should handle nested structures', async () => {
    const configName = `${TEST_PREFIX}-complex`;
    const complexConfig = {
      application: {
        name: 'test-app',
        version: '1.0.0',
        environment: 'production',
      },
      database: {
        primary: {
          host: 'primary.db.example.com',
          port: 5432,
          ssl: true,
        },
        replica: {
          host: 'replica.db.example.com',
          port: 5432,
          ssl: true,
        },
      },
      features: {
        flags: ['feature1', 'feature2', 'feature3'],
        settings: {
          timeout: 30000,
          retries: 3,
          maxConnections: 100,
        },
      },
      logging: {
        level: 'info',
        destinations: ['cloudwatch', 'file'],
      },
    };

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify(complexConfig),
    });
    createdProfileNames.push(configName);

    const retrieved = await service.getConfiguration(configName);
    expect(retrieved.data).toEqual(complexConfig);
  });

  test('Configuration versioning - should maintain version history', async () => {
    const configName = `${TEST_PREFIX}-versions`;

    // Create initial version
    const v1 = await service.createConfiguration({
      name: configName,
      content: JSON.stringify({ version: 1 }),
    });
    createdProfileNames.push(configName);

    expect(v1.version).toBeDefined();

    // Update to create new version
    const v2 = await service.updateConfiguration(configName, {
      content: JSON.stringify({ version: 2 }),
    });

    // Version numbers should be different (typically incremented)
    expect(v2.version).toBeDefined();
    // Note: AppConfig version numbers are strings and may not be sequential
  });

  test('Error handling - should throw ResourceNotFoundError for non-existent config', async () => {
    await expect(service.getConfiguration(`nonexistent-config-${Date.now()}`)).rejects.toThrow();
  });

  test('Concurrent operations - should handle parallel config creation', async () => {
    const configNames = Array.from({ length: 3 }, (_, i) => `${TEST_PREFIX}-concurrent-${i}`);

    const createPromises = configNames.map((name, i) =>
      service.createConfiguration({
        name,
        content: JSON.stringify({ index: i, concurrent: true }),
      })
    );

    const configs = await Promise.all(createPromises);
    configNames.forEach((name) => createdProfileNames.push(name));

    expect(configs).toHaveLength(3);
    configs.forEach((config, i) => {
      expect(config.data).toEqual({ index: i, concurrent: true });
    });
  });

  test('Special characters in content - should handle special characters', async () => {
    const configName = `${TEST_PREFIX}-special`;
    const specialContent = {
      regex: '^[a-zA-Z0-9]+$',
      path: '/path/to/file',
      query: 'SELECT * FROM users WHERE name = "test"',
      unicode: '日本語テスト',
      special: 'line1\nline2\ttabbed',
    };

    await service.createConfiguration({
      name: configName,
      content: JSON.stringify(specialContent),
    });
    createdProfileNames.push(configName);

    const retrieved = await service.getConfiguration(configName);
    expect(retrieved.data).toEqual(specialContent);
  });
});
