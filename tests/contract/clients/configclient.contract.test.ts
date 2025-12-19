/**
 * Contract Test: ConfigClient
 *
 * Verifies that both AWS and Mock providers implement the ConfigClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { ConfigClient } from '../../../src/core/clients/ConfigClient';
import { MockConfigClient } from '../../../src/providers/mock/clients/MockConfigClient';
import { ResourceNotFoundError, ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the ConfigClient contract.
 */
function testConfigClientContract(
  name: string,
  createClient: () => MockConfigClient | ConfigClient,
  setup?: (client: MockConfigClient) => void
) {
  describe(`ConfigClient Contract: ${name}`, () => {
    let client: ConfigClient;

    beforeEach(() => {
      const c = createClient();
      client = c;
      if (setup && c instanceof MockConfigClient) {
        setup(c);
      }
    });

    describe('get', () => {
      test('should get configuration data', async () => {
        const data = await client.get('app-config');

        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
      });

      test('should get configuration with environment', async () => {
        const data = await client.get('app-config', 'production');

        expect(data).toBeDefined();
      });

      test('should throw ResourceNotFoundError for non-existent config', async () => {
        await expect(client.get('nonexistent-config')).rejects.toThrow(ResourceNotFoundError);
      });

      test('should throw ValidationError for empty config name', async () => {
        await expect(client.get('')).rejects.toThrow(ValidationError);
      });
    });

    describe('getString', () => {
      test('should get string configuration value', async () => {
        const value = await client.getString('app-config', 'appName');

        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });

      test('should return default value for non-existent key', async () => {
        const value = await client.getString('app-config', 'nonexistent', 'default-value');

        expect(value).toBe('default-value');
      });

      test('should throw ResourceNotFoundError without default for non-existent key', async () => {
        await expect(client.getString('app-config', 'nonexistent')).rejects.toThrow(
          ResourceNotFoundError
        );
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.getString('app-config', '')).rejects.toThrow(ValidationError);
      });
    });

    describe('getNumber', () => {
      test('should get number configuration value', async () => {
        const value = await client.getNumber('app-config', 'maxConnections');

        expect(value).toBeDefined();
        expect(typeof value).toBe('number');
      });

      test('should return default value for non-existent key', async () => {
        const value = await client.getNumber('app-config', 'nonexistent', 100);

        expect(value).toBe(100);
      });

      test('should throw ValidationError for non-numeric value', async () => {
        await expect(client.getNumber('app-config', 'appName')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.getNumber('app-config', '')).rejects.toThrow(ValidationError);
      });
    });

    describe('getBoolean', () => {
      test('should get boolean configuration value', async () => {
        const value = await client.getBoolean('app-config', 'featureEnabled');

        expect(value).toBeDefined();
        expect(typeof value).toBe('boolean');
      });

      test('should return default value for non-existent key', async () => {
        const value = await client.getBoolean('app-config', 'nonexistent', true);

        expect(value).toBe(true);
      });

      test('should handle string "true" as boolean', async () => {
        const value = await client.getBoolean('app-config', 'stringTrue');

        expect(value).toBe(true);
      });

      test('should handle string "false" as boolean', async () => {
        const value = await client.getBoolean('app-config', 'stringFalse');

        expect(value).toBe(false);
      });

      test('should throw ValidationError for empty key', async () => {
        await expect(client.getBoolean('app-config', '')).rejects.toThrow(ValidationError);
      });
    });
  });
}

// Run contract tests against Mock provider with setup
testConfigClientContract(
  'MockConfigClient',
  () => new MockConfigClient(),
  (client) => {
    // Setup test configurations
    client.setConfig('app-config', {
      appName: 'TestApp',
      maxConnections: 10,
      featureEnabled: true,
      stringTrue: 'true',
      stringFalse: 'false',
    });
    client.setConfig('app-config', { environment: 'prod', debug: false }, 'production');
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsConfigClient } from '../../../src/providers/aws/clients/AwsConfigClient';
// testConfigClientContract('AwsConfigClient', () => new AwsConfigClient({ provider: ProviderType.AWS }));
