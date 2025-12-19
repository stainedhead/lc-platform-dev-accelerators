/**
 * Unit Tests for MockConfigClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockConfigClient } from '../../../../../src/providers/mock/clients/MockConfigClient';
import { ResourceNotFoundError, ValidationError } from '../../../../../src/core/types/common';

describe('MockConfigClient', () => {
  let client: MockConfigClient;

  beforeEach(() => {
    client = new MockConfigClient();
    client.reset();
  });

  describe('get', () => {
    test('should get configuration data', async () => {
      client.setConfig('app-settings', { maxRetries: 3, timeout: 30 });
      const config = await client.get('app-settings');
      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(30);
    });

    test('should get environment-specific configuration', async () => {
      client.setConfig('app-settings', { debug: false });
      client.setConfig('app-settings', { debug: true }, 'development');

      const prodConfig = await client.get('app-settings');
      expect(prodConfig.debug).toBe(false);

      const devConfig = await client.get('app-settings', 'development');
      expect(devConfig.debug).toBe(true);
    });

    test('should throw ResourceNotFoundError for non-existent config', async () => {
      expect(client.get('non-existent')).rejects.toBeInstanceOf(ResourceNotFoundError);
    });

    test('should throw ValidationError for empty config name', async () => {
      expect(client.get('')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('getString', () => {
    test('should get string value', async () => {
      client.setConfig('app', { apiUrl: 'https://api.example.com' });
      const value = await client.getString('app', 'apiUrl');
      expect(value).toBe('https://api.example.com');
    });

    test('should convert non-string values', async () => {
      client.setConfig('app', { port: 8080 });
      const value = await client.getString('app', 'port');
      expect(value).toBe('8080');
    });

    test('should return default value for missing key', async () => {
      client.setConfig('app', {});
      const value = await client.getString('app', 'missing', 'default');
      expect(value).toBe('default');
    });

    test('should throw ResourceNotFoundError for missing key without default', async () => {
      client.setConfig('app', {});
      expect(client.getString('app', 'missing')).rejects.toBeInstanceOf(ResourceNotFoundError);
    });
  });

  describe('getNumber', () => {
    test('should get number value', async () => {
      client.setConfig('app', { maxConnections: 100 });
      const value = await client.getNumber('app', 'maxConnections');
      expect(value).toBe(100);
    });

    test('should parse string numbers', async () => {
      client.setConfig('app', { timeout: '30' });
      const value = await client.getNumber('app', 'timeout');
      expect(value).toBe(30);
    });

    test('should return default value for missing key', async () => {
      client.setConfig('app', {});
      const value = await client.getNumber('app', 'missing', 42);
      expect(value).toBe(42);
    });

    test('should throw ValidationError for non-numeric value', async () => {
      client.setConfig('app', { invalid: 'not a number' });
      expect(client.getNumber('app', 'invalid')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('getBoolean', () => {
    test('should get boolean value', async () => {
      client.setConfig('app', { enabled: true });
      const value = await client.getBoolean('app', 'enabled');
      expect(value).toBe(true);
    });

    test('should parse string booleans', async () => {
      client.setConfig('app', {
        trueStr: 'true',
        falseStr: 'false',
        oneStr: '1',
        yesStr: 'yes',
      });

      expect(client.getBoolean('app', 'trueStr')).resolves.toBe(true);
      expect(client.getBoolean('app', 'falseStr')).resolves.toBe(false);
      expect(client.getBoolean('app', 'oneStr')).resolves.toBe(true);
      expect(client.getBoolean('app', 'yesStr')).resolves.toBe(true);
    });

    test('should return default value for missing key', async () => {
      client.setConfig('app', {});
      const value = await client.getBoolean('app', 'missing', false);
      expect(value).toBe(false);
    });
  });

  describe('integration', () => {
    test('should support typical config access patterns', async () => {
      // Set up configuration
      client.setConfig('api-service', {
        baseUrl: 'https://api.example.com',
        timeout: 30,
        retries: 3,
        debug: false,
      });

      client.setConfig(
        'api-service',
        {
          baseUrl: 'http://localhost:3000',
          timeout: 5,
          retries: 0,
          debug: true,
        },
        'development'
      );

      // Access production config
      const prodUrl = await client.getString('api-service', 'baseUrl');
      expect(prodUrl).toBe('https://api.example.com');

      // Access development config
      const devDebug = await client.getBoolean('api-service', 'debug');
      expect(devDebug).toBe(false); // Gets default config since no env specified

      const devConfig = await client.get('api-service', 'development');
      expect(devConfig.debug).toBe(true);
    });
  });
});
