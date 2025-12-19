/**
 * NotificationClient Interface - Data Plane
 *
 * Runtime interface for notification publishing in hosted applications.
 * Provides publish-only operations without topic management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { NotificationMessage } from '../types/notification';
import type { BatchPublishResult } from '../types/runtime';

export interface NotificationClient {
  /**
   * Publish a notification message to a topic
   * @param topicName - Name of the topic
   * @param message - Notification message
   * @returns Message ID
   */
  publish(topicName: string, message: NotificationMessage): Promise<string>;

  /**
   * Publish multiple notification messages to a topic
   * @param topicName - Name of the topic
   * @param messages - Array of notification messages
   * @returns Result with successful and failed entries
   */
  publishBatch(topicName: string, messages: NotificationMessage[]): Promise<BatchPublishResult>;
}
