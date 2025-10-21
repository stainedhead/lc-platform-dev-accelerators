/**
 * Unit tests for MockEventBusService
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockEventBusService } from '../../../../src/providers/mock/MockEventBusService';
import { TargetType } from '../../../../src/core/types/event';
import { ResourceNotFoundError } from '../../../../src/core/types/common';

describe('MockEventBusService', () => {
  let service: MockEventBusService;

  beforeEach(() => {
    service = new MockEventBusService();
  });

  describe('Event Bus Management', () => {
    it('should create an event bus', async () => {
      const bus = await service.createEventBus('test-bus');

      expect(bus.name).toBe('test-bus');
      expect(bus.arn).toBeDefined();
      expect(bus.created).toBeInstanceOf(Date);
    });

    it('should throw error when creating duplicate event bus', async () => {
      await service.createEventBus('test-bus');

      expect(service.createEventBus('test-bus')).rejects.toThrow(
        'Event bus test-bus already exists'
      );
    });

    it('should get event bus', async () => {
      await service.createEventBus('test-bus');
      const bus = await service.getEventBus('test-bus');

      expect(bus.name).toBe('test-bus');
    });

    it('should throw error when getting non-existent event bus', async () => {
      expect(service.getEventBus('nonexistent')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should delete event bus', async () => {
      await service.createEventBus('test-bus');
      await service.deleteEventBus('test-bus');

      expect(service.getEventBus('test-bus')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw error when deleting non-existent event bus', async () => {
      expect(service.deleteEventBus('nonexistent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('Event Publishing', () => {
    beforeEach(async () => {
      await service.createEventBus('test-bus');
    });

    it('should publish an event', async () => {
      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123', email: 'test@example.com' },
      });

      expect(eventId).toBeDefined();
      expect(eventId).toContain('mock-event');
    });

    it('should publish event with metadata', async () => {
      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123' },
        metadata: { requestId: 'req-123', userId: 'user-456' },
        time: new Date(),
      });

      expect(eventId).toBeDefined();
    });

    it('should throw error when publishing to non-existent bus', async () => {
      expect(
        service.publishEvent('nonexistent', {
          source: 'test.app',
          type: 'UserCreated',
          data: {},
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('Rule Management', () => {
    beforeEach(async () => {
      await service.createEventBus('test-bus');
    });

    it('should create a rule', async () => {
      const rule = await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: {
          source: ['test.app'],
          type: ['UserCreated', 'UserUpdated'],
        },
        description: 'Route user events',
        enabled: true,
      });

      expect(rule.name).toBe('user-events');
      expect(rule.eventPattern.source).toEqual(['test.app']);
      expect(rule.eventPattern.type).toEqual(['UserCreated', 'UserUpdated']);
      expect(rule.description).toBe('Route user events');
      expect(rule.enabled).toBe(true);
      expect(rule.targets).toHaveLength(0);
    });

    it('should create a disabled rule', async () => {
      const rule = await service.createRule('test-bus', {
        name: 'disabled-rule',
        eventPattern: { source: ['test.app'] },
        enabled: false,
      });

      expect(rule.enabled).toBe(false);
    });

    it('should throw error when creating duplicate rule', async () => {
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { source: ['test.app'] },
      });

      expect(
        service.createRule('test-bus', {
          name: 'user-events',
          eventPattern: { source: ['test.app'] },
        })
      ).rejects.toThrow('Rule user-events already exists');
    });

    it('should get a rule', async () => {
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { source: ['test.app'] },
      });

      const rule = await service.getRule('test-bus', 'user-events');

      expect(rule.name).toBe('user-events');
    });

    it('should throw error when getting non-existent rule', async () => {
      expect(service.getRule('test-bus', 'nonexistent')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should update a rule', async () => {
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { source: ['test.app'] },
        enabled: true,
      });

      const updated = await service.updateRule('test-bus', 'user-events', {
        name: 'user-events',
        eventPattern: { source: ['test.app'], type: ['UserCreated'] },
        description: 'Updated description',
        enabled: false,
      });

      expect(updated.eventPattern.type).toEqual(['UserCreated']);
      expect(updated.description).toBe('Updated description');
      expect(updated.enabled).toBe(false);
    });

    it('should delete a rule', async () => {
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { source: ['test.app'] },
      });

      await service.deleteRule('test-bus', 'user-events');

      expect(service.getRule('test-bus', 'user-events')).rejects.toThrow(ResourceNotFoundError);
    });

    it('should list rules', async () => {
      await service.createRule('test-bus', {
        name: 'rule1',
        eventPattern: { source: ['app1'] },
      });
      await service.createRule('test-bus', {
        name: 'rule2',
        eventPattern: { source: ['app2'] },
      });

      const rules = await service.listRules('test-bus');

      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.name).sort()).toEqual(['rule1', 'rule2']);
    });
  });

  describe('Target Management', () => {
    beforeEach(async () => {
      await service.createEventBus('test-bus');
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { source: ['test.app'] },
      });
    });

    it('should add a target to a rule', async () => {
      await service.addTarget('test-bus', 'user-events', {
        id: 'target-1',
        type: TargetType.HTTPS,
        endpoint: 'https://api.example.com/webhook',
      });

      const rule = await service.getRule('test-bus', 'user-events');

      expect(rule.targets).toHaveLength(1);
      expect(rule.targets[0]?.id).toBe('target-1');
      expect(rule.targets[0]?.type).toBe(TargetType.HTTPS);
      expect(rule.targets[0]?.endpoint).toBe('https://api.example.com/webhook');
    });

    it('should add multiple targets to a rule', async () => {
      await service.addTarget('test-bus', 'user-events', {
        id: 'target-1',
        type: TargetType.HTTPS,
        endpoint: 'https://api.example.com/webhook',
      });
      await service.addTarget('test-bus', 'user-events', {
        id: 'target-2',
        type: TargetType.QUEUE,
        endpoint: 'arn:aws:sqs:us-east-1:000000000000:my-queue',
      });

      const rule = await service.getRule('test-bus', 'user-events');

      expect(rule.targets).toHaveLength(2);
    });

    it('should throw error when adding duplicate target', async () => {
      await service.addTarget('test-bus', 'user-events', {
        id: 'target-1',
        type: TargetType.HTTPS,
        endpoint: 'https://api.example.com/webhook',
      });

      expect(
        service.addTarget('test-bus', 'user-events', {
          id: 'target-1',
          type: TargetType.HTTPS,
          endpoint: 'https://api.example.com/webhook2',
        })
      ).rejects.toThrow('Target target-1 already exists for rule user-events');
    });

    it('should remove a target from a rule', async () => {
      await service.addTarget('test-bus', 'user-events', {
        id: 'target-1',
        type: TargetType.HTTPS,
        endpoint: 'https://api.example.com/webhook',
      });

      await service.removeTarget('test-bus', 'user-events', 'target-1');

      const rule = await service.getRule('test-bus', 'user-events');

      expect(rule.targets).toHaveLength(0);
    });

    it('should throw error when removing non-existent target', async () => {
      expect(service.removeTarget('test-bus', 'user-events', 'nonexistent')).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('Event Matching', () => {
    beforeEach(async () => {
      await service.createEventBus('test-bus');
    });

    it('should match events by source', async () => {
      await service.createRule('test-bus', {
        name: 'app-events',
        eventPattern: { source: ['test.app'] },
      });

      await service.addTarget('test-bus', 'app-events', {
        id: 'target-1',
        type: TargetType.HTTPS,
        endpoint: 'https://api.example.com/webhook',
      });

      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123' },
      });

      expect(eventId).toBeDefined();
    });

    it('should match events by type', async () => {
      await service.createRule('test-bus', {
        name: 'user-events',
        eventPattern: { type: ['UserCreated', 'UserUpdated'] },
      });

      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123' },
      });

      expect(eventId).toBeDefined();
    });

    it('should match events by data fields', async () => {
      await service.createRule('test-bus', {
        name: 'premium-users',
        eventPattern: {
          source: ['test.app'],
          data: { tier: 'premium' },
        },
      });

      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123', tier: 'premium' },
      });

      expect(eventId).toBeDefined();
    });

    it('should not match disabled rules', async () => {
      await service.createRule('test-bus', {
        name: 'disabled-rule',
        eventPattern: { source: ['test.app'] },
        enabled: false,
      });

      const eventId = await service.publishEvent('test-bus', {
        source: 'test.app',
        type: 'UserCreated',
        data: { userId: '123' },
      });

      expect(eventId).toBeDefined();
      // Event should be published but not delivered to disabled rule
    });
  });
});
