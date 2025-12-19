/**
 * Integration Test: AwsEventBusService with Real AWS EventBridge
 *
 * Tests AWS EventBridge implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates custom event buses during tests
 * - Creates rules and targets
 * - Creates SQS queues for event delivery verification
 * - Cleans up all created resources in afterAll (targets -> rules -> buses -> queues)
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsEventBusService } from '../../../../src/providers/aws/AwsEventBusService';
import { ProviderType } from '../../../../src/core/types/common';
import { TargetType } from '../../../../src/core/types/event';
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

describe('AwsEventBusService Integration (AWS)', () => {
  let service: AwsEventBusService;
  let sqsClient: SQSClient;

  // Track resources for cleanup (in reverse dependency order)
  const createdTargets: Array<{ busName: string; ruleName: string; targetId: string }> = [];
  const createdRules: Array<{ busName: string; ruleName: string }> = [];
  const createdEventBuses: string[] = [];
  const createdQueueUrls: string[] = [];

  beforeAll(async () => {
    // Configure service to use real AWS
    service = new AwsEventBusService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
    });

    sqsClient = new SQSClient({ region: AWS_REGION });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order: targets -> rules -> buses -> queues

    // 1. Remove targets
    console.log(`Cleaning up ${createdTargets.length} targets...`);
    for (const { busName, ruleName, targetId } of createdTargets) {
      try {
        await service.removeTarget(busName, ruleName, targetId);
        console.log(`Removed target: ${targetId} from rule ${ruleName}`);
      } catch (error) {
        console.warn(`Cleanup warning: Failed to remove target: ${(error as Error).message}`);
      }
    }

    // 2. Delete rules
    console.log(`Cleaning up ${createdRules.length} rules...`);
    for (const { busName, ruleName } of createdRules) {
      try {
        await service.deleteRule(busName, ruleName);
        console.log(`Deleted rule: ${ruleName}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete rule ${ruleName}: ${(error as Error).message}`
        );
      }
    }

    // 3. Delete event buses
    console.log(`Cleaning up ${createdEventBuses.length} event buses...`);
    for (const busName of createdEventBuses) {
      try {
        await service.deleteEventBus(busName);
        console.log(`Deleted event bus: ${busName}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete bus ${busName}: ${(error as Error).message}`
        );
      }
    }

    // 4. Delete SQS queues
    console.log(`Cleaning up ${createdQueueUrls.length} SQS queues...`);
    for (const queueUrl of createdQueueUrls) {
      try {
        await sqsClient.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
        console.log(`Deleted SQS queue: ${queueUrl}`);
      } catch (error) {
        console.warn(`Cleanup warning: Failed to delete queue: ${(error as Error).message}`);
      }
    }
  });

  // Helper to create SQS queue for EventBridge target testing
  async function createTestQueue(name: string): Promise<{ url: string; arn: string }> {
    const result = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: name,
      })
    );

    const queueUrl = result.QueueUrl!;
    createdQueueUrls.push(queueUrl);

    const attrs = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn'],
      })
    );

    return { url: queueUrl, arn: attrs.Attributes?.QueueArn ?? '' };
  }

  // Helper to set SQS policy allowing EventBridge to publish
  async function allowEventBridgeToPublishToQueue(
    queueUrl: string,
    queueArn: string
  ): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'events.amazonaws.com' },
          Action: 'sqs:SendMessage',
          Resource: queueArn,
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

  test('createEventBus - should create custom event bus', async () => {
    const busName = `${TEST_PREFIX}-basic`;

    const bus = await service.createEventBus(busName);
    createdEventBuses.push(busName);

    expect(bus.name).toBe(busName);
    expect(bus.arn).toBeDefined();
    expect(bus.arn).toContain('event-bus');
    expect(bus.arn).toContain(busName);
    expect(bus.created).toBeInstanceOf(Date);
  });

  test('getEventBus - should retrieve event bus details', async () => {
    const busName = `${TEST_PREFIX}-get`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    const bus = await service.getEventBus(busName);

    expect(bus.name).toBe(busName);
    expect(bus.arn).toBeDefined();
  });

  test('createRule - should create event matching rule', async () => {
    const busName = `${TEST_PREFIX}-rule-bus`;
    const ruleName = `${TEST_PREFIX}-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    const rule = await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['test.source'],
        type: ['test.event'],
      },
      description: 'Test rule for integration testing',
      enabled: true,
    });
    createdRules.push({ busName, ruleName });

    expect(rule.name).toBe(ruleName);
    expect(rule.eventPattern).toBeDefined();
    expect(rule.eventPattern.source).toContain('test.source');
    expect(rule.eventPattern.type).toContain('test.event');
    expect(rule.enabled).toBe(true);
    expect(rule.targets).toEqual([]);
  });

  test('createRule - should create disabled rule', async () => {
    const busName = `${TEST_PREFIX}-disabled-rule-bus`;
    const ruleName = `${TEST_PREFIX}-disabled-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    const rule = await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['disabled.source'],
      },
      enabled: false,
    });
    createdRules.push({ busName, ruleName });

    expect(rule.enabled).toBe(false);
  });

  test('getRule - should retrieve rule with details', async () => {
    const busName = `${TEST_PREFIX}-get-rule-bus`;
    const ruleName = `${TEST_PREFIX}-get-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['get.source'],
        type: ['get.event'],
      },
      description: 'Rule for getRule test',
    });
    createdRules.push({ busName, ruleName });

    const rule = await service.getRule(busName, ruleName);

    expect(rule.name).toBe(ruleName);
    expect(rule.description).toBe('Rule for getRule test');
    expect(rule.eventPattern.source).toContain('get.source');
  });

  test('updateRule - should update rule configuration', async () => {
    const busName = `${TEST_PREFIX}-update-rule-bus`;
    const ruleName = `${TEST_PREFIX}-update-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['original.source'],
      },
      enabled: true,
    });
    createdRules.push({ busName, ruleName });

    // Update the rule
    const updated = await service.updateRule(busName, ruleName, {
      name: ruleName,
      eventPattern: {
        source: ['updated.source'],
        type: ['new.type'],
      },
      enabled: false,
    });

    expect(updated.eventPattern.source).toContain('updated.source');
    expect(updated.eventPattern.type).toContain('new.type');
    expect(updated.enabled).toBe(false);
  });

  test('addTarget - should add SQS target to rule', async () => {
    const busName = `${TEST_PREFIX}-target-bus`;
    const ruleName = `${TEST_PREFIX}-target-rule`;
    const queueName = `${TEST_PREFIX}-target-queue`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['target.source'],
      },
    });
    createdRules.push({ busName, ruleName });

    const queue = await createTestQueue(queueName);
    await allowEventBridgeToPublishToQueue(queue.url, queue.arn);

    const targetId = 'sqs-target-1';
    await service.addTarget(busName, ruleName, {
      id: targetId,
      type: TargetType.QUEUE,
      endpoint: queue.arn,
    });
    createdTargets.push({ busName, ruleName, targetId });

    // Verify target was added
    const rule = await service.getRule(busName, ruleName);
    expect(rule.targets.length).toBeGreaterThanOrEqual(1);
    expect(rule.targets.some((t) => t.id === targetId)).toBe(true);
  });

  test('publishEvent - should publish event to bus', async () => {
    const busName = `${TEST_PREFIX}-publish-bus`;
    const ruleName = `${TEST_PREFIX}-publish-rule`;
    const queueName = `${TEST_PREFIX}-publish-queue`;

    // Setup bus, rule, queue, and target
    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['publish.test'],
      },
    });
    createdRules.push({ busName, ruleName });

    const queue = await createTestQueue(queueName);
    await allowEventBridgeToPublishToQueue(queue.url, queue.arn);

    const targetId = 'publish-target';
    await service.addTarget(busName, ruleName, {
      id: targetId,
      type: TargetType.QUEUE,
      endpoint: queue.arn,
    });
    createdTargets.push({ busName, ruleName, targetId });

    // Small delay for rule to be active
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Publish event
    const eventId = await service.publishEvent(busName, {
      source: 'publish.test',
      type: 'integration.test',
      data: {
        message: 'Hello EventBridge!',
        timestamp: new Date().toISOString(),
      },
      time: new Date(),
    });

    expect(eventId).toBeDefined();
    expect(typeof eventId).toBe('string');

    // Verify event was delivered to SQS
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const messages = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queue.url,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
      })
    );

    expect(messages.Messages).toBeDefined();
    expect(messages.Messages!.length).toBeGreaterThan(0);

    const receivedEvent = JSON.parse(messages.Messages![0]!.Body!) as Record<string, unknown>;
    expect(receivedEvent.source).toBe('publish.test');
    expect(receivedEvent['detail-type']).toBe('integration.test');
  });

  test('removeTarget - should remove target from rule', async () => {
    const busName = `${TEST_PREFIX}-remove-target-bus`;
    const ruleName = `${TEST_PREFIX}-remove-target-rule`;
    const queueName = `${TEST_PREFIX}-remove-target-queue`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['remove.target'],
      },
    });
    createdRules.push({ busName, ruleName });

    const queue = await createTestQueue(queueName);
    await allowEventBridgeToPublishToQueue(queue.url, queue.arn);

    const targetId = 'remove-me';
    await service.addTarget(busName, ruleName, {
      id: targetId,
      type: TargetType.QUEUE,
      endpoint: queue.arn,
    });
    // Don't add to cleanup - we're removing it manually

    await service.removeTarget(busName, ruleName, targetId);

    // Verify target was removed
    const rule = await service.getRule(busName, ruleName);
    expect(rule.targets.some((t) => t.id === targetId)).toBe(false);
  });

  test('listRules - should list rules on event bus', async () => {
    const busName = `${TEST_PREFIX}-list-rules-bus`;
    const ruleName1 = `${TEST_PREFIX}-list-rule-1`;
    const ruleName2 = `${TEST_PREFIX}-list-rule-2`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName1,
      eventPattern: { source: ['list.source1'] },
    });
    createdRules.push({ busName, ruleName: ruleName1 });

    await service.createRule(busName, {
      name: ruleName2,
      eventPattern: { source: ['list.source2'] },
    });
    createdRules.push({ busName, ruleName: ruleName2 });

    const rules = await service.listRules(busName);

    expect(rules).toBeInstanceOf(Array);
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules.some((r) => r.name === ruleName1)).toBe(true);
    expect(rules.some((r) => r.name === ruleName2)).toBe(true);
  });

  test('deleteRule - should delete rule', async () => {
    const busName = `${TEST_PREFIX}-delete-rule-bus`;
    const ruleName = `${TEST_PREFIX}-delete-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await service.createRule(busName, {
      name: ruleName,
      eventPattern: { source: ['delete.source'] },
    });
    // Don't add to cleanup - we're deleting manually

    await service.deleteRule(busName, ruleName);

    // Verify rule is deleted
    await expect(service.getRule(busName, ruleName)).rejects.toThrow();
  });

  test('deleteEventBus - should delete event bus', async () => {
    const busName = `${TEST_PREFIX}-delete-bus`;

    await service.createEventBus(busName);
    // Don't add to cleanup - we're deleting manually

    await service.deleteEventBus(busName);

    // Verify bus is deleted
    await expect(service.getEventBus(busName)).rejects.toThrow();
  });

  test('Complex event pattern - should match complex patterns', async () => {
    const busName = `${TEST_PREFIX}-complex-pattern-bus`;
    const ruleName = `${TEST_PREFIX}-complex-pattern-rule`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    const rule = await service.createRule(busName, {
      name: ruleName,
      eventPattern: {
        source: ['app.orders', 'app.inventory'],
        type: ['order.created', 'order.updated'],
        data: {
          status: ['pending', 'confirmed'],
        },
      },
    });
    createdRules.push({ busName, ruleName });

    expect(rule.eventPattern.source).toContain('app.orders');
    expect(rule.eventPattern.source).toContain('app.inventory');
  });

  test('Error handling - should throw on non-existent bus', async () => {
    await expect(service.getEventBus('nonexistent-bus-12345')).rejects.toThrow();
  });

  test('Error handling - should throw on non-existent rule', async () => {
    const busName = `${TEST_PREFIX}-error-bus`;

    await service.createEventBus(busName);
    createdEventBuses.push(busName);

    await expect(service.getRule(busName, 'nonexistent-rule-12345')).rejects.toThrow();
  });

  test('Concurrent operations - should handle parallel bus creation', async () => {
    const busNames = Array.from({ length: 3 }, (_, i) => `${TEST_PREFIX}-concurrent-${i}`);

    const createPromises = busNames.map((name) => service.createEventBus(name));
    const buses = await Promise.all(createPromises);

    busNames.forEach((name) => createdEventBuses.push(name));

    expect(buses).toHaveLength(3);
    buses.forEach((bus, i) => {
      expect(bus.name).toBe(busNames[i]!);
    });
  });
});
