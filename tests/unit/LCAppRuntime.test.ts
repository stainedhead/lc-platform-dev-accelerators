/**
 * Unit Tests for LCAppRuntime
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { LCAppRuntime } from '../../src/LCAppRuntime';
import { ProviderType, ValidationError } from '../../src/core/types/common';
import { MockQueueClient } from '../../src/providers/mock/clients/MockQueueClient';
import { MockObjectClient } from '../../src/providers/mock/clients/MockObjectClient';
import { MockSecretsClient } from '../../src/providers/mock/clients/MockSecretsClient';
import { MockConfigClient } from '../../src/providers/mock/clients/MockConfigClient';
import { MockEventPublisher } from '../../src/providers/mock/clients/MockEventPublisher';
import { MockNotificationClient } from '../../src/providers/mock/clients/MockNotificationClient';
import { MockDocumentClient } from '../../src/providers/mock/clients/MockDocumentClient';
import { MockDataClient } from '../../src/providers/mock/clients/MockDataClient';
import { MockAuthClient } from '../../src/providers/mock/clients/MockAuthClient';

describe('LCAppRuntime', () => {
  let runtime: LCAppRuntime;

  beforeEach(() => {
    runtime = new LCAppRuntime({ provider: ProviderType.MOCK });
  });

  describe('constructor', () => {
    test('should create runtime with provider config', () => {
      const config = runtime.getConfig();
      expect(config.provider).toBe(ProviderType.MOCK);
    });

    test('should preserve optional config values', () => {
      const customRuntime = new LCAppRuntime({
        provider: ProviderType.MOCK,
        region: 'us-east-1',
        endpoint: 'http://localhost:4566',
        options: { custom: 'value' },
      });

      const config = customRuntime.getConfig();
      expect(config.region).toBe('us-east-1');
      expect(config.endpoint).toBe('http://localhost:4566');
      expect(config.options).toEqual({ custom: 'value' });
    });
  });

  describe('getQueueClient', () => {
    test('should return a QueueClient instance', () => {
      const client = runtime.getQueueClient();
      expect(client).toBeInstanceOf(MockQueueClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getQueueClient();
      const client2 = runtime.getQueueClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getQueueClient();
      const messageId = await client.send('test-queue', { data: 'test' });
      expect(messageId).toBeDefined();
    });
  });

  describe('getObjectClient', () => {
    test('should return an ObjectClient instance', () => {
      const client = runtime.getObjectClient();
      expect(client).toBeInstanceOf(MockObjectClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getObjectClient();
      const client2 = runtime.getObjectClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getObjectClient();
      await client.put('bucket', 'key', Buffer.from('test'), { contentType: 'text/plain' });
      const obj = await client.get('bucket', 'key');
      expect((obj.data as Buffer).toString()).toBe('test');
    });
  });

  describe('getSecretsClient', () => {
    test('should return a SecretsClient instance', () => {
      const client = runtime.getSecretsClient();
      expect(client).toBeInstanceOf(MockSecretsClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getSecretsClient();
      const client2 = runtime.getSecretsClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getSecretsClient() as MockSecretsClient;
      client.setSecret('test-secret', 'secret-value');
      const value = await client.get('test-secret');
      expect(value).toBe('secret-value');
    });
  });

  describe('getConfigClient', () => {
    test('should return a ConfigClient instance', () => {
      const client = runtime.getConfigClient();
      expect(client).toBeInstanceOf(MockConfigClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getConfigClient();
      const client2 = runtime.getConfigClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getConfigClient() as MockConfigClient;
      client.setConfig('test-config', { key: 'value' });
      const config = await client.get('test-config');
      expect(config).toEqual({ key: 'value' });
    });
  });

  describe('getEventPublisher', () => {
    test('should return an EventPublisher instance', () => {
      const client = runtime.getEventPublisher();
      expect(client).toBeInstanceOf(MockEventPublisher);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getEventPublisher();
      const client2 = runtime.getEventPublisher();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getEventPublisher();
      const eventId = await client.publish('test-bus', {
        source: 'test',
        type: 'TestEvent',
        data: { test: true },
      });
      expect(eventId).toBeDefined();
    });
  });

  describe('getNotificationClient', () => {
    test('should return a NotificationClient instance', () => {
      const client = runtime.getNotificationClient();
      expect(client).toBeInstanceOf(MockNotificationClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getNotificationClient();
      const client2 = runtime.getNotificationClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getNotificationClient();
      const messageId = await client.publish('test-topic', { body: 'test message' });
      expect(messageId).toBeDefined();
    });
  });

  describe('getDocumentClient', () => {
    test('should return a DocumentClient instance', () => {
      const client = runtime.getDocumentClient();
      expect(client).toBeInstanceOf(MockDocumentClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getDocumentClient();
      const client2 = runtime.getDocumentClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getDocumentClient();
      await client.put('test-collection', { _id: 'doc1', name: 'test' });
      const doc = await client.get('test-collection', 'doc1');
      expect(doc?.name).toBe('test');
    });
  });

  describe('getDataClient', () => {
    test('should return a DataClient instance', () => {
      const client = runtime.getDataClient();
      expect(client).toBeInstanceOf(MockDataClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getDataClient();
      const client2 = runtime.getDataClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getDataClient() as MockDataClient;
      client.setTableData('users', [{ id: 1, name: 'Alice' }]);
      const results = await client.query('SELECT * FROM users');
      expect(results.length).toBe(1);
    });
  });

  describe('getAuthClient', () => {
    test('should return an AuthClient instance', () => {
      const client = runtime.getAuthClient();
      expect(client).toBeInstanceOf(MockAuthClient);
    });

    test('should return the same instance on subsequent calls', () => {
      const client1 = runtime.getAuthClient();
      const client2 = runtime.getAuthClient();
      expect(client1).toBe(client2);
    });

    test('should be functional', async () => {
      const client = runtime.getAuthClient() as MockAuthClient;
      client.registerToken(
        'valid-token',
        {
          sub: 'user-123',
          iss: 'test',
          aud: 'test',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
        { sub: 'user-123', email: 'user@example.com' }
      );
      const claims = await client.validateToken('valid-token');
      expect(claims.sub).toBe('user-123');
    });
  });

  describe('provider errors', () => {
    test('should throw for unknown provider', () => {
      expect(() => {
        const invalidRuntime = new LCAppRuntime({ provider: 'invalid' as ProviderType });
        invalidRuntime.getQueueClient();
      }).toThrow(ValidationError);
    });

    test('should create AWS clients successfully', () => {
      const awsRuntime = new LCAppRuntime({ provider: ProviderType.AWS });
      expect(() => awsRuntime.getQueueClient()).not.toThrow();
      expect(() => awsRuntime.getObjectClient()).not.toThrow();
      expect(() => awsRuntime.getSecretsClient()).not.toThrow();
      expect(() => awsRuntime.getConfigClient()).not.toThrow();
      expect(() => awsRuntime.getEventPublisher()).not.toThrow();
      expect(() => awsRuntime.getNotificationClient()).not.toThrow();
      expect(() => awsRuntime.getDocumentClient()).not.toThrow();
      expect(() => awsRuntime.getDataClient()).not.toThrow();
      expect(() => awsRuntime.getAuthClient()).not.toThrow();
    });

    test('should throw for Azure (not yet implemented)', () => {
      const azureRuntime = new LCAppRuntime({ provider: ProviderType.AZURE });
      expect(() => azureRuntime.getQueueClient()).toThrow('Azure QueueClient not yet implemented');
    });
  });

  describe('integration', () => {
    test('should support typical app workflow', async () => {
      // Get all clients
      const queue = runtime.getQueueClient();
      const secrets = runtime.getSecretsClient() as MockSecretsClient;
      const config = runtime.getConfigClient() as MockConfigClient;
      const documents = runtime.getDocumentClient();
      const events = runtime.getEventPublisher();

      // Setup test data
      secrets.setSecret('api-key', 'secret-123');
      config.setConfig('app-config', { feature: true });

      // Typical workflow: read config, process message, store document, publish event
      const appConfig = await config.get('app-config');
      expect(appConfig.feature).toBe(true);

      const apiKey = await secrets.get('api-key');
      expect(apiKey).toBe('secret-123');

      await queue.send('orders', { orderId: '123' });
      const messages = await queue.receive('orders');
      expect(messages.length).toBe(1);

      await documents.put('orders', { _id: '123', status: 'processed' });
      const order = await documents.get('orders', '123');
      expect(order?.status).toBe('processed');

      const eventId = await events.publish('domain-events', {
        source: 'order-service',
        type: 'OrderProcessed',
        data: { orderId: '123' },
      });
      expect(eventId).toBeDefined();
    });
  });
});
