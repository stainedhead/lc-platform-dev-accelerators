/**
 * Unit Tests for MockNotificationClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockNotificationClient } from '../../../../../src/providers/mock/clients/MockNotificationClient';
import { ValidationError } from '../../../../../src/core/types/common';

describe('MockNotificationClient', () => {
  let client: MockNotificationClient;

  beforeEach(() => {
    client = new MockNotificationClient();
    client.reset();
  });

  describe('publish', () => {
    test('should publish message and return message ID', async () => {
      const messageId = await client.publish('alerts', {
        body: 'New alert notification',
      });

      expect(messageId).toMatch(/^mock-notification-/);
    });

    test('should publish message with subject', async () => {
      await client.publish('alerts', {
        subject: 'Critical Alert',
        body: 'Something happened',
      });

      const messages = client.getPublishedMessages('alerts');
      expect(messages[0]?.subject).toBe('Critical Alert');
      expect(messages[0]?.body).toBe('Something happened');
    });

    test('should publish message with attributes', async () => {
      await client.publish('alerts', {
        body: 'Alert',
        attributes: { priority: 'high', source: 'monitoring' },
      });

      const messages = client.getPublishedMessages('alerts');
      expect(messages[0]?.attributes).toEqual({ priority: 'high', source: 'monitoring' });
    });

    test('should throw ValidationError for empty topic name', async () => {
      expect(client.publish('', { body: 'test' })).rejects.toBeInstanceOf(ValidationError);
    });

    test('should throw ValidationError for empty body', async () => {
      expect(client.publish('topic', { body: '' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('publishBatch', () => {
    test('should publish multiple messages', async () => {
      const result = await client.publishBatch('alerts', [
        { body: 'Alert 1' },
        { body: 'Alert 2' },
        { body: 'Alert 3' },
      ]);

      expect(result.successful.length).toBe(3);
      expect(result.failed.length).toBe(0);

      const messages = client.getPublishedMessages('alerts');
      expect(messages.length).toBe(3);
    });

    test('should return failed entries for invalid messages', async () => {
      const result = await client.publishBatch('alerts', [
        { body: 'Valid message' },
        { body: '' }, // Invalid - empty body
      ]);

      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0]?.code).toBe('PublishError');
    });
  });

  describe('getPublishedMessages', () => {
    test('should return all published messages for topic', async () => {
      await client.publish('topic1', { body: 'msg1' });
      await client.publish('topic1', { body: 'msg2' });
      await client.publish('topic2', { body: 'msg3' });

      const topic1Messages = client.getPublishedMessages('topic1');
      expect(topic1Messages.length).toBe(2);

      const topic2Messages = client.getPublishedMessages('topic2');
      expect(topic2Messages.length).toBe(1);
    });

    test('should return empty array for unknown topic', async () => {
      const messages = client.getPublishedMessages('unknown');
      expect(messages).toEqual([]);
    });
  });

  describe('integration', () => {
    test('should support typical notification patterns', async () => {
      // Send various notifications
      await client.publish('order-updates', {
        subject: 'Order Confirmed',
        body: 'Your order #123 has been confirmed',
        attributes: { orderId: '123', userId: 'u456' },
      });

      await client.publish('order-updates', {
        subject: 'Order Shipped',
        body: 'Your order #123 has shipped',
        attributes: { orderId: '123', trackingNumber: 'TRK789' },
      });

      // Verify notifications
      const notifications = client.getPublishedMessages('order-updates');
      expect(notifications.length).toBe(2);
      expect(notifications[0]?.subject).toBe('Order Confirmed');
      expect(notifications[1]?.subject).toBe('Order Shipped');
    });
  });
});
