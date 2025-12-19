/**
 * Mock EventPublisher Implementation
 *
 * In-memory event publisher for testing without cloud resources.
 * Simulates event publishing operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { EventPublisher } from '../../../core/clients/EventPublisher';
import type { Event } from '../../../core/types/event';
import type { BatchPublishResult } from '../../../core/types/runtime';
import { ValidationError } from '../../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredEvent extends Event {
  eventId: string;
  publishedAt: Date;
}

export class MockEventPublisher implements EventPublisher {
  private eventBuses = new Map<string, StoredEvent[]>();
  private eventCounter = 1;

  /**
   * Reset all mock data
   */
  reset(): void {
    this.eventBuses.clear();
    this.eventCounter = 1;
  }

  /**
   * Pre-create an event bus for testing
   */
  createTestEventBus(eventBusName: string): void {
    if (!this.eventBuses.has(eventBusName)) {
      this.eventBuses.set(eventBusName, []);
    }
  }

  /**
   * Get all published events for an event bus (for testing)
   */
  getPublishedEvents(eventBusName: string): StoredEvent[] {
    return this.eventBuses.get(eventBusName) ?? [];
  }

  private getOrCreateEventBus(eventBusName: string): StoredEvent[] {
    let bus = this.eventBuses.get(eventBusName);
    if (!bus) {
      bus = [];
      this.eventBuses.set(eventBusName, bus);
    }
    return bus;
  }

  async publish(eventBusName: string, event: Event): Promise<string> {
    if (!eventBusName) {
      throw new ValidationError('Event bus name is required');
    }
    if (!event.source) {
      throw new ValidationError('Event source is required');
    }
    if (!event.type) {
      throw new ValidationError('Event type is required');
    }

    const bus = this.getOrCreateEventBus(eventBusName);
    const eventId =
      event.id ?? `mock-event-${this.eventCounter++}-${randomBytes(8).toString('hex')}`;

    const storedEvent: StoredEvent = {
      ...event,
      id: eventId,
      eventId,
      time: event.time ?? new Date(),
      publishedAt: new Date(),
    };

    bus.push(storedEvent);
    return eventId;
  }

  async publishBatch(eventBusName: string, events: Event[]): Promise<BatchPublishResult> {
    if (!eventBusName) {
      throw new ValidationError('Event bus name is required');
    }

    const result: BatchPublishResult = {
      successful: [],
      failed: [],
    };

    for (let i = 0; i < events.length; i++) {
      try {
        const eventId = await this.publish(eventBusName, events[i]!);
        result.successful.push({ id: String(i), eventId });
      } catch (error) {
        result.failed.push({
          id: String(i),
          code: 'PublishError',
          message: (error as Error).message,
        });
      }
    }

    return result;
  }
}
