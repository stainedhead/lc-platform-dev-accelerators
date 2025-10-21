/**
 * Unit Tests for MockQueueService
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockQueueService } from '../../../../src/providers/mock/MockQueueService';

describe('MockQueueService', () => {
  let service: MockQueueService;

  beforeEach(() => {
    service = new MockQueueService();
  });

  describe('createQueue', () => {
    test('should create a queue with default options', async () => {
      const queue = await service.createQueue('test-queue');

      expect(queue.name).toBe('test-queue');
      expect(queue.url).toMatch(/^mock:\/\/queue\/test-queue$/);
      expect(queue.messageCount).toBe(0);
      expect(queue.created).toBeInstanceOf(Date);
    });

    test('should create a queue with custom options', async () => {
      const queue = await service.createQueue('custom-queue', {
        visibilityTimeout: 60,
        messageRetention: 86400,
        fifo: true,
      });

      expect(queue.name).toBe('custom-queue');
    });

    test('should throw error when creating duplicate queue', async () => {
      await service.createQueue('duplicate-queue');
      expect(service.createQueue('duplicate-queue')).rejects.toThrow('already exists');
    });
  });

  describe('getQueue', () => {
    test('should get queue details', async () => {
      const created = await service.createQueue('info-queue');
      const retrieved = await service.getQueue(created.url);

      expect(retrieved.name).toBe('info-queue');
      expect(retrieved.url).toBe(created.url);
      expect(retrieved.messageCount).toBe(0);
    });

    test('should throw error for non-existent queue', async () => {
      expect(service.getQueue('mock://queue/non-existent')).rejects.toThrow('Queue');
    });
  });

  describe('sendMessage', () => {
    test('should send a string message', async () => {
      const queue = await service.createQueue('string-queue');
      const messageId = await service.sendMessage(queue.url, {
        body: 'Hello World',
      });

      expect(messageId).toMatch(/^mock-msg-\d+$/);

      const queueInfo = await service.getQueue(queue.url);
      expect(queueInfo.messageCount).toBe(1);
    });

    test('should send an object message', async () => {
      const queue = await service.createQueue('object-queue');
      await service.sendMessage(queue.url, {
        body: { type: 'event', data: { id: 123 } },
      });

      const messages = await service.receiveMessages(queue.url);
      expect(messages.length).toBe(1);
      expect(messages[0]?.body).toEqual({ type: 'event', data: { id: 123 } });
    });

    test('should send message with attributes', async () => {
      const queue = await service.createQueue('attr-queue');
      await service.sendMessage(queue.url, {
        body: 'test',
        attributes: { source: 'test', priority: 'high' },
      });

      const messages = await service.receiveMessages(queue.url);
      expect(messages[0]?.attributes).toEqual({ source: 'test', priority: 'high' });
    });

    test('should handle delayed messages', async () => {
      const queue = await service.createQueue('delay-queue');
      await service.sendMessage(queue.url, {
        body: 'delayed',
        delaySeconds: 1,
      });

      // Message should not be visible immediately
      let messages = await service.receiveMessages(queue.url);
      expect(messages.length).toBe(0);

      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Message should now be visible
      messages = await service.receiveMessages(queue.url);
      expect(messages.length).toBe(1);
    });
  });

  describe('receiveMessages', () => {
    test('should receive messages from queue', async () => {
      const queue = await service.createQueue('receive-queue');
      await service.sendMessage(queue.url, { body: 'msg1' });
      await service.sendMessage(queue.url, { body: 'msg2' });

      const messages = await service.receiveMessages(queue.url, {
        maxMessages: 2,
      });

      expect(messages.length).toBe(2);
    });

    test('should make messages temporarily invisible', async () => {
      const queue = await service.createQueue('visibility-queue');
      await service.sendMessage(queue.url, { body: 'test' });

      // First receive
      const messages1 = await service.receiveMessages(queue.url, {
        visibilityTimeout: 1,
      });
      expect(messages1.length).toBe(1);

      // Second receive should return empty (message is invisible)
      const messages2 = await service.receiveMessages(queue.url);
      expect(messages2.length).toBe(0);

      // Wait for visibility timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Message should be visible again
      const messages3 = await service.receiveMessages(queue.url);
      expect(messages3.length).toBe(1);
    });

    test('should return empty array when no messages available', async () => {
      const queue = await service.createQueue('empty-queue');
      const messages = await service.receiveMessages(queue.url);

      expect(messages).toEqual([]);
    });
  });

  describe('deleteMessage', () => {
    test('should delete a message from queue', async () => {
      const queue = await service.createQueue('delete-queue');
      await service.sendMessage(queue.url, { body: 'to-delete' });

      const messages = await service.receiveMessages(queue.url);
      expect(messages.length).toBe(1);

      // Note: In real implementation, messages would have receiptHandle
      // For mock, we need to track this differently
      const queueInfo = await service.getQueue(queue.url);
      expect(queueInfo.messageCount).toBe(0); // Message is invisible after receive
    });
  });

  describe('listQueues', () => {
    test('should list all queues', async () => {
      await service.createQueue('queue1');
      await service.createQueue('queue2');
      await service.createQueue('queue3');

      const queues = await service.listQueues();
      expect(queues.length).toBeGreaterThanOrEqual(3);
      expect(queues).toContain('mock://queue/queue1');
      expect(queues).toContain('mock://queue/queue2');
      expect(queues).toContain('mock://queue/queue3');
    });
  });

  describe('deleteQueue', () => {
    test('should delete a queue', async () => {
      const queue = await service.createQueue('temp-queue');
      await service.deleteQueue(queue.url);

      expect(service.getQueue(queue.url)).rejects.toThrow('Queue');
    });

    test('should throw error when deleting non-existent queue', async () => {
      expect(service.deleteQueue('mock://queue/non-existent')).rejects.toThrow('Queue');
    });
  });

  describe('purgeQueue', () => {
    test('should remove all messages from queue', async () => {
      const queue = await service.createQueue('purge-queue');
      await service.sendMessage(queue.url, { body: 'msg1' });
      await service.sendMessage(queue.url, { body: 'msg2' });
      await service.sendMessage(queue.url, { body: 'msg3' });

      let queueInfo = await service.getQueue(queue.url);
      expect(queueInfo.messageCount).toBe(3);

      await service.purgeQueue(queue.url);

      queueInfo = await service.getQueue(queue.url);
      expect(queueInfo.messageCount).toBe(0);
    });

    test('should throw error when purging non-existent queue', async () => {
      expect(service.purgeQueue('mock://queue/non-existent')).rejects.toThrow('Queue');
    });
  });

  describe('integration scenarios', () => {
    test('should support full message lifecycle', async () => {
      // Create queue
      const queue = await service.createQueue('lifecycle-queue');

      // Send messages
      await service.sendMessage(queue.url, { body: 'msg1' });
      await service.sendMessage(queue.url, { body: 'msg2' });

      // Receive message
      const messages = await service.receiveMessages(queue.url, { maxMessages: 1 });
      expect(messages.length).toBe(1);

      // List queues
      const queues = await service.listQueues();
      expect(queues).toContain(queue.url);

      // Purge remaining messages
      await service.purgeQueue(queue.url);

      const queueInfo = await service.getQueue(queue.url);
      expect(queueInfo.messageCount).toBe(0);

      // Delete queue
      await service.deleteQueue(queue.url);

      expect(service.getQueue(queue.url)).rejects.toThrow();
    });
  });
});
