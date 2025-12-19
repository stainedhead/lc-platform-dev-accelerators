/**
 * Contract Test: NotificationClient
 *
 * Verifies that both AWS and Mock providers implement the NotificationClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { NotificationClient } from '../../../src/core/clients/NotificationClient';
import { MockNotificationClient } from '../../../src/providers/mock/clients/MockNotificationClient';
import { ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the NotificationClient contract.
 */
function testNotificationClientContract(
  name: string,
  createClient: () => NotificationClient,
  cleanup?: () => void
) {
  describe(`NotificationClient Contract: ${name}`, () => {
    let client: NotificationClient;
    const testTopic = 'test-topic';

    beforeEach(() => {
      client = createClient();
      if (cleanup) {
        cleanup();
      }
    });

    describe('publish', () => {
      test('should publish notification and return message ID', async () => {
        const messageId = await client.publish(testTopic, {
          body: 'Hello, World!',
        });

        expect(messageId).toBeDefined();
        expect(typeof messageId).toBe('string');
        expect(messageId.length).toBeGreaterThan(0);
      });

      test('should publish notification with subject', async () => {
        const messageId = await client.publish(testTopic, {
          subject: 'Important Update',
          body: 'This is an important update message.',
        });

        expect(messageId).toBeDefined();
      });

      test('should publish notification with attributes', async () => {
        const messageId = await client.publish(testTopic, {
          body: 'Message with attributes',
          attributes: {
            priority: 'high',
            category: 'alerts',
          },
        });

        expect(messageId).toBeDefined();
      });

      test('should throw ValidationError for empty topic name', async () => {
        await expect(client.publish('', { body: 'test' })).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty body', async () => {
        await expect(client.publish(testTopic, { body: '' })).rejects.toThrow(ValidationError);
      });
    });

    describe('publishBatch', () => {
      test('should publish multiple notifications at once', async () => {
        const messages = [
          { body: 'Message 1' },
          { body: 'Message 2', subject: 'Subject 2' },
          { body: 'Message 3', attributes: { type: 'batch' } },
        ];

        const result = await client.publishBatch(testTopic, messages);

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(0);
        result.successful.forEach((entry) => {
          expect(entry.id).toBeDefined();
        });
      });

      test('should handle empty messages array', async () => {
        const result = await client.publishBatch(testTopic, []);

        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      });

      test('should report failed messages for invalid entries', async () => {
        const messages = [
          { body: 'Valid message' },
          { body: '' }, // Invalid - empty body
        ];

        const result = await client.publishBatch(testTopic, messages);

        expect(result.successful.length + result.failed.length).toBe(2);
        expect(result.failed.length).toBeGreaterThan(0);
      });

      test('should throw ValidationError for empty topic name', async () => {
        await expect(client.publishBatch('', [{ body: 'test' }])).rejects.toThrow(ValidationError);
      });
    });

    describe('message content', () => {
      test('should handle long message body', async () => {
        const longBody = 'A'.repeat(10000);
        const messageId = await client.publish(testTopic, { body: longBody });

        expect(messageId).toBeDefined();
      });

      test('should handle special characters in body', async () => {
        const messageId = await client.publish(testTopic, {
          body: 'Special chars: <>&"\'{}[]\\n\\t',
        });

        expect(messageId).toBeDefined();
      });

      test('should handle unicode in body', async () => {
        const messageId = await client.publish(testTopic, {
          body: 'Unicode: 日本語 한국어 中文 🎉🚀',
        });

        expect(messageId).toBeDefined();
      });
    });
  });
}

// Run contract tests against Mock provider
testNotificationClientContract(
  'MockNotificationClient',
  () => new MockNotificationClient(),
  () => {
    // Cleanup is handled by creating new instance
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsNotificationClient } from '../../../src/providers/aws/clients/AwsNotificationClient';
// testNotificationClientContract('AwsNotificationClient', () => new AwsNotificationClient({ provider: ProviderType.AWS }));
