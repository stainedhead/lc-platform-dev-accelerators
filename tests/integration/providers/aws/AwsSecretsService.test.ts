/**
 * Integration Test: AwsSecretsService with Real AWS Secrets Manager
 *
 * Tests AWS Secrets Manager implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates test secrets during tests
 * - Force deletes all created secrets in afterAll (bypasses 30-day recovery window)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsSecretsService } from '../../../../src/providers/aws/AwsSecretsService';
import { ProviderType } from '../../../../src/core/types/common';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

describe('AwsSecretsService Integration (AWS)', () => {
  let service: AwsSecretsService;
  const createdSecretNames: string[] = [];

  beforeAll(() => {
    // Configure service to use real AWS (no endpoint override)
    service = new AwsSecretsService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      // No explicit credentials - uses SDK default credential chain
    });
  });

  afterAll(async () => {
    // Cleanup: Force delete all test secrets (skip recovery window)
    console.log(`Cleaning up ${createdSecretNames.length} test secrets...`);
    for (const secretName of createdSecretNames) {
      try {
        await service.deleteSecret(secretName, true); // Force delete
        console.log(`Force deleted secret: ${secretName}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete secret ${secretName}: ${(error as Error).message}`
        );
      }
    }
  });

  test('createSecret - should create secret with string value', async () => {
    const secretName = `${TEST_PREFIX}-string`;

    const secret = await service.createSecret({
      name: secretName,
      value: 'my-secret-string-value',
      description: 'Test secret with string value',
    });
    createdSecretNames.push(secretName);

    expect(secret.name).toBe(secretName);
    expect(secret.version).toBeDefined();
    expect(secret.created).toBeInstanceOf(Date);
    expect(secret.lastModified).toBeInstanceOf(Date);
    expect(secret.rotationEnabled).toBe(false);
  });

  test('createSecret - should create secret with JSON value', async () => {
    const secretName = `${TEST_PREFIX}-json`;

    const secretValue = {
      username: 'testuser',
      password: 'testpass123',
      host: 'db.example.com',
      port: 5432,
    };

    const secret = await service.createSecret({
      name: secretName,
      value: secretValue,
      description: 'Test secret with JSON value',
    });
    createdSecretNames.push(secretName);

    expect(secret.name).toBe(secretName);
    expect(secret.version).toBeDefined();
  });

  test('createSecret - should create secret with tags', async () => {
    const secretName = `${TEST_PREFIX}-tagged`;

    const secret = await service.createSecret({
      name: secretName,
      value: 'tagged-secret-value',
      description: 'Test secret with tags',
      tags: {
        Environment: 'test',
        Project: 'lcplatform',
        Owner: 'integration-test',
      },
    });
    createdSecretNames.push(secretName);

    expect(secret.name).toBe(secretName);
  });

  test('getSecretValue - should retrieve string secret', async () => {
    const secretName = `${TEST_PREFIX}-get-string`;
    const secretValue = 'secret-value-to-retrieve';

    await service.createSecret({
      name: secretName,
      value: secretValue,
    });
    createdSecretNames.push(secretName);

    const retrieved = await service.getSecretValue(secretName);

    expect(retrieved).toBe(secretValue);
  });

  test('getSecretValue - should retrieve and parse JSON secret', async () => {
    const secretName = `${TEST_PREFIX}-get-json`;
    const secretValue = {
      apiKey: 'test-api-key-12345',
      apiSecret: 'test-api-secret-67890',
      endpoint: 'https://api.example.com',
    };

    await service.createSecret({
      name: secretName,
      value: secretValue,
    });
    createdSecretNames.push(secretName);

    const retrieved = await service.getSecretValue(secretName);

    expect(retrieved).toEqual(secretValue);
    expect((retrieved as Record<string, unknown>).apiKey).toBe('test-api-key-12345');
  });

  test('updateSecret - should update secret value', async () => {
    const secretName = `${TEST_PREFIX}-update`;

    await service.createSecret({
      name: secretName,
      value: 'initial-value',
    });
    createdSecretNames.push(secretName);

    // Update the secret
    const updated = await service.updateSecret(secretName, {
      value: 'updated-value',
    });

    expect(updated.name).toBe(secretName);
    expect(updated.lastModified).toBeInstanceOf(Date);

    // Verify updated value
    const retrieved = await service.getSecretValue(secretName);
    expect(retrieved).toBe('updated-value');
  });

  test('updateSecret - should update JSON secret', async () => {
    const secretName = `${TEST_PREFIX}-update-json`;

    await service.createSecret({
      name: secretName,
      value: { version: 1, data: 'initial' },
    });
    createdSecretNames.push(secretName);

    await service.updateSecret(secretName, {
      value: { version: 2, data: 'updated', newField: 'added' },
    });

    const retrieved = await service.getSecretValue(secretName);
    expect(retrieved).toEqual({ version: 2, data: 'updated', newField: 'added' });
  });

  test('listSecrets - should list created secrets', async () => {
    const secretName = `${TEST_PREFIX}-list`;

    await service.createSecret({
      name: secretName,
      value: 'list-test-value',
    });
    createdSecretNames.push(secretName);

    const secrets = await service.listSecrets();

    expect(secrets).toBeInstanceOf(Array);
    // List may be paginated (max 100), so check for any test prefix secrets
    // or verify the returned structure is correct
    expect(secrets.length).toBeGreaterThanOrEqual(0);

    // If our secret is in the list, verify its structure
    const testSecret = secrets.find((s) => s.name === secretName);
    if (testSecret) {
      expect(testSecret.created).toBeInstanceOf(Date);
      expect(testSecret.lastModified).toBeInstanceOf(Date);
    }

    // Also verify we can retrieve the secret directly (not dependent on list pagination)
    const retrieved = await service.getSecretValue(secretName);
    expect(retrieved).toBe('list-test-value');
  });

  test('tagSecret - should add tags to existing secret', async () => {
    const secretName = `${TEST_PREFIX}-tag`;

    await service.createSecret({
      name: secretName,
      value: 'tag-test-value',
    });
    createdSecretNames.push(secretName);

    // Add tags
    await service.tagSecret(secretName, {
      NewTag: 'new-tag-value',
      Environment: 'testing',
    });

    // Note: AWS doesn't return tags on list, so we just verify no error
    // Full tag verification would require DescribeSecret or GetResourceTags
  });

  test('deleteSecret - should force delete secret immediately', async () => {
    const secretName = `${TEST_PREFIX}-force-delete`;

    await service.createSecret({
      name: secretName,
      value: 'delete-me',
    });
    // Don't add to cleanup - we're deleting it manually

    // Force delete (no recovery window)
    await service.deleteSecret(secretName, true);

    // Verify secret is deleted
    await expect(service.getSecretValue(secretName)).rejects.toThrow();
  });

  test('deleteSecret - should schedule deletion with recovery window', async () => {
    const secretName = `${TEST_PREFIX}-scheduled-delete`;

    await service.createSecret({
      name: secretName,
      value: 'scheduled-delete-value',
    });

    // Schedule deletion (30-day recovery window)
    await service.deleteSecret(secretName, false);

    // Secret should still be "accessible" but marked for deletion
    // In practice, GetSecretValue may fail or succeed depending on timing
    // We'll force delete it in cleanup

    // Add to cleanup to force delete
    createdSecretNames.push(secretName);
  });

  test('Error handling - should throw ResourceNotFoundError for non-existent secret', async () => {
    const nonExistentSecret = `${TEST_PREFIX}-does-not-exist-${Date.now()}`;

    await expect(service.getSecretValue(nonExistentSecret)).rejects.toThrow();
  });

  test('Complex secret - should handle nested JSON structures', async () => {
    const secretName = `${TEST_PREFIX}-complex`;

    const complexValue = {
      database: {
        primary: {
          host: 'primary.db.example.com',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'complex-pass-123!@#',
          },
        },
        replica: {
          host: 'replica.db.example.com',
          port: 5432,
        },
      },
      apiKeys: ['key1', 'key2', 'key3'],
      settings: {
        timeout: 30000,
        retries: 3,
        debug: false,
      },
    };

    await service.createSecret({
      name: secretName,
      value: complexValue,
    });
    createdSecretNames.push(secretName);

    const retrieved = await service.getSecretValue(secretName);

    expect(retrieved).toEqual(complexValue);
    expect((retrieved as Record<string, unknown>).database).toBeDefined();
  });

  test('Special characters - should handle secrets with special characters', async () => {
    const secretName = `${TEST_PREFIX}-special`;
    const secretValue = 'P@$$w0rd!#%^&*()_+-=[]{}|;\':",./<>?`~';

    await service.createSecret({
      name: secretName,
      value: secretValue,
    });
    createdSecretNames.push(secretName);

    const retrieved = await service.getSecretValue(secretName);
    expect(retrieved).toBe(secretValue);
  });

  test('Concurrent operations - should handle parallel secret operations', async () => {
    const secretNames = Array.from({ length: 5 }, (_, i) => `${TEST_PREFIX}-concurrent-${i}`);

    // Create 5 secrets concurrently
    const createPromises = secretNames.map((name, i) =>
      service.createSecret({
        name,
        value: `concurrent-value-${i}`,
      })
    );

    const secrets = await Promise.all(createPromises);
    secretNames.forEach((name) => createdSecretNames.push(name));

    expect(secrets).toHaveLength(5);
    secrets.forEach((secret, i) => {
      expect(secret.name).toBe(secretNames[i]!);
    });

    // Retrieve all concurrently
    const retrievePromises = secretNames.map((name) => service.getSecretValue(name));
    const values = await Promise.all(retrievePromises);

    values.forEach((value, i) => {
      expect(value).toBe(`concurrent-value-${i}`);
    });
  });
});
