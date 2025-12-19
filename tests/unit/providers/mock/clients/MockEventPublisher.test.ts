/**
 * Unit Tests for MockEventPublisher
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockEventPublisher } from '../../../../../src/providers/mock/clients/MockEventPublisher';
import { ValidationError } from '../../../../../src/core/types/common';

describe('MockEventPublisher', () => {
  let publisher: MockEventPublisher;

  beforeEach(() => {
    publisher = new MockEventPublisher();
    publisher.reset();
  });

  describe('publish', () => {
    test('should publish event and return event ID', async () => {
      const eventId = await publisher.publish('orders', {
        source: 'order-service',
        type: 'OrderCreated',
        data: { orderId: '123' },
      });

      expect(eventId).toMatch(/^mock-event-/);
    });

    test('should store event with all properties', async () => {
      await publisher.publish('orders', {
        source: 'order-service',
        type: 'OrderCreated',
        data: { orderId: '123' },
        metadata: { correlationId: 'abc' },
      });

      const events = publisher.getPublishedEvents('orders');
      expect(events.length).toBe(1);
      expect(events[0]?.source).toBe('order-service');
      expect(events[0]?.type).toBe('OrderCreated');
      expect(events[0]?.data).toEqual({ orderId: '123' });
      expect(events[0]?.metadata).toEqual({ correlationId: 'abc' });
    });

    test('should use provided event ID', async () => {
      const eventId = await publisher.publish('orders', {
        id: 'custom-id-123',
        source: 'order-service',
        type: 'OrderCreated',
        data: {},
      });

      expect(eventId).toBe('custom-id-123');
    });

    test('should add timestamp if not provided', async () => {
      await publisher.publish('orders', {
        source: 'order-service',
        type: 'OrderCreated',
        data: {},
      });

      const events = publisher.getPublishedEvents('orders');
      expect(events[0]?.time).toBeInstanceOf(Date);
    });

    test('should throw ValidationError for empty event bus name', async () => {
      expect(
        publisher.publish('', { source: 'test', type: 'Test', data: {} })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    test('should throw ValidationError for missing source', async () => {
      expect(
        publisher.publish('bus', { source: '', type: 'Test', data: {} })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    test('should throw ValidationError for missing type', async () => {
      expect(
        publisher.publish('bus', { source: 'test', type: '', data: {} })
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('publishBatch', () => {
    test('should publish multiple events', async () => {
      const result = await publisher.publishBatch('orders', [
        { source: 'order-service', type: 'OrderCreated', data: { id: 1 } },
        { source: 'order-service', type: 'OrderCreated', data: { id: 2 } },
        { source: 'order-service', type: 'OrderCreated', data: { id: 3 } },
      ]);

      expect(result.successful.length).toBe(3);
      expect(result.failed.length).toBe(0);

      const events = publisher.getPublishedEvents('orders');
      expect(events.length).toBe(3);
    });

    test('should return failed entries for invalid events', async () => {
      const result = await publisher.publishBatch('orders', [
        { source: 'order-service', type: 'OrderCreated', data: {} },
        { source: '', type: 'Invalid', data: {} }, // Invalid - no source
      ]);

      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0]?.code).toBe('PublishError');
    });
  });

  describe('getPublishedEvents', () => {
    test('should return all published events for bus', async () => {
      await publisher.publish('bus1', { source: 'a', type: 'A', data: {} });
      await publisher.publish('bus1', { source: 'b', type: 'B', data: {} });
      await publisher.publish('bus2', { source: 'c', type: 'C', data: {} });

      const bus1Events = publisher.getPublishedEvents('bus1');
      expect(bus1Events.length).toBe(2);

      const bus2Events = publisher.getPublishedEvents('bus2');
      expect(bus2Events.length).toBe(1);
    });

    test('should return empty array for unknown bus', async () => {
      const events = publisher.getPublishedEvents('unknown');
      expect(events).toEqual([]);
    });
  });

  describe('integration', () => {
    test('should support typical event publishing patterns', async () => {
      // Publish domain events
      await publisher.publish('domain-events', {
        source: 'user-service',
        type: 'UserRegistered',
        data: { userId: 'u123', email: 'user@example.com' },
        metadata: { correlationId: 'req-456' },
      });

      await publisher.publish('domain-events', {
        source: 'order-service',
        type: 'OrderPlaced',
        data: { orderId: 'o789', userId: 'u123' },
      });

      // Verify events
      const events = publisher.getPublishedEvents('domain-events');
      expect(events.length).toBe(2);
      expect(events[0]?.type).toBe('UserRegistered');
      expect(events[1]?.type).toBe('OrderPlaced');
    });
  });
});
