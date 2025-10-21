/**
 * Queue Types - Message Queuing
 */

export interface Message {
  body: string | object;
  attributes?: Record<string, string>;
  delaySeconds?: number;
  deduplicationId?: string;
  groupId?: string;
}

export interface ReceivedMessage {
  id: string;
  receiptHandle: string;
  body: string | object;
  attributes: Record<string, string>;
  sentTimestamp: Date;
  approximateReceiveCount: number;
}

export interface Queue {
  name: string;
  url: string;
  messageCount: number;
  created: Date;
}

export interface QueueOptions {
  visibilityTimeout?: number;
  messageRetention?: number;
  maxMessageSize?: number;
  enableDeadLetter?: boolean;
  deadLetterAfterRetries?: number;
  fifo?: boolean;
}

export interface QueueAttributes {
  approximateMessageCount: number;
  approximateMessageNotVisibleCount: number;
  created: Date;
  lastModified: Date;
}

export interface SendMessageParams {
  body: string | object;
  attributes?: Record<string, string>;
  delaySeconds?: number;
  deduplicationId?: string;
  groupId?: string;
}

export interface ReceiveMessageParams {
  maxMessages?: number;
  visibilityTimeout?: number;
  waitTimeSeconds?: number;
}
