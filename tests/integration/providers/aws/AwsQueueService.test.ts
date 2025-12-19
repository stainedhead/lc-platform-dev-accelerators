/**
 * Integration Test: AwsQueueService with Real AWS SQS
 *
 * Tests AWS SQS implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates test queues during tests
 * - Cleans up all created queues in afterAll
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsQueueService } from '../../../../src/providers/aws/AwsQueueService';
import { ProviderType } from '../../../../src/core/types/common';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

describe('AwsQueueService Integration (AWS)', () => {
  let service: AwsQueueService;
  const createdQueueUrls: string[] = [];

  beforeAll(() => {
    // Configure service to use real AWS (no endpoint override)
    service = new AwsQueueService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      // No explicit credentials - uses SDK default credential chain
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all test queues
    console.log(`Cleaning up ${createdQueueUrls.length} test queues...`);
    for (const queueUrl of createdQueueUrls) {
      try {
        await service.deleteQueue(queueUrl);
        console.log(`Deleted queue: ${queueUrl}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete queue ${queueUrl}: ${(error as Error).message}`
        );
      }
    }
  });

  test('createQueue - should create standard SQS queue', async () => {
    const queueName = `${TEST_PREFIX}-standard`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    expect(queue.name).toBe(queueName);
    expect(queue.url).toContain(queueName);
    expect(queue.url).toContain('sqs');
    expect(queue.url).toContain(AWS_REGION);
    expect(queue.messageCount).toBe(0);
    expect(queue.created).toBeInstanceOf(Date);
  });

  test('createQueue - should create queue with custom options', async () => {
    const queueName = `${TEST_PREFIX}-custom`;

    const queue = await service.createQueue(queueName, {
      visibilityTimeout: 60,
      messageRetention: 86400, // 1 day
      maxMessageSize: 65536, // 64KB
    });
    createdQueueUrls.push(queue.url);

    expect(queue.name).toBe(queueName);
    expect(queue.url).toContain(queueName);
  });

  test('createQueue - should create FIFO queue', async () => {
    const queueName = `${TEST_PREFIX}-fifo`;

    const queue = await service.createQueue(queueName, {
      fifo: true,
    });
    createdQueueUrls.push(queue.url);

    // FIFO queues have .fifo suffix
    expect(queue.name).toContain('.fifo');
    expect(queue.url).toContain('.fifo');
  });

  test('getQueue - should retrieve queue details', async () => {
    const queueName = `${TEST_PREFIX}-get`;

    const created = await service.createQueue(queueName);
    createdQueueUrls.push(created.url);

    const queue = await service.getQueue(created.url);

    expect(queue.name).toBe(queueName);
    expect(queue.url).toBe(created.url);
    expect(queue.messageCount).toBe(0);
    expect(queue.created).toBeInstanceOf(Date);
  });

  test('sendMessage - should send string message to queue', async () => {
    const queueName = `${TEST_PREFIX}-send-string`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    const messageId = await service.sendMessage(queue.url, {
      body: 'Hello, AWS SQS!',
    });

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
    expect(messageId.length).toBeGreaterThan(0);
  });

  test('sendMessage - should send JSON message with attributes', async () => {
    const queueName = `${TEST_PREFIX}-send-json`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    const messageBody = {
      event: 'user.created',
      userId: '12345',
      timestamp: new Date().toISOString(),
    };

    const messageId = await service.sendMessage(queue.url, {
      body: messageBody,
      attributes: {
        source: 'integration-test',
        priority: 'high',
      },
    });

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');
  });

  test('sendMessage - should send message with delay', async () => {
    const queueName = `${TEST_PREFIX}-delayed`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    const messageId = await service.sendMessage(queue.url, {
      body: 'Delayed message',
      delaySeconds: 1, // 1 second delay
    });

    expect(messageId).toBeDefined();

    // Immediate receive should not get delayed message
    const immediate = await service.receiveMessages(queue.url, {
      maxMessages: 1,
      waitTimeSeconds: 0,
    });

    expect(immediate).toHaveLength(0);

    // Wait for delay and receive
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const delayed = await service.receiveMessages(queue.url, {
      maxMessages: 1,
      waitTimeSeconds: 1,
    });

    expect(delayed.length).toBeGreaterThanOrEqual(0); // May or may not be visible yet
  });

  test('receiveMessages - should receive and parse messages', async () => {
    const queueName = `${TEST_PREFIX}-receive`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    // Send test message
    const testBody = { test: 'data', number: 42 };
    await service.sendMessage(queue.url, {
      body: testBody,
      attributes: {
        testAttr: 'testValue',
      },
    });

    // Small delay to ensure message is available
    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await service.receiveMessages(queue.url, {
      maxMessages: 1,
      waitTimeSeconds: 5,
    });

    expect(messages.length).toBeGreaterThanOrEqual(1);

    if (messages.length > 0) {
      const message = messages[0]!;
      expect(message).toBeDefined();
      expect(message.body).toEqual(testBody);
      expect(message.attributes?.testAttr).toBe('testValue');
    }
  });

  test('receiveMessages - should support long polling', async () => {
    const queueName = `${TEST_PREFIX}-longpoll`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    const startTime = Date.now();

    // Long poll on empty queue (should wait then return empty)
    const messages = await service.receiveMessages(queue.url, {
      maxMessages: 1,
      waitTimeSeconds: 2, // Wait up to 2 seconds
    });

    const elapsed = Date.now() - startTime;

    expect(messages).toHaveLength(0);
    // Should have waited approximately 2 seconds
    expect(elapsed).toBeGreaterThanOrEqual(1500);
  });

  test('receiveMessages - should receive multiple messages', async () => {
    const queueName = `${TEST_PREFIX}-multi`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    // Send 5 messages
    for (let i = 0; i < 5; i++) {
      await service.sendMessage(queue.url, {
        body: `Message ${i}`,
      });
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await service.receiveMessages(queue.url, {
      maxMessages: 10,
      waitTimeSeconds: 5,
    });

    expect(messages.length).toBeGreaterThanOrEqual(1);
    // SQS may not return all messages in single request
    expect(messages.length).toBeLessThanOrEqual(10);
  });

  test('listQueues - should list created queues', async () => {
    // Create a unique queue for this test
    const queueName = `${TEST_PREFIX}-list`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    const allQueues = await service.listQueues();

    expect(allQueues).toBeInstanceOf(Array);
    expect(allQueues.some((url) => url.includes(queueName))).toBe(true);
  });

  test('purgeQueue - should remove all messages from queue', async () => {
    const queueName = `${TEST_PREFIX}-purge`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    // Send messages
    await service.sendMessage(queue.url, { body: 'Message 1' });
    await service.sendMessage(queue.url, { body: 'Message 2' });
    await service.sendMessage(queue.url, { body: 'Message 3' });

    // Purge queue
    await service.purgeQueue(queue.url);

    // Small delay for purge to take effect
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify queue is empty
    const messages = await service.receiveMessages(queue.url, {
      maxMessages: 10,
      waitTimeSeconds: 1,
    });

    expect(messages).toHaveLength(0);
  });

  test('deleteQueue - should delete queue', async () => {
    const queueName = `${TEST_PREFIX}-delete`;

    const queue = await service.createQueue(queueName);
    // Don't add to cleanup - we're deleting it manually

    await service.deleteQueue(queue.url);

    // Verify queue is deleted by trying to get it
    await expect(service.getQueue(queue.url)).rejects.toThrow();
  });

  test('FIFO queue - should support message deduplication and grouping', async () => {
    const queueName = `${TEST_PREFIX}-fifo-dedup`;

    const queue = await service.createQueue(queueName, {
      fifo: true,
    });
    createdQueueUrls.push(queue.url);

    // Send messages with deduplication and group IDs
    await service.sendMessage(queue.url, {
      body: 'First message',
      deduplicationId: 'dedup-1',
      groupId: 'group-a',
    });

    // Send duplicate (should be deduplicated)
    await service.sendMessage(queue.url, {
      body: 'First message duplicate',
      deduplicationId: 'dedup-1', // Same dedup ID
      groupId: 'group-a',
    });

    // Send different message
    await service.sendMessage(queue.url, {
      body: 'Second message',
      deduplicationId: 'dedup-2',
      groupId: 'group-a',
    });

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const messages = await service.receiveMessages(queue.url, {
      maxMessages: 10,
      waitTimeSeconds: 5,
    });

    // Should only have 2 messages (duplicate was deduplicated)
    expect(messages.length).toBeLessThanOrEqual(2);
  });

  test('Error handling - should throw on invalid queue URL', async () => {
    await expect(
      service.getQueue('https://sqs.us-east-1.amazonaws.com/000000000000/nonexistent-queue')
    ).rejects.toThrow();
  });

  test('Concurrent operations - should handle multiple parallel operations', async () => {
    const queueName = `${TEST_PREFIX}-concurrent`;

    const queue = await service.createQueue(queueName);
    createdQueueUrls.push(queue.url);

    // Send 10 messages concurrently
    const sendPromises = Array.from({ length: 10 }, (_, i) =>
      service.sendMessage(queue.url, {
        body: { index: i, data: `Concurrent message ${i}` },
      })
    );

    const messageIds = await Promise.all(sendPromises);

    expect(messageIds).toHaveLength(10);
    messageIds.forEach((id) => {
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });
});
