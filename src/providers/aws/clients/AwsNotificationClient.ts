/**
 * AWS Notification Client Implementation
 * Uses Amazon SNS for notifications
 *
 * Constitution Principle I: Provider Independence
 */

import {
  SNSClient,
  PublishCommand,
  PublishBatchCommand,
  ListTopicsCommand,
  type MessageAttributeValue,
} from '@aws-sdk/client-sns';
import type { NotificationClient } from '../../../core/clients/NotificationClient';
import type { NotificationMessage } from '../../../core/types/notification';
import type { BatchPublishResult } from '../../../core/types/runtime';
import type { ProviderConfig } from '../../../core/types/common';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsNotificationClient implements NotificationClient {
  private snsClient: SNSClient;
  private topicArnCache = new Map<string, string>();

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

    this.snsClient = new SNSClient(clientConfig);
  }

  private async getTopicArn(topicName: string): Promise<string> {
    // Check cache first
    const cached = this.topicArnCache.get(topicName);
    if (cached) {
      return cached;
    }

    // If it looks like an ARN already, use it directly
    if (topicName.startsWith('arn:aws:sns:')) {
      return topicName;
    }

    try {
      // List topics to find the ARN
      const command = new ListTopicsCommand({});
      const response = await this.snsClient.send(command);

      for (const topic of response.Topics ?? []) {
        if (topic.TopicArn?.endsWith(`:${topicName}`)) {
          this.topicArnCache.set(topicName, topic.TopicArn);
          return topic.TopicArn;
        }
      }

      throw new ResourceNotFoundError('Topic', topicName);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to resolve topic: ${(error as Error).message}`);
    }
  }

  async publish(topicName: string, message: NotificationMessage): Promise<string> {
    if (!topicName) {
      throw new ValidationError('Topic name is required');
    }
    if (!message.body) {
      throw new ValidationError('Message body is required');
    }

    try {
      const topicArn = await this.getTopicArn(topicName);

      // Build message attributes with proper types
      let messageAttributes: Record<string, MessageAttributeValue> | undefined;
      if (message.attributes) {
        messageAttributes = {};
        for (const [key, value] of Object.entries(message.attributes)) {
          messageAttributes[key] = { DataType: 'String', StringValue: value };
        }
      }

      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: message.body,
        Subject: message.subject,
        MessageAttributes: messageAttributes,
      });

      const response = await this.snsClient.send(command);

      if (!response.MessageId) {
        throw new Error('No message ID returned');
      }

      return response.MessageId;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to publish notification: ${(error as Error).message}`
      );
    }
  }

  async publishBatch(
    topicName: string,
    messages: NotificationMessage[]
  ): Promise<BatchPublishResult> {
    if (!topicName) {
      throw new ValidationError('Topic name is required');
    }

    const successful: Array<{ id: string; eventId?: string }> = [];
    const failed: Array<{ id: string; code: string; message: string }> = [];

    try {
      const topicArn = await this.getTopicArn(topicName);

      // SNS PublishBatch supports max 10 messages
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        const entries = batch.map((msg, index) => {
          const id = (i + index).toString();

          if (!msg.body) {
            failed.push({
              id,
              code: 'ValidationError',
              message: 'Message body is required',
            });
            return null;
          }

          // Build message attributes with proper types
          let messageAttributes: Record<string, MessageAttributeValue> | undefined;
          if (msg.attributes) {
            messageAttributes = {};
            for (const [key, value] of Object.entries(msg.attributes)) {
              messageAttributes[key] = { DataType: 'String', StringValue: value };
            }
          }

          return {
            Id: id,
            Message: msg.body,
            Subject: msg.subject,
            MessageAttributes: messageAttributes,
          };
        });

        const validEntries = entries.filter((e) => e !== null);
        if (validEntries.length === 0) {
          continue;
        }

        const command = new PublishBatchCommand({
          TopicArn: topicArn,
          PublishBatchRequestEntries: validEntries,
        });

        const response = await this.snsClient.send(command);

        for (const success of response.Successful ?? []) {
          const entry: { id: string; eventId?: string } = { id: success.Id ?? '' };
          if (success.MessageId) {
            entry.eventId = success.MessageId;
          }
          successful.push(entry);
        }

        for (const failure of response.Failed ?? []) {
          failed.push({
            id: failure.Id ?? '',
            code: failure.Code ?? 'PublishError',
            message: failure.Message ?? 'Failed to publish',
          });
        }
      }
    } catch (error) {
      // Mark all remaining as failed
      for (let i = successful.length + failed.length; i < messages.length; i++) {
        failed.push({
          id: i.toString(),
          code: 'BatchError',
          message: (error as Error).message,
        });
      }
    }

    return { successful, failed };
  }
}
