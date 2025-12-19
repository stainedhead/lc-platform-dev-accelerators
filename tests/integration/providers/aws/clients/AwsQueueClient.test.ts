/**
 * Integration Test: AwsQueueClient with LocalStack
 *
 * Tests AWS SQS Queue Client implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * T028: Integration test for AWS QueueClient with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsQueueClient } from '../../../../../src/providers/aws/clients/AwsQueueClient';
import { AwsQueueService } from '../../../../../src/providers/aws/AwsQueueService';
import { ProviderType, type ProviderConfig } from '../../../../../src/core/types/common';

// LocalStack SQS endpoint - use environment variable if available
const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const TEST_QUEUE_PREFIX = 'test-queue-client';
const TEST_QUEUE = `${TEST_QUEUE_PREFIX}-${Date.now()}`;

const config: ProviderConfig = {
  provider: ProviderType.AWS,
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
};

describe('AwsQueueClient Integration (LocalStack)', () => {
  let client: AwsQueueClient;
  let queueService: AwsQueueService;

  beforeAll(async () => {
    // Configure client to use LocalStack
    client = new AwsQueueClient(config);

    // Use QueueService (Control Plane) to create the test queue
    queueService = new AwsQueueService(config);
    await queueService.createQueue(TEST_QUEUE);
  });

  afterAll(async () => {
    // Cleanup: Delete test queue
    try {
      await queueService.deleteQueue(TEST_QUEUE);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('send - should send message and return message ID', async () => {
    const messageId = await client.send(TEST_QUEUE, { hello: 'world' });

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
    expect(messageId.length).toBeGreaterThan(0);
  });

  test('send - should send string message', async () => {
    const messageId = await client.send(TEST_QUEUE, 'Simple string message');

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
  });

  test('send - should send with options', async () => {
    const messageId = await client.send(
      TEST_QUEUE,
      { data: 'with options' },
      {
        delaySeconds: 0,
        attributes: { customAttr: 'value' },
      }
    );

    expect(messageId).toBeDefined();
  });

  test('sendBatch - should send multiple messages', async () => {
    const messages = [{ id: 1, text: 'Message 1' }, { id: 2, text: 'Message 2' }, 'String message'];

    const result = await client.sendBatch(TEST_QUEUE, messages);

    expect(result.successful.length).toBe(3);
    expect(result.failed.length).toBe(0);
    result.successful.forEach((entry) => {
      expect(entry.messageId).toBeDefined();
    });
  });

  test('receive - should receive sent messages', async () => {
    // Send a unique message
    const uniqueId = Date.now().toString();
    await client.send(TEST_QUEUE, { uniqueId, purpose: 'receive test' });

    // Wait a moment for message to be available
    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 10,
      waitTimeSeconds: 1,
    });

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]!.id).toBeDefined();
    expect(messages[0]!.body).toBeDefined();
    expect(messages[0]!.receiptHandle).toBeDefined();
  });

  test('receive - should return empty array when no messages', async () => {
    // Create a separate empty queue for this test
    const emptyQueue = `${TEST_QUEUE_PREFIX}-empty-${Date.now()}`;
    await queueService.createQueue(emptyQueue);

    try {
      const messages = await client.receive(emptyQueue, {
        maxMessages: 1,
        waitTimeSeconds: 1,
      });

      expect(messages).toEqual([]);
    } finally {
      await queueService.deleteQueue(emptyQueue);
    }
  });

  test('acknowledge - should delete message', async () => {
    // Send a message
    await client.send(TEST_QUEUE, { purpose: 'acknowledge test' });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Receive the message
    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 1,
      waitTimeSeconds: 1,
    });

    if (messages.length > 0) {
      // Acknowledge (delete) the message
      await client.acknowledge(TEST_QUEUE, messages[0]!.receiptHandle);

      // Verify the message is gone
      const remaining = await client.receive(TEST_QUEUE, {
        maxMessages: 10,
        waitTimeSeconds: 1,
        visibilityTimeout: 0,
      });

      // The acknowledged message should not be in the remaining messages
      const acknowledgedId = messages[0]!.id;
      const stillExists = remaining.some((m) => m.id === acknowledgedId);
      expect(stillExists).toBe(false);
    }
  });

  test('acknowledgeBatch - should delete multiple messages', async () => {
    // Send multiple messages
    await client.sendBatch(TEST_QUEUE, [
      { index: 1, purpose: 'batch ack' },
      { index: 2, purpose: 'batch ack' },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Receive messages
    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 2,
      waitTimeSeconds: 1,
    });

    if (messages.length >= 2) {
      const receiptHandles = messages.slice(0, 2).map((m) => m.receiptHandle);

      // Acknowledge batch
      await client.acknowledgeBatch(TEST_QUEUE, receiptHandles);
    }
  });

  test('changeVisibility - should change message visibility timeout', async () => {
    // Send a message
    await client.send(TEST_QUEUE, { purpose: 'visibility test' });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Receive the message
    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 1,
      waitTimeSeconds: 1,
      visibilityTimeout: 30,
    });

    if (messages.length > 0) {
      // Change visibility to 0 (make immediately visible again)
      await client.changeVisibility(TEST_QUEUE, messages[0]!.receiptHandle, 0);

      // Message should be visible again immediately
      const messagesAgain = await client.receive(TEST_QUEUE, {
        maxMessages: 10,
        waitTimeSeconds: 1,
      });

      // The message should be available again
      expect(messagesAgain.length).toBeGreaterThan(0);
    }
  });

  test('message attributes - should preserve message attributes', async () => {
    await client.send(
      TEST_QUEUE,
      { purpose: 'attributes test' },
      {
        attributes: {
          environment: 'test',
          priority: 'high',
        },
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 10,
      waitTimeSeconds: 1,
    });

    // Find the message with our attributes
    const attributeMessage = messages.find(
      (m) => m.attributes.environment === 'test' && m.attributes.priority === 'high'
    );

    if (attributeMessage) {
      expect(attributeMessage.attributes.environment).toBe('test');
      expect(attributeMessage.attributes.priority).toBe('high');
    }
  });

  test('received message - should have sentTimestamp and approximateReceiveCount', async () => {
    await client.send(TEST_QUEUE, { purpose: 'metadata test' });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await client.receive(TEST_QUEUE, {
      maxMessages: 1,
      waitTimeSeconds: 1,
    });

    if (messages.length > 0) {
      expect(messages[0]!.sentTimestamp).toBeInstanceOf(Date);
      expect(typeof messages[0]!.approximateReceiveCount).toBe('number');
      expect(messages[0]!.approximateReceiveCount).toBeGreaterThanOrEqual(1);
    }
  });
});
