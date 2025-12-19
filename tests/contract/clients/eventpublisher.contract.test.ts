/**
 * Contract Test: EventPublisher
 *
 * Verifies that both AWS and Mock providers implement the EventPublisher interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { EventPublisher } from '../../../src/core/clients/EventPublisher';
import { MockEventPublisher } from '../../../src/providers/mock/clients/MockEventPublisher';
import { ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the EventPublisher contract.
 */
function testEventPublisherContract(
  name: string,
  createClient: () => EventPublisher,
  cleanup?: () => void
) {
  describe(`EventPublisher Contract: ${name}`, () => {
    let publisher: EventPublisher;
    const testEventBus = 'test-event-bus';

    beforeEach(() => {
      publisher = createClient();
      if (cleanup) {
        cleanup();
      }
    });

    describe('publish', () => {
      test('should publish event and return event ID', async () => {
        const eventId = await publisher.publish(testEventBus, {
          source: 'test.service',
          type: 'user.created',
          data: { userId: '123', name: 'Test User' },
        });

        expect(eventId).toBeDefined();
        expect(typeof eventId).toBe('string');
        expect(eventId.length).toBeGreaterThan(0);
      });

      test('should publish event with metadata', async () => {
        const eventId = await publisher.publish(testEventBus, {
          source: 'test.service',
          type: 'order.placed',
          data: { orderId: 'order-123' },
          metadata: { correlationId: 'corr-123', traceId: 'trace-456' },
        });

        expect(eventId).toBeDefined();
      });

      test('should publish event with custom time', async () => {
        const customTime = new Date('2024-01-15T10:00:00Z');
        const eventId = await publisher.publish(testEventBus, {
          source: 'test.service',
          type: 'scheduled.event',
          data: { scheduled: true },
          time: customTime,
        });

        expect(eventId).toBeDefined();
      });

      test('should throw ValidationError for empty event bus name', async () => {
        await expect(
          publisher.publish('', {
            source: 'test',
            type: 'test',
            data: {},
          })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for missing source', async () => {
        await expect(
          publisher.publish(testEventBus, {
            source: '',
            type: 'test',
            data: {},
          })
        ).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for missing type', async () => {
        await expect(
          publisher.publish(testEventBus, {
            source: 'test',
            type: '',
            data: {},
          })
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('publishBatch', () => {
      test('should publish multiple events at once', async () => {
        const events = [
          { source: 'test.service', type: 'event1', data: { id: 1 } },
          { source: 'test.service', type: 'event2', data: { id: 2 } },
          { source: 'test.service', type: 'event3', data: { id: 3 } },
        ];

        const result = await publisher.publishBatch(testEventBus, events);

        expect(result.successful).toHaveLength(3);
        expect(result.failed).toHaveLength(0);
        result.successful.forEach((entry) => {
          expect(entry.id).toBeDefined();
        });
      });

      test('should handle empty events array', async () => {
        const result = await publisher.publishBatch(testEventBus, []);

        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      });

      test('should report failed events for invalid entries', async () => {
        const events = [
          { source: 'test.service', type: 'valid', data: { id: 1 } },
          { source: '', type: 'invalid-source', data: { id: 2 } }, // Invalid - no source
          { source: 'test.service', type: '', data: { id: 3 } }, // Invalid - no type
        ];

        const result = await publisher.publishBatch(testEventBus, events);

        expect(result.successful.length + result.failed.length).toBe(3);
        expect(result.failed.length).toBeGreaterThan(0);
      });

      test('should throw ValidationError for empty event bus name', async () => {
        await expect(
          publisher.publishBatch('', [{ source: 'test', type: 'test', data: {} }])
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('event data handling', () => {
      test('should handle complex nested data', async () => {
        const eventId = await publisher.publish(testEventBus, {
          source: 'test.service',
          type: 'complex.event',
          data: {
            nested: {
              deeply: {
                value: 'test',
                array: [1, 2, 3],
              },
            },
            items: [{ id: 1 }, { id: 2 }],
          },
        });

        expect(eventId).toBeDefined();
      });

      test('should handle empty data object', async () => {
        const eventId = await publisher.publish(testEventBus, {
          source: 'test.service',
          type: 'empty.data',
          data: {},
        });

        expect(eventId).toBeDefined();
      });
    });
  });
}

// Run contract tests against Mock provider
testEventPublisherContract(
  'MockEventPublisher',
  () => new MockEventPublisher(),
  () => {
    // Cleanup is handled by creating new instance
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsEventPublisher } from '../../../src/providers/aws/clients/AwsEventPublisher';
// testEventPublisherContract('AwsEventPublisher', () => new AwsEventPublisher({ provider: ProviderType.AWS }));
