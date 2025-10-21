/**
 * Queue Service Interface
 * Provides cloud-agnostic message queue capabilities
 */

import type {
  Message,
  Queue,
  QueueOptions,
  SendMessageParams,
  ReceiveMessageParams,
} from '../types/queue';

export interface QueueService {
  /**
   * Create a new message queue
   * @param name Name of the queue
   * @param options Optional queue configuration
   * @returns The created queue details
   */
  createQueue(name: string, options?: QueueOptions): Promise<Queue>;

  /**
   * Get details about a specific queue
   * @param queueUrl URL or identifier of the queue
   * @returns Queue details including message counts
   */
  getQueue(queueUrl: string): Promise<Queue>;

  /**
   * Delete a queue and all its messages
   * @param queueUrl URL or identifier of the queue
   */
  deleteQueue(queueUrl: string): Promise<void>;

  /**
   * Send a message to a queue
   * @param queueUrl URL or identifier of the queue
   * @param params Message content and optional attributes
   * @returns The message ID
   */
  sendMessage(queueUrl: string, params: SendMessageParams): Promise<string>;

  /**
   * Receive messages from a queue
   * @param queueUrl URL or identifier of the queue
   * @param params Optional parameters for message retrieval
   * @returns Array of received messages
   */
  receiveMessages(
    queueUrl: string,
    params?: ReceiveMessageParams
  ): Promise<Message[]>;

  /**
   * Delete a message from the queue after processing
   * @param queueUrl URL or identifier of the queue
   * @param receiptHandle Receipt handle from the received message
   */
  deleteMessage(queueUrl: string, receiptHandle: string): Promise<void>;

  /**
   * List all queues
   * @returns Array of queue URLs
   */
  listQueues(): Promise<string[]>;

  /**
   * Purge all messages from a queue
   * @param queueUrl URL or identifier of the queue
   */
  purgeQueue(queueUrl: string): Promise<void>;
}
