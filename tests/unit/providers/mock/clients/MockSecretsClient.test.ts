/**
 * Unit Tests for MockSecretsClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockSecretsClient } from '../../../../../src/providers/mock/clients/MockSecretsClient';
import { ResourceNotFoundError, ValidationError } from '../../../../../src/core/types/common';

describe('MockSecretsClient', () => {
  let client: MockSecretsClient;

  beforeEach(() => {
    client = new MockSecretsClient();
    client.reset();
  });

  describe('get', () => {
    test('should get a string secret', async () => {
      client.setSecret('api-key', 'sk-12345');
      const value = await client.get('api-key');
      expect(value).toBe('sk-12345');
    });

    test('should get an object secret', async () => {
      client.setSecret('db-credentials', { username: 'admin', password: 'secret' });
      const value = await client.get('db-credentials');
      expect(value).toEqual({ username: 'admin', password: 'secret' });
    });

    test('should get specific version', async () => {
      client.setSecret('rotating-secret', 'version-1');
      client.setSecret('rotating-secret', 'version-2', 'AWSPREVIOUS');

      const current = await client.get('rotating-secret');
      expect(current).toBe('version-1');

      const previous = await client.get('rotating-secret', 'AWSPREVIOUS');
      expect(previous).toBe('version-2');
    });

    test('should throw ResourceNotFoundError for non-existent secret', async () => {
      expect(client.get('non-existent')).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    test('should throw ResourceNotFoundError for non-existent version', async () => {
      client.setSecret('test-secret', 'value');
      expect(client.get('test-secret', 'non-existent-version')).rejects.toBeInstanceOf(
        ResourceNotFoundError
      );
    });

    test('should throw ValidationError for empty secret name', async () => {
      expect(client.get('')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('getJson', () => {
    test('should parse JSON string secret', async () => {
      client.setSecret('json-secret', '{"key": "value", "count": 42}');
      const value = await client.getJson<{ key: string; count: number }>('json-secret');
      expect(value.key).toBe('value');
      expect(value.count).toBe(42);
    });

    test('should return object secret directly', async () => {
      client.setSecret('object-secret', { key: 'value' });
      const value = await client.getJson<{ key: string }>('object-secret');
      expect(value.key).toBe('value');
    });

    test('should throw ValidationError for invalid JSON', async () => {
      client.setSecret('invalid-json', 'not valid json');
      expect(client.getJson('invalid-json')).rejects.toBeInstanceOf(ValidationError);
    });

    test('should get specific version as JSON', async () => {
      client.setSecret('versioned', '{"version": 1}');
      client.setSecret('versioned', '{"version": 2}', 'v2');

      const current = await client.getJson<{ version: number }>('versioned');
      expect(current.version).toBe(1);

      const v2 = await client.getJson<{ version: number }>('versioned', 'v2');
      expect(v2.version).toBe(2);
    });
  });

  describe('integration', () => {
    test('should support typical secret access patterns', async () => {
      // Set up secrets
      client.setSecret('app/database', { host: 'db.example.com', password: 'secret123' });
      client.setSecret('app/api-key', 'sk-abcdef123456');

      // Access database credentials
      const dbCreds = await client.getJson<{ host: string; password: string }>('app/database');
      expect(dbCreds.host).toBe('db.example.com');

      // Access API key
      const apiKey = await client.get('app/api-key');
      expect(apiKey).toBe('sk-abcdef123456');
    });
  });
});
