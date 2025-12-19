/**
 * Contract Test: SecretsClient
 *
 * Verifies that both AWS and Mock providers implement the SecretsClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { SecretsClient } from '../../../src/core/clients/SecretsClient';
import { MockSecretsClient } from '../../../src/providers/mock/clients/MockSecretsClient';
import { ResourceNotFoundError, ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the SecretsClient contract.
 */
function testSecretsClientContract(
  name: string,
  createClient: () => MockSecretsClient | SecretsClient,
  setup?: (client: MockSecretsClient) => void
) {
  describe(`SecretsClient Contract: ${name}`, () => {
    let client: SecretsClient;

    beforeEach(() => {
      const c = createClient();
      client = c;
      if (setup && c instanceof MockSecretsClient) {
        setup(c);
      }
    });

    describe('get', () => {
      test('should get string secret value', async () => {
        const value = await client.get('api-key');

        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });

      test('should throw ResourceNotFoundError for non-existent secret', async () => {
        await expect(client.get('nonexistent-secret')).rejects.toThrow(ResourceNotFoundError);
      });

      test('should throw ValidationError for empty secret name', async () => {
        await expect(client.get('')).rejects.toThrow(ValidationError);
      });
    });

    describe('getJson', () => {
      test('should get and parse JSON secret', async () => {
        const value = await client.getJson<{ username: string; password: string }>(
          'db-credentials'
        );

        expect(value).toBeDefined();
        expect(typeof value).toBe('object');
        expect(value.username).toBeDefined();
        expect(value.password).toBeDefined();
      });

      test('should throw ResourceNotFoundError for non-existent secret', async () => {
        await expect(client.getJson('nonexistent-json-secret')).rejects.toThrow(
          ResourceNotFoundError
        );
      });

      test('should throw ValidationError for empty secret name', async () => {
        await expect(client.getJson('')).rejects.toThrow(ValidationError);
      });
    });

    describe('secret value types', () => {
      test('should handle secrets with special characters', async () => {
        const value = await client.get('special-chars');

        expect(value).toContain('!@#$%');
      });

      test('should handle JSON with nested objects', async () => {
        const value = await client.getJson<{ config: { nested: { deep: string } } }>('nested-json');

        expect(value.config.nested.deep).toBe('value');
      });
    });
  });
}

// Run contract tests against Mock provider with setup
testSecretsClientContract(
  'MockSecretsClient',
  () => new MockSecretsClient(),
  (client) => {
    // Setup test secrets
    client.setSecret('api-key', 'secret-api-key-123');
    client.setSecret('db-credentials', JSON.stringify({ username: 'admin', password: 'secret' }));
    client.setSecret('special-chars', 'password!@#$%^&*()');
    client.setSecret('nested-json', JSON.stringify({ config: { nested: { deep: 'value' } } }));
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsSecretsClient } from '../../../src/providers/aws/clients/AwsSecretsClient';
// testSecretsClientContract('AwsSecretsClient', () => new AwsSecretsClient({ provider: ProviderType.AWS }));
