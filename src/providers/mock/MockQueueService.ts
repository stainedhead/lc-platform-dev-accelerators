/**
 * Mock Queue Service Implementation
 * In-memory message queue for testing
 */

import type { QueueService } from '../../core/services/QueueService';
import type {
  Message,
  Queue,
  QueueOptions,
  SendMessageParams,
  ReceiveMessageParams,
  ReceivedMessage,
} from '../../core/types/queue';
import { ResourceNotFoundError } from '../../core/types/common';
import { randomBytes } from 'crypto';

interface QueueData {
  queue: Queue;
  messages: ReceivedMessage[];
  visibleMessages: Set<string>;
  options: QueueOptions;
}

export class MockQueueService implements QueueService {
  private queues = new Map<string, QueueData>();
  private messageCounter = 1;

  async createQueue(name: string, options?: QueueOptions): Promise<Queue> {
    const url = `mock://queue/${name}`;

    if (this.queues.has(url)) {
      throw new Error(`Queue ${name} already exists`);
    }

    const queue: Queue = {
      name,
      url,
      messageCount: 0,
      created: new Date(),
    };

    this.queues.set(url, {
      queue,
      messages: [],
      visibleMessages: new Set(),
      options: options ?? {},
    });

    return queue;
  }

  async getQueue(queueUrl: string): Promise<Queue> {
    const queueData = this.queues.get(queueUrl);
    if (!queueData) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }

    return {
      ...queueData.queue,
      messageCount: queueData.messages.filter((m) =>
        queueData.visibleMessages.has(m.id)
      ).length,
    };
  }

  async deleteQueue(queueUrl: string): Promise<void> {
    const exists = this.queues.has(queueUrl);
    if (!exists) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }
    this.queues.delete(queueUrl);
  }

  async sendMessage(queueUrl: string, params: SendMessageParams): Promise<string> {
    const queueData = this.queues.get(queueUrl);
    if (!queueData) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }

    const messageId = `mock-msg-${this.messageCounter++}`;
    const receiptHandle = randomBytes(16).toString('hex');

    const message: ReceivedMessage = {
      id: messageId,
      receiptHandle,
      body: params.body,
      attributes: params.attributes ?? {},
      sentTimestamp: new Date(),
      approximateReceiveCount: 0,
    };

    // Handle delay
    const delaySeconds = params.delaySeconds ?? 0;
    if (delaySeconds > 0) {
      setTimeout(() => {
        queueData.messages.push(message);
        queueData.visibleMessages.add(messageId);
      }, delaySeconds * 1000);
    } else {
      queueData.messages.push(message);
      queueData.visibleMessages.add(messageId);
    }

    return messageId;
  }

  async receiveMessages(
    queueUrl: string,
    params?: ReceiveMessageParams
  ): Promise<Message[]> {
    const queueData = this.queues.get(queueUrl);
    if (!queueData) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }

    const maxMessages = params?.maxMessages ?? 1;
    const visibilityTimeout = params?.visibilityTimeout ?? 30;

    // Get visible messages
    const availableMessages = queueData.messages.filter((m) =>
      queueData.visibleMessages.has(m.id)
    );

    const messagesToReturn = availableMessages.slice(0, maxMessages);

    // Make messages temporarily invisible
    messagesToReturn.forEach((msg) => {
      queueData.visibleMessages.delete(msg.id);
      msg.approximateReceiveCount++;

      // Make visible again after visibility timeout
      setTimeout(() => {
        queueData.visibleMessages.add(msg.id);
      }, visibilityTimeout * 1000);
    });

    return messagesToReturn.map((msg) => ({
      body: msg.body,
      attributes: msg.attributes,
    }));
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    const queueData = this.queues.get(queueUrl);
    if (!queueData) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }

    const index = queueData.messages.findIndex((m) => m.receiptHandle === receiptHandle);
    if (index !== -1) {
      const message = queueData.messages[index];
      if (message) {
        queueData.messages.splice(index, 1);
        queueData.visibleMessages.delete(message.id);
      }
    }
  }

  async listQueues(): Promise<string[]> {
    return Array.from(this.queues.keys());
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    const queueData = this.queues.get(queueUrl);
    if (!queueData) {
      throw new ResourceNotFoundError('Queue', queueUrl);
    }

    queueData.messages = [];
    queueData.visibleMessages.clear();
  }
}
