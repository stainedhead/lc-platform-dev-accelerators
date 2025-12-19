/**
 * AWS Event Publisher Implementation
 * Uses Amazon EventBridge for event publishing
 *
 * Constitution Principle I: Provider Independence
 */

import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { EventPublisher } from '../../../core/clients/EventPublisher';
import type { Event } from '../../../core/types/event';
import type { BatchPublishResult } from '../../../core/types/runtime';
import type { ProviderConfig } from '../../../core/types/common';
import { ServiceUnavailableError, ValidationError } from '../../../core/types/common';

export class AwsEventPublisher implements EventPublisher {
  private client: EventBridgeClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.client = new EventBridgeClient(clientConfig);
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

    try {
      const eventId = event.id ?? `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const command = new PutEventsCommand({
        Entries: [
          {
            EventBusName: eventBusName,
            Source: event.source,
            DetailType: event.type,
            Detail: JSON.stringify({
              id: eventId,
              data: event.data,
              metadata: event.metadata,
              time: event.time ?? new Date().toISOString(),
            }),
            Time: event.time ?? new Date(),
          },
        ],
      });

      const response = await this.client.send(command);

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        const failed = response.Entries?.[0];
        throw new Error(failed?.ErrorMessage ?? 'Failed to publish event');
      }

      return response.Entries?.[0]?.EventId ?? eventId;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to publish event: ${(error as Error).message}`);
    }
  }

  async publishBatch(eventBusName: string, events: Event[]): Promise<BatchPublishResult> {
    if (!eventBusName) {
      throw new ValidationError('Event bus name is required');
    }

    const successful: Array<{ id: string; eventId?: string }> = [];
    const failed: Array<{ id: string; code: string; message: string }> = [];

    // EventBridge supports max 10 events per call
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      const entries = batch.map((event, index) => {
        const eventId = event.id ?? `evt-${Date.now()}-${index}`;

        // Validate each event
        if (!event.source || !event.type) {
          failed.push({
            id: (i + index).toString(),
            code: 'ValidationError',
            message: 'Event source and type are required',
          });
          return null;
        }

        return {
          EventBusName: eventBusName,
          Source: event.source,
          DetailType: event.type,
          Detail: JSON.stringify({
            id: eventId,
            data: event.data,
            metadata: event.metadata,
            time: event.time ?? new Date().toISOString(),
          }),
          Time: event.time ?? new Date(),
        };
      });

      const validEntries = entries.filter((e) => e !== null);
      if (validEntries.length === 0) {
        continue;
      }

      try {
        const command = new PutEventsCommand({
          Entries: validEntries,
        });

        const response = await this.client.send(command);

        response.Entries?.forEach((entry, index) => {
          const originalIndex = i + index;
          if (entry.EventId) {
            successful.push({
              id: originalIndex.toString(),
              eventId: entry.EventId,
            });
          } else {
            failed.push({
              id: originalIndex.toString(),
              code: entry.ErrorCode ?? 'PublishError',
              message: entry.ErrorMessage ?? 'Failed to publish event',
            });
          }
        });
      } catch (error) {
        // If the entire batch fails, mark all as failed
        batch.forEach((_, index) => {
          failed.push({
            id: (i + index).toString(),
            code: 'BatchError',
            message: (error as Error).message,
          });
        });
      }
    }

    return { successful, failed };
  }
}
