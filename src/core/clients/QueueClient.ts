/**
 * QueueClient Interface - Data Plane
 *
 * Runtime interface for queue operations in hosted applications.
 * Provides send/receive operations without queue management capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { ReceivedMessage } from '../types/queue';
import type { SendOptions, ReceiveOptions, BatchSendResult } from '../types/runtime';

export interface QueueClient {
  /**
   * Send a message to a queue
   * @param queueName - Name of the queue
   * @param message - Message body (will be serialized to JSON if object)
   * @param options - Optional send parameters
   * @returns Message ID
   */
  send(queueName: string, message: unknown, options?: SendOptions): Promise<string>;

  /**
   * Send multiple messages to a queue
   * @param queueName - Name of the queue
   * @param messages - Array of messages to send
   * @returns Result with successful and failed entries
   */
  sendBatch(queueName: string, messages: unknown[]): Promise<BatchSendResult>;

  /**
   * Receive messages from a queue
   * @param queueName - Name of the queue
   * @param options - Optional receive parameters
   * @returns Array of received messages
   */
  receive(queueName: string, options?: ReceiveOptions): Promise<ReceivedMessage[]>;

  /**
   * Acknowledge (delete) a message after processing
   * @param queueName - Name of the queue
   * @param receiptHandle - Receipt handle from received message
   */
  acknowledge(queueName: string, receiptHandle: string): Promise<void>;

  /**
   * Acknowledge multiple messages at once
   * @param queueName - Name of the queue
   * @param receiptHandles - Array of receipt handles
   */
  acknowledgeBatch(queueName: string, receiptHandles: string[]): Promise<void>;

  /**
   * Change the visibility timeout of a message
   * @param queueName - Name of the queue
   * @param receiptHandle - Receipt handle from received message
   * @param timeout - New visibility timeout in seconds
   */
  changeVisibility(queueName: string, receiptHandle: string, timeout: number): Promise<void>;
}
