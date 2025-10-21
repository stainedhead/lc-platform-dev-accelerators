/**
 * AWS Queue Service Implementation
 * Uses Amazon SQS for message queuing
 */

import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  DeleteQueueCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ListQueuesCommand,
  PurgeQueueCommand,
} from '@aws-sdk/client-sqs';
import type { QueueService } from '../../core/services/QueueService';
import type {
  Message,
  Queue,
  QueueOptions,
  SendMessageParams,
  ReceiveMessageParams,
} from '../../core/types/queue';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsQueueService implements QueueService {
  private sqsClient: SQSClient;

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

    if (config.options?.endpoint && typeof config.options.endpoint === 'string') {
      clientConfig.endpoint = config.options.endpoint;
    }

    this.sqsClient = new SQSClient(clientConfig);
  }

  async createQueue(name: string, options?: QueueOptions): Promise<Queue> {
    try {
      const attributes: Record<string, string> = {};

      if (options?.visibilityTimeout) {
        attributes.VisibilityTimeout = options.visibilityTimeout.toString();
      }

      if (options?.messageRetention) {
        attributes.MessageRetentionPeriod = options.messageRetention.toString();
      }

      if (options?.maxMessageSize) {
        attributes.MaximumMessageSize = options.maxMessageSize.toString();
      }

      if (options?.fifo) {
        attributes.FifoQueue = 'true';
      }

      if (options?.enableDeadLetter && options.deadLetterAfterRetries) {
        // In production, you would create a DLQ and set RedrivePolicy
        attributes.RedrivePolicy = JSON.stringify({
          maxReceiveCount: options.deadLetterAfterRetries,
          deadLetterTargetArn: `arn:aws:sqs:${this.sqsClient.config.region}:123456789012:${name}-dlq`,
        });
      }

      const command = new CreateQueueCommand({
        QueueName: options?.fifo ? `${name}.fifo` : name,
        Attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      });

      const response = await this.sqsClient.send(command);

      if (!response.QueueUrl) {
        throw new ServiceUnavailableError('Failed to create queue - no URL returned');
      }

      return await this.getQueue(response.QueueUrl);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to create queue: ${(error as Error).message}`
      );
    }
  }

  async getQueue(queueUrl: string): Promise<Queue> {
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (!response.Attributes) {
        throw new ResourceNotFoundError('Queue', queueUrl);
      }

      const queueName = this.extractQueueNameFromUrl(queueUrl);
      const createdTimestamp = response.Attributes.CreatedTimestamp
        ? parseInt(response.Attributes.CreatedTimestamp, 10) * 1000
        : Date.now();

      return {
        name: queueName,
        url: queueUrl,
        messageCount: parseInt(response.Attributes.ApproximateNumberOfMessages || '0', 10),
        created: new Date(createdTimestamp),
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to get queue: ${(error as Error).message}`
      );
    }
  }

  async deleteQueue(queueUrl: string): Promise<void> {
    try {
      const command = new DeleteQueueCommand({
        QueueUrl: queueUrl,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to delete queue: ${(error as Error).message}`
      );
    }
  }

  async sendMessage(queueUrl: string, params: SendMessageParams): Promise<string> {
    try {
      const messageBody =
        typeof params.body === 'string' ? params.body : JSON.stringify(params.body);

      const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {};

      if (params.attributes) {
        Object.entries(params.attributes).forEach(([key, value]) => {
          messageAttributes[key] = {
            DataType: 'String',
            StringValue: value,
          };
        });
      }

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageAttributes:
          Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined,
        DelaySeconds: params.delaySeconds,
        MessageDeduplicationId: params.deduplicationId,
        MessageGroupId: params.groupId,
      });

      const response = await this.sqsClient.send(command);

      if (!response.MessageId) {
        throw new ServiceUnavailableError('Failed to send message - no MessageId returned');
      }

      return response.MessageId;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to send message: ${(error as Error).message}`
      );
    }
  }

  async receiveMessages(queueUrl: string, params?: ReceiveMessageParams): Promise<Message[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: params?.maxMessages ?? 1,
        VisibilityTimeout: params?.visibilityTimeout,
        WaitTimeSeconds: params?.waitTimeSeconds ?? 0,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);

      if (!response.Messages || response.Messages.length === 0) {
        return [];
      }

      return response.Messages.map((msg) => {
        const attributes: Record<string, string> = {};

        if (msg.MessageAttributes) {
          Object.entries(msg.MessageAttributes).forEach(([key, value]) => {
            if (value.StringValue) {
              attributes[key] = value.StringValue;
            }
          });
        }

        // Try to parse JSON, fall back to string
        let body: string | object = msg.Body || '';
        try {
          body = JSON.parse(msg.Body || '');
        } catch {
          // Keep as string if not valid JSON
        }

        return {
          body,
          attributes,
        };
      });
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to receive messages: ${(error as Error).message}`
      );
    }
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to delete message: ${(error as Error).message}`
      );
    }
  }

  async listQueues(): Promise<string[]> {
    try {
      const command = new ListQueuesCommand({});

      const response = await this.sqsClient.send(command);

      return response.QueueUrls || [];
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list queues: ${(error as Error).message}`
      );
    }
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    try {
      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to purge queue: ${(error as Error).message}`
      );
    }
  }

  // Helper methods
  private extractQueueNameFromUrl(queueUrl: string): string {
    const parts = queueUrl.split('/');
    return parts[parts.length - 1] || queueUrl;
  }
}
