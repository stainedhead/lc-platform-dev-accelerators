/**
 * Integration Test: AwsNotificationService with Real AWS SNS
 *
 * Tests AWS SNS implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates test topics during tests
 * - Creates SQS queues for subscription verification
 * - Cleans up all created resources in afterAll
 *
 * Note: Email/SMS tests are skipped as they require verification
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsNotificationService } from '../../../../src/providers/aws/AwsNotificationService';
import { ProviderType } from '../../../../src/core/types/common';
import { Protocol } from '../../../../src/core/types/notification';
import {
  SQSClient,
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

describe('AwsNotificationService Integration (AWS)', () => {
  let service: AwsNotificationService;
  let sqsClient: SQSClient;

  const createdTopicArns: string[] = [];
  const createdQueueUrls: string[] = [];
  const createdSubscriptionArns: string[] = [];

  beforeAll(async () => {
    // Configure service to use real AWS
    service = new AwsNotificationService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
    });

    sqsClient = new SQSClient({ region: AWS_REGION });
  });

  afterAll(async () => {
    // Cleanup subscriptions first
    console.log(`Cleaning up ${createdSubscriptionArns.length} subscriptions...`);
    for (const subArn of createdSubscriptionArns) {
      try {
        if (subArn !== 'pending confirmation' && subArn !== 'PendingConfirmation') {
          await service.unsubscribe(subArn);
          console.log(`Unsubscribed: ${subArn}`);
        }
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to unsubscribe ${subArn}: ${(error as Error).message}`
        );
      }
    }

    // Cleanup topics
    console.log(`Cleaning up ${createdTopicArns.length} topics...`);
    for (const topicArn of createdTopicArns) {
      try {
        await service.deleteTopic(topicArn);
        console.log(`Deleted topic: ${topicArn}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete topic ${topicArn}: ${(error as Error).message}`
        );
      }
    }

    // Cleanup SQS queues
    console.log(`Cleaning up ${createdQueueUrls.length} SQS queues...`);
    for (const queueUrl of createdQueueUrls) {
      try {
        await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
        console.log(`Deleted SQS queue: ${queueUrl}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete queue ${queueUrl}: ${(error as Error).message}`
        );
      }
    }
  });

  // Helper to create SQS queue for SNS subscription testing
  async function createTestQueue(name: string): Promise<{ url: string; arn: string }> {
    const result = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: name,
      })
    );

    const queueUrl = result.QueueUrl!;
    createdQueueUrls.push(queueUrl);

    // Get queue ARN
    const attrs = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn'],
      })
    );

    const queueArn = attrs.Attributes?.QueueArn || '';

    return { url: queueUrl, arn: queueArn };
  }

  // Helper to set SQS policy allowing SNS to publish
  async function allowSnsToPublishToQueue(
    queueUrl: string,
    queueArn: string,
    topicArn: string
  ): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'sns.amazonaws.com' },
          Action: 'sqs:SendMessage',
          Resource: queueArn,
          Condition: {
            ArnEquals: {
              'aws:SourceArn': topicArn,
            },
          },
        },
      ],
    };

    await sqsClient.send(
      new SetQueueAttributesCommand({
        QueueUrl: queueUrl,
        Attributes: {
          Policy: JSON.stringify(policy),
        },
      })
    );
  }

  test('createTopic - should create SNS topic', async () => {
    const topicName = `${TEST_PREFIX}-basic`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    expect(topic.name).toBe(topicName);
    expect(topic.arn).toBeDefined();
    expect(topic.arn).toContain('sns');
    expect(topic.arn).toContain(AWS_REGION);
    expect(topic.arn).toContain(topicName);
    expect(topic.subscriptions).toEqual([]);
    expect(topic.created).toBeInstanceOf(Date);
  });

  test('getTopic - should retrieve topic details', async () => {
    const topicName = `${TEST_PREFIX}-get`;

    const created = await service.createTopic(topicName);
    createdTopicArns.push(created.arn!);

    const topic = await service.getTopic(created.arn!);

    expect(topic.name).toBeDefined();
    expect(topic.arn).toBe(created.arn);
    expect(topic.subscriptions).toBeInstanceOf(Array);
  });

  test('subscribe - should subscribe SQS queue to topic', async () => {
    const topicName = `${TEST_PREFIX}-subscribe`;
    const queueName = `${TEST_PREFIX}-sub-queue`;

    // Create topic
    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    // Create SQS queue
    const queue = await createTestQueue(queueName);

    // Allow SNS to publish to queue
    await allowSnsToPublishToQueue(queue.url, queue.arn, topic.arn!);

    // Subscribe queue to topic
    const subscription = await service.subscribe(topic.arn!, Protocol.SQS, queue.arn);

    if (subscription.id !== 'pending confirmation' && subscription.id !== 'PendingConfirmation') {
      createdSubscriptionArns.push(subscription.id);
    }

    expect(subscription.protocol).toBe(Protocol.SQS);
    expect(subscription.endpoint).toBe(queue.arn);
    expect(subscription.created).toBeInstanceOf(Date);
    // SQS subscriptions are auto-confirmed
    expect(subscription.confirmed).toBe(true);
  });

  test('publishToTopic - should publish message to topic', async () => {
    const topicName = `${TEST_PREFIX}-publish`;
    const queueName = `${TEST_PREFIX}-publish-queue`;

    // Create topic
    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    // Create and subscribe SQS queue
    const queue = await createTestQueue(queueName);
    await allowSnsToPublishToQueue(queue.url, queue.arn, topic.arn!);

    const subscription = await service.subscribe(topic.arn!, Protocol.SQS, queue.arn);
    if (subscription.id !== 'pending confirmation') {
      createdSubscriptionArns.push(subscription.id);
    }

    // Small delay for subscription to be active
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Publish message
    const messageId = await service.publishToTopic(topic.arn!, {
      body: 'Test notification message',
      subject: 'Test Subject',
    });

    expect(messageId).toBeDefined();
    expect(typeof messageId).toBe('string');

    // Verify message was delivered to SQS
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const messages = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queue.url,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 5,
      })
    );

    expect(messages.Messages).toBeDefined();
    expect(messages.Messages!.length).toBeGreaterThan(0);

    const receivedMessage = JSON.parse(messages.Messages![0]!.Body!);
    expect(receivedMessage.Message).toBe('Test notification message');
    expect(receivedMessage.Subject).toBe('Test Subject');
  });

  test('publishToTopic - should publish message with attributes', async () => {
    const topicName = `${TEST_PREFIX}-pub-attrs`;
    const queueName = `${TEST_PREFIX}-pub-attrs-queue`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    const queue = await createTestQueue(queueName);
    await allowSnsToPublishToQueue(queue.url, queue.arn, topic.arn!);

    const subscription = await service.subscribe(topic.arn!, Protocol.SQS, queue.arn);
    if (subscription.id !== 'pending confirmation') {
      createdSubscriptionArns.push(subscription.id);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const messageId = await service.publishToTopic(topic.arn!, {
      body: 'Message with attributes',
      attributes: {
        eventType: 'test.event',
        priority: 'high',
      },
    });

    expect(messageId).toBeDefined();
  });

  test('listTopics - should list created topics', async () => {
    const topicName = `${TEST_PREFIX}-list`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    const topics = await service.listTopics();

    expect(topics).toBeInstanceOf(Array);
    expect(topics.some((t) => t.arn === topic.arn)).toBe(true);
  });

  test('listSubscriptions - should list topic subscriptions', async () => {
    const topicName = `${TEST_PREFIX}-list-subs`;
    const queueName = `${TEST_PREFIX}-list-subs-queue`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    const queue = await createTestQueue(queueName);
    await allowSnsToPublishToQueue(queue.url, queue.arn, topic.arn!);

    const subscription = await service.subscribe(topic.arn!, Protocol.SQS, queue.arn);
    if (subscription.id !== 'pending confirmation') {
      createdSubscriptionArns.push(subscription.id);
    }

    const subscriptions = await service.listSubscriptions(topic.arn!);

    expect(subscriptions).toBeInstanceOf(Array);
    expect(subscriptions.length).toBeGreaterThanOrEqual(1);
    expect(subscriptions.some((s) => s.endpoint === queue.arn)).toBe(true);
  });

  test('unsubscribe - should remove subscription', async () => {
    const topicName = `${TEST_PREFIX}-unsub`;
    const queueName = `${TEST_PREFIX}-unsub-queue`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    const queue = await createTestQueue(queueName);
    await allowSnsToPublishToQueue(queue.url, queue.arn, topic.arn!);

    const subscription = await service.subscribe(topic.arn!, Protocol.SQS, queue.arn);
    // Don't add to cleanup - we're unsubscribing manually

    if (subscription.id !== 'pending confirmation' && subscription.id !== 'PendingConfirmation') {
      await service.unsubscribe(subscription.id);

      // Verify unsubscribed
      const subscriptions = await service.listSubscriptions(topic.arn!);
      expect(subscriptions.some((s) => s.id === subscription.id)).toBe(false);
    }
  });

  test('deleteTopic - should delete topic', async () => {
    const topicName = `${TEST_PREFIX}-delete`;

    const topic = await service.createTopic(topicName);
    // Don't add to cleanup - we're deleting manually

    await service.deleteTopic(topic.arn!);

    // Verify topic is deleted
    await expect(service.getTopic(topic.arn!)).rejects.toThrow();
  });

  test('Multiple subscriptions - should support multiple subscribers to one topic', async () => {
    const topicName = `${TEST_PREFIX}-multi-sub`;
    const queueName1 = `${TEST_PREFIX}-multi-sub-q1`;
    const queueName2 = `${TEST_PREFIX}-multi-sub-q2`;

    const topic = await service.createTopic(topicName);
    createdTopicArns.push(topic.arn!);

    const queue1 = await createTestQueue(queueName1);
    const queue2 = await createTestQueue(queueName2);

    await allowSnsToPublishToQueue(queue1.url, queue1.arn, topic.arn!);
    await allowSnsToPublishToQueue(queue2.url, queue2.arn, topic.arn!);

    const sub1 = await service.subscribe(topic.arn!, Protocol.SQS, queue1.arn);
    const sub2 = await service.subscribe(topic.arn!, Protocol.SQS, queue2.arn);

    if (sub1.id !== 'pending confirmation') {
      createdSubscriptionArns.push(sub1.id);
    }
    if (sub2.id !== 'pending confirmation') {
      createdSubscriptionArns.push(sub2.id);
    }

    const subscriptions = await service.listSubscriptions(topic.arn!);
    expect(subscriptions.length).toBeGreaterThanOrEqual(2);
  });

  test('sendSMS - should send SMS (simulated)', async () => {
    // Note: Actual SMS sending requires account to be out of sandbox
    // This test verifies the API call doesn't throw
    try {
      const messageId = await service.sendSMS({
        to: '+15555555555', // Fake number
        message: 'Test SMS message',
      });

      // If it succeeds, verify response
      expect(messageId).toBeDefined();
    } catch (error) {
      // Expected to fail in sandbox mode
      expect((error as Error).message).toContain('Failed to send SMS');
    }
  });

  test('Concurrent operations - should handle parallel topic operations', async () => {
    const topicNames = Array.from({ length: 3 }, (_, i) => `${TEST_PREFIX}-concurrent-${i}`);

    // Create topics concurrently
    const createPromises = topicNames.map((name) => service.createTopic(name));
    const topics = await Promise.all(createPromises);

    topics.forEach((topic) => createdTopicArns.push(topic.arn!));

    expect(topics).toHaveLength(3);
    topics.forEach((topic, i) => {
      expect(topic.name).toBe(topicNames[i]!);
      expect(topic.arn).toBeDefined();
    });
  });

  test('Error handling - should throw on invalid topic ARN', async () => {
    const invalidArn = `arn:aws:sns:${AWS_REGION}:000000000000:nonexistent-topic`;

    await expect(service.getTopic(invalidArn)).rejects.toThrow();
  });
});
