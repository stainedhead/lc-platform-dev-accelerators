/**
 * EventPublisher Interface - Data Plane
 *
 * Runtime interface for event publishing in hosted applications.
 * Provides publish-only operations without event bus management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { Event } from '../types/event';
import type { BatchPublishResult } from '../types/runtime';

export interface EventPublisher {
  /**
   * Publish an event to an event bus
   * @param eventBusName - Name of the event bus
   * @param event - Event to publish
   * @returns Event ID
   */
  publish(eventBusName: string, event: Event): Promise<string>;

  /**
   * Publish multiple events to an event bus
   * @param eventBusName - Name of the event bus
   * @param events - Array of events to publish
   * @returns Result with successful and failed entries
   */
  publishBatch(eventBusName: string, events: Event[]): Promise<BatchPublishResult>;
}
