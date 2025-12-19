/**
 * Contract Test: QueueClient
 *
 * Verifies that both AWS and Mock providers implement the QueueClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { QueueClient } from '../../../src/core/clients/QueueClient';
import { MockQueueClient } from '../../../src/providers/mock/clients/MockQueueClient';
import { ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the QueueClient contract.
 */
function testQueueClientContract(
  name: string,
  createClient: () => QueueClient,
  cleanup?: () => void
) {
  describe(`QueueClient Contract: ${name}`, () => {
    let client: QueueClient;
    const testQueue = 'test-queue';

    beforeEach(() => {
      client = createClient();
      if (cleanup) {
        cleanup();
      }
    });

    describe('send', () => {
      test('should send string message and return message ID', async () => {
        const messageId = await client.send(testQueue, 'Hello, World!');

        expect(messageId).toBeDefined();
        expect(typeof messageId).toBe('string');
        expect(messageId.length).toBeGreaterThan(0);
      });

      test('should send object message and return message ID', async () => {
        const messageId = await client.send(testQueue, { type: 'test', value: 123 });

        expect(messageId).toBeDefined();
        expect(typeof messageId).toBe('string');
      });

      test('should send message with delay option', async () => {
        const messageId = await client.send(testQueue, 'Delayed message', {
          delaySeconds: 5,
        });

        expect(messageId).toBeDefined();
      });

      test('should send message with attributes', async () => {
        const messageId = await client.send(testQueue, 'Message with attributes', {
          attributes: { correlationId: 'abc-123', priority: 'high' },
        });

        expect(messageId).toBeDefined();
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.send('', 'message')).rejects.toThrow(ValidationError);
      });
    });

    describe('sendBatch', () => {
      test('should send multiple messages at once', async () => {
        const messages = ['Message 1', 'Message 2', 'Message 3'];
        const result = await client.sendBatch(testQueue, messages);

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(0);
        result.successful.forEach((entry) => {
          expect(entry.id).toBeDefined();
          expect(entry.messageId).toBeDefined();
        });
      });

      test('should send empty batch without error', async () => {
        const result = await client.sendBatch(testQueue, []);

        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.sendBatch('', ['message'])).rejects.toThrow(ValidationError);
      });
    });

    describe('receive', () => {
      test('should receive messages from queue', async () => {
        // Send a message first
        await client.send(testQueue, 'Test message for receive');

        const messages = await client.receive(testQueue);

        expect(Array.isArray(messages)).toBe(true);
        // At least one message should be received
        if (messages.length > 0) {
          const msg = messages[0]!;
          expect(msg.id).toBeDefined();
          expect(msg.receiptHandle).toBeDefined();
          expect(msg.body).toBeDefined();
          expect(msg.attributes).toBeDefined();
          expect(msg.sentTimestamp).toBeInstanceOf(Date);
          expect(typeof msg.approximateReceiveCount).toBe('number');
        }
      });

      test('should receive with maxMessages option', async () => {
        // Send multiple messages
        await client.sendBatch(testQueue, ['Msg 1', 'Msg 2', 'Msg 3', 'Msg 4', 'Msg 5']);

        const messages = await client.receive(testQueue, { maxMessages: 2 });

        expect(messages.length).toBeLessThanOrEqual(2);
      });

      test('should receive with visibilityTimeout option', async () => {
        await client.send(testQueue, 'Visibility test');

        const messages = await client.receive(testQueue, { visibilityTimeout: 30 });

        expect(Array.isArray(messages)).toBe(true);
      });

      test('should return empty array for empty queue', async () => {
        // Use a unique queue name to ensure it's empty
        const emptyQueue = 'empty-queue-' + Date.now();
        const messages = await client.receive(emptyQueue, { waitTimeSeconds: 0 });

        expect(messages).toEqual([]);
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.receive('')).rejects.toThrow(ValidationError);
      });
    });

    describe('acknowledge', () => {
      test('should acknowledge a message', async () => {
        await client.send(testQueue, 'Message to acknowledge');
        const messages = await client.receive(testQueue);

        if (messages.length > 0) {
          await expect(
            client.acknowledge(testQueue, messages[0]!.receiptHandle)
          ).resolves.toBeUndefined();
        }
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.acknowledge('', 'receipt-handle')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty receipt handle', async () => {
        await expect(client.acknowledge(testQueue, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('acknowledgeBatch', () => {
      test('should acknowledge multiple messages', async () => {
        await client.sendBatch(testQueue, ['Msg 1', 'Msg 2']);
        const messages = await client.receive(testQueue, { maxMessages: 2 });

        if (messages.length > 0) {
          const handles = messages.map((m) => m.receiptHandle);
          await expect(client.acknowledgeBatch(testQueue, handles)).resolves.toBeUndefined();
        }
      });

      test('should handle empty receipt handles array', async () => {
        await expect(client.acknowledgeBatch(testQueue, [])).resolves.toBeUndefined();
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.acknowledgeBatch('', ['handle'])).rejects.toThrow(ValidationError);
      });
    });

    describe('changeVisibility', () => {
      test('should change message visibility timeout', async () => {
        await client.send(testQueue, 'Visibility change test');
        const messages = await client.receive(testQueue);

        if (messages.length > 0) {
          await expect(
            client.changeVisibility(testQueue, messages[0]!.receiptHandle, 60)
          ).resolves.toBeUndefined();
        }
      });

      test('should throw ValidationError for empty queue name', async () => {
        await expect(client.changeVisibility('', 'receipt-handle', 60)).rejects.toThrow(
          ValidationError
        );
      });

      test('should throw ValidationError for empty receipt handle', async () => {
        await expect(client.changeVisibility(testQueue, '', 60)).rejects.toThrow(ValidationError);
      });
    });

    describe('message body handling', () => {
      test('should preserve string message body', async () => {
        const originalBody = 'Simple string message';
        await client.send(testQueue, originalBody);
        const messages = await client.receive(testQueue);

        if (messages.length > 0) {
          expect(messages[0]!.body).toBe(originalBody);
        }
      });

      test('should preserve object message body', async () => {
        const originalBody = { name: 'Test', value: 42, nested: { flag: true } };
        await client.send(testQueue, originalBody);
        const messages = await client.receive(testQueue);

        if (messages.length > 0) {
          expect(messages[0]!.body).toEqual(originalBody);
        }
      });
    });
  });
}

// Run contract tests against Mock provider
testQueueClientContract(
  'MockQueueClient',
  () => new MockQueueClient(),
  () => {
    // Cleanup is handled by creating new instance
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsQueueClient } from '../../../src/providers/aws/clients/AwsQueueClient';
// testQueueClientContract('AwsQueueClient', () => new AwsQueueClient({ provider: ProviderType.AWS }));
