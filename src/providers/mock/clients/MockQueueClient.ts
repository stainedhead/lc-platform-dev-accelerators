/**
 * Mock QueueClient Implementation
 *
 * In-memory queue client for testing without cloud resources.
 * Simulates queue send/receive operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { QueueClient } from '../../../core/clients/QueueClient';
import type { ReceivedMessage } from '../../../core/types/queue';
import type { SendOptions, ReceiveOptions, BatchSendResult } from '../../../core/types/runtime';
import { ValidationError } from '../../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredMessage {
  id: string;
  receiptHandle: string;
  body: unknown;
  attributes: Record<string, string>;
  sentTimestamp: Date;
  approximateReceiveCount: number;
  visible: boolean;
  visibleAt?: Date;
}

export class MockQueueClient implements QueueClient {
  private queues = new Map<string, StoredMessage[]>();
  private messageCounter = 1;

  /**
   * Reset all mock data
   */
  reset(): void {
    this.queues.clear();
    this.messageCounter = 1;
  }

  /**
   * Pre-create a queue for testing
   */
  createTestQueue(queueName: string): void {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
  }

  private getOrCreateQueue(queueName: string): StoredMessage[] {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = [];
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  async send(queueName: string, message: unknown, options?: SendOptions): Promise<string> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    const queue = this.getOrCreateQueue(queueName);
    const messageId = `mock-msg-${this.messageCounter++}`;
    const receiptHandle = randomBytes(16).toString('hex');

    const storedMessage: StoredMessage = {
      id: messageId,
      receiptHandle,
      body: message,
      attributes: options?.attributes ?? {},
      sentTimestamp: new Date(),
      approximateReceiveCount: 0,
      visible: true,
    };

    // Handle delay
    const delaySeconds = options?.delaySeconds ?? 0;
    if (delaySeconds > 0) {
      storedMessage.visible = false;
      storedMessage.visibleAt = new Date(Date.now() + delaySeconds * 1000);
    }

    queue.push(storedMessage);
    return messageId;
  }

  async sendBatch(queueName: string, messages: unknown[]): Promise<BatchSendResult> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    const result: BatchSendResult = {
      successful: [],
      failed: [],
    };

    for (let i = 0; i < messages.length; i++) {
      try {
        const messageId = await this.send(queueName, messages[i]);
        result.successful.push({ id: String(i), messageId });
      } catch (error) {
        result.failed.push({
          id: String(i),
          code: 'SendError',
          message: (error as Error).message,
        });
      }
    }

    return result;
  }

  async receive(queueName: string, options?: ReceiveOptions): Promise<ReceivedMessage[]> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      return [];
    }

    const now = new Date();
    const maxMessages = options?.maxMessages ?? 1;
    const visibilityTimeout = options?.visibilityTimeout ?? 30;

    // Make delayed messages visible if their time has come
    queue.forEach((msg) => {
      if (!msg.visible && msg.visibleAt && msg.visibleAt <= now) {
        msg.visible = true;
        delete msg.visibleAt;
      }
    });

    // Get visible messages
    const visibleMessages = queue.filter((m) => m.visible);
    const messagesToReturn = visibleMessages.slice(0, maxMessages);

    // Make messages temporarily invisible
    messagesToReturn.forEach((msg) => {
      msg.visible = false;
      msg.receiptHandle = randomBytes(16).toString('hex');
      msg.approximateReceiveCount++;
      msg.visibleAt = new Date(Date.now() + visibilityTimeout * 1000);
    });

    return messagesToReturn.map((msg) => ({
      id: msg.id,
      receiptHandle: msg.receiptHandle,
      body: msg.body as string | object,
      attributes: msg.attributes,
      sentTimestamp: msg.sentTimestamp,
      approximateReceiveCount: msg.approximateReceiveCount,
    }));
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<void> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }
    if (!receiptHandle) {
      throw new ValidationError('Receipt handle is required');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      return;
    }

    const index = queue.findIndex((m) => m.receiptHandle === receiptHandle);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  async acknowledgeBatch(queueName: string, receiptHandles: string[]): Promise<void> {
    for (const handle of receiptHandles) {
      await this.acknowledge(queueName, handle);
    }
  }

  async changeVisibility(queueName: string, receiptHandle: string, timeout: number): Promise<void> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }
    if (!receiptHandle) {
      throw new ValidationError('Receipt handle is required');
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      return;
    }

    const message = queue.find((m) => m.receiptHandle === receiptHandle);
    if (message) {
      if (timeout === 0) {
        message.visible = true;
        delete message.visibleAt;
      } else {
        message.visible = false;
        message.visibleAt = new Date(Date.now() + timeout * 1000);
      }
    }
  }
}
