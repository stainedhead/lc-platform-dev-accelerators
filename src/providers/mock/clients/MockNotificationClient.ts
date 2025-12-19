/**
 * Mock NotificationClient Implementation
 *
 * In-memory notification client for testing without cloud resources.
 * Simulates notification publishing operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { NotificationClient } from '../../../core/clients/NotificationClient';
import type { NotificationMessage } from '../../../core/types/notification';
import type { BatchPublishResult } from '../../../core/types/runtime';
import { ValidationError } from '../../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredNotification extends NotificationMessage {
  messageId: string;
  publishedAt: Date;
}

export class MockNotificationClient implements NotificationClient {
  private topics = new Map<string, StoredNotification[]>();
  private messageCounter = 1;

  /**
   * Reset all mock data
   */
  reset(): void {
    this.topics.clear();
    this.messageCounter = 1;
  }

  /**
   * Pre-create a topic for testing
   */
  createTestTopic(topicName: string): void {
    if (!this.topics.has(topicName)) {
      this.topics.set(topicName, []);
    }
  }

  /**
   * Get all published messages for a topic (for testing)
   */
  getPublishedMessages(topicName: string): StoredNotification[] {
    return this.topics.get(topicName) ?? [];
  }

  private getOrCreateTopic(topicName: string): StoredNotification[] {
    let topic = this.topics.get(topicName);
    if (!topic) {
      topic = [];
      this.topics.set(topicName, topic);
    }
    return topic;
  }

  async publish(topicName: string, message: NotificationMessage): Promise<string> {
    if (!topicName) {
      throw new ValidationError('Topic name is required');
    }
    if (!message.body) {
      throw new ValidationError('Message body is required');
    }

    const topic = this.getOrCreateTopic(topicName);
    const messageId = `mock-notification-${this.messageCounter++}-${randomBytes(8).toString('hex')}`;

    const storedNotification: StoredNotification = {
      ...message,
      messageId,
      publishedAt: new Date(),
    };

    topic.push(storedNotification);
    return messageId;
  }

  async publishBatch(
    topicName: string,
    messages: NotificationMessage[]
  ): Promise<BatchPublishResult> {
    if (!topicName) {
      throw new ValidationError('Topic name is required');
    }

    const result: BatchPublishResult = {
      successful: [],
      failed: [],
    };

    for (let i = 0; i < messages.length; i++) {
      try {
        const messageId = await this.publish(topicName, messages[i]!);
        result.successful.push({ id: String(i), eventId: messageId });
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
