/**
 * Unit Tests for MockQueueClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockQueueClient } from '../../../../../src/providers/mock/clients/MockQueueClient';
import { ValidationError } from '../../../../../src/core/types/common';

describe('MockQueueClient', () => {
  let client: MockQueueClient;

  beforeEach(() => {
    client = new MockQueueClient();
    client.reset();
  });

  describe('send', () => {
    test('should send message and return message ID', async () => {
      const messageId = await client.send('test-queue', { data: 'test' });
      expect(messageId).toMatch(/^mock-msg-\d+$/);
    });

    test('should send string message', async () => {
      await client.send('test-queue', 'Hello World');
      const messages = await client.receive('test-queue');
      expect(messages[0]?.body).toBe('Hello World');
    });

    test('should send object message', async () => {
      await client.send('test-queue', { type: 'order', id: 123 });
      const messages = await client.receive('test-queue');
      expect(messages[0]?.body).toEqual({ type: 'order', id: 123 });
    });

    test('should send with attributes', async () => {
      await client.send('test-queue', 'test', { attributes: { source: 'unit-test' } });
      const messages = await client.receive('test-queue');
      expect(messages[0]?.attributes).toEqual({ source: 'unit-test' });
    });

    test('should throw ValidationError for empty queue name', async () => {
      expect(client.send('', 'test')).rejects.toBeInstanceOf(ValidationError);
    });

    test('should handle delayed messages', async () => {
      await client.send('test-queue', 'delayed', { delaySeconds: 1 });

      // Message should not be visible immediately
      let messages = await client.receive('test-queue');
      expect(messages.length).toBe(0);

      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Message should now be visible
      messages = await client.receive('test-queue');
      expect(messages.length).toBe(1);
    });
  });

  describe('sendBatch', () => {
    test('should send multiple messages', async () => {
      const result = await client.sendBatch('test-queue', ['msg1', 'msg2', 'msg3']);
      expect(result.successful.length).toBe(3);
      expect(result.failed.length).toBe(0);
    });

    test('should return successful and failed entries', async () => {
      const result = await client.sendBatch('test-queue', ['msg1', 'msg2']);
      expect(result.successful[0]?.id).toBe('0');
      expect(result.successful[1]?.id).toBe('1');
    });
  });

  describe('receive', () => {
    test('should receive messages from queue', async () => {
      await client.send('test-queue', 'msg1');
      await client.send('test-queue', 'msg2');

      const messages = await client.receive('test-queue', { maxMessages: 2 });
      expect(messages.length).toBe(2);
    });

    test('should respect maxMessages option', async () => {
      await client.send('test-queue', 'msg1');
      await client.send('test-queue', 'msg2');
      await client.send('test-queue', 'msg3');

      const messages = await client.receive('test-queue', { maxMessages: 1 });
      expect(messages.length).toBe(1);
    });

    test('should return empty array when no messages', async () => {
      const messages = await client.receive('test-queue');
      expect(messages).toEqual([]);
    });

    test('should include message metadata', async () => {
      await client.send('test-queue', 'test');
      const messages = await client.receive('test-queue');

      expect(messages[0]?.id).toBeDefined();
      expect(messages[0]?.receiptHandle).toBeDefined();
      expect(messages[0]?.sentTimestamp).toBeInstanceOf(Date);
      expect(messages[0]?.approximateReceiveCount).toBe(1);
    });

    test('should make messages temporarily invisible', async () => {
      await client.send('test-queue', 'test');

      // First receive
      const messages1 = await client.receive('test-queue', { visibilityTimeout: 1 });
      expect(messages1.length).toBe(1);

      // Second receive should return empty
      const messages2 = await client.receive('test-queue');
      expect(messages2.length).toBe(0);
    });
  });

  describe('acknowledge', () => {
    test('should delete message from queue', async () => {
      await client.send('test-queue', 'test');
      const messages = await client.receive('test-queue');

      await client.acknowledge('test-queue', messages[0]!.receiptHandle);

      // Wait for visibility timeout and check message is gone
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Re-receive should return empty since message was acknowledged
      const messagesAfter = await client.receive('test-queue');
      expect(messagesAfter.length).toBe(0);
    });

    test('should throw ValidationError for empty queue name', async () => {
      expect(client.acknowledge('', 'handle')).rejects.toBeInstanceOf(ValidationError);
    });

    test('should throw ValidationError for empty receipt handle', async () => {
      expect(client.acknowledge('test-queue', '')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('acknowledgeBatch', () => {
    test('should acknowledge multiple messages', async () => {
      await client.send('test-queue', 'msg1');
      await client.send('test-queue', 'msg2');

      const messages = await client.receive('test-queue', { maxMessages: 2 });
      const handles = messages.map((m) => m.receiptHandle);

      await client.acknowledgeBatch('test-queue', handles);

      const remaining = await client.receive('test-queue');
      expect(remaining.length).toBe(0);
    });
  });

  describe('changeVisibility', () => {
    test('should change visibility timeout', async () => {
      await client.send('test-queue', 'test');
      const messages = await client.receive('test-queue', { visibilityTimeout: 60 });

      // Make message visible immediately
      await client.changeVisibility('test-queue', messages[0]!.receiptHandle, 0);

      // Message should now be visible
      const visible = await client.receive('test-queue');
      expect(visible.length).toBe(1);
    });

    test('should extend visibility timeout', async () => {
      await client.send('test-queue', 'test');
      const messages = await client.receive('test-queue', { visibilityTimeout: 1 });

      // Extend visibility
      await client.changeVisibility('test-queue', messages[0]!.receiptHandle, 60);

      // Wait past original timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Message should still be invisible
      const stillInvisible = await client.receive('test-queue');
      expect(stillInvisible.length).toBe(0);
    });
  });

  describe('integration', () => {
    test('should support full message lifecycle', async () => {
      // Send messages
      await client.send('orders', { orderId: '123' });
      await client.send('orders', { orderId: '456' });

      // Receive and process
      const messages = await client.receive('orders', { maxMessages: 1 });
      expect(messages.length).toBe(1);

      // Acknowledge processed message
      await client.acknowledge('orders', messages[0]!.receiptHandle);

      // Receive next message
      const next = await client.receive('orders');
      expect(next.length).toBe(1);
    });
  });
});
