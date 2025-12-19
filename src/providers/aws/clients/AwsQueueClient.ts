/**
 * AWS Queue Client Implementation
 * Uses Amazon SQS for message queuing
 *
 * Constitution Principle I: Provider Independence
 */

import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand,
  ChangeMessageVisibilityCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import type { QueueClient } from '../../../core/clients/QueueClient';
import type { ReceivedMessage } from '../../../core/types/queue';
import type { SendOptions, ReceiveOptions, BatchSendResult } from '../../../core/types/runtime';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsQueueClient implements QueueClient {
  private sqsClient: SQSClient;
  private queueUrlCache = new Map<string, string>();

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

    this.sqsClient = new SQSClient(clientConfig);
  }

  private async getQueueUrl(queueName: string): Promise<string> {
    const cached = this.queueUrlCache.get(queueName);
    if (cached) {
      return cached;
    }

    try {
      const command = new GetQueueUrlCommand({ QueueName: queueName });
      const response = await this.sqsClient.send(command);

      if (!response.QueueUrl) {
        throw new ResourceNotFoundError('Queue', queueName);
      }

      this.queueUrlCache.set(queueName, response.QueueUrl);
      return response.QueueUrl;
    } catch (error) {
      if ((error as Error).name === 'QueueDoesNotExist') {
        throw new ResourceNotFoundError('Queue', queueName);
      }
      throw error;
    }
  }

  async send(queueName: string, message: unknown, options?: SendOptions): Promise<string> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);
      const messageBody = typeof message === 'string' ? message : JSON.stringify(message);

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: options?.delaySeconds,
        MessageGroupId: options?.messageGroupId,
        MessageDeduplicationId: options?.messageDeduplicationId,
        MessageAttributes: options?.attributes
          ? Object.fromEntries(
              Object.entries(options.attributes).map(([key, value]) => [
                key,
                { DataType: 'String', StringValue: value },
              ])
            )
          : undefined,
      });

      const response = await this.sqsClient.send(command);

      if (!response.MessageId) {
        throw new Error('No message ID returned');
      }

      return response.MessageId;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to send message: ${(error as Error).message}`);
    }
  }

  async sendBatch(queueName: string, messages: unknown[]): Promise<BatchSendResult> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);

      const entries = messages.map((message, index) => ({
        Id: index.toString(),
        MessageBody: typeof message === 'string' ? message : JSON.stringify(message),
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries,
      });

      const response = await this.sqsClient.send(command);

      return {
        successful:
          response.Successful?.map((s) => ({
            id: s.Id ?? '',
            messageId: s.MessageId ?? '',
          })) ?? [],
        failed:
          response.Failed?.map((f) => ({
            id: f.Id ?? '',
            code: f.Code ?? 'Unknown',
            message: f.Message ?? 'Unknown error',
          })) ?? [],
      };
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to send batch: ${(error as Error).message}`);
    }
  }

  async receive(queueName: string, options?: ReceiveOptions): Promise<ReceivedMessage[]> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);

      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: options?.maxMessages ?? 10,
        VisibilityTimeout: options?.visibilityTimeout,
        WaitTimeSeconds: options?.waitTimeSeconds ?? 0,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      return (response.Messages ?? []).map((msg) => {
        let body: string | object;
        try {
          body = JSON.parse(msg.Body ?? '{}') as object;
        } catch {
          body = msg.Body ?? '';
        }

        // Get system attributes for sentTimestamp and approximateReceiveCount
        const systemAttrs = msg.Attributes ?? {};
        const sentTimestamp = systemAttrs.SentTimestamp
          ? new Date(parseInt(systemAttrs.SentTimestamp, 10))
          : new Date();
        const approximateReceiveCount = systemAttrs.ApproximateReceiveCount
          ? parseInt(systemAttrs.ApproximateReceiveCount, 10)
          : 1;

        // Build attributes from message attributes
        const attributes: Record<string, string> = msg.MessageAttributes
          ? Object.fromEntries(
              Object.entries(msg.MessageAttributes).map(([key, value]) => [
                key,
                value.StringValue ?? '',
              ])
            )
          : {};

        return {
          id: msg.MessageId ?? '',
          body,
          receiptHandle: msg.ReceiptHandle ?? '',
          attributes,
          sentTimestamp,
          approximateReceiveCount,
        };
      });
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to receive messages: ${(error as Error).message}`);
    }
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<void> {
    if (!queueName || !receiptHandle) {
      throw new ValidationError('Queue name and receipt handle are required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);

      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to acknowledge message: ${(error as Error).message}`
      );
    }
  }

  async acknowledgeBatch(queueName: string, receiptHandles: string[]): Promise<void> {
    if (!queueName) {
      throw new ValidationError('Queue name is required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);

      const command = new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: receiptHandles.map((handle, index) => ({
          Id: index.toString(),
          ReceiptHandle: handle,
        })),
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to acknowledge batch: ${(error as Error).message}`);
    }
  }

  async changeVisibility(queueName: string, receiptHandle: string, timeout: number): Promise<void> {
    if (!queueName || !receiptHandle) {
      throw new ValidationError('Queue name and receipt handle are required');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);

      const command = new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: timeout,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to change visibility: ${(error as Error).message}`);
    }
  }
}
