/**
 * AWS Notification Service Implementation
 * Uses AWS SNS (Simple Notification Service) for multi-channel notifications
 */

import {
  SNSClient,
  CreateTopicCommand,
  DeleteTopicCommand,
  PublishCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ConfirmSubscriptionCommand,
  ListTopicsCommand,
  ListSubscriptionsByTopicCommand,
  GetTopicAttributesCommand,
} from '@aws-sdk/client-sns';
import type { NotificationService } from '../../core/services/NotificationService';
import type {
  NotificationMessage,
  Topic,
  Subscription,
  Protocol,
  EmailParams,
  SMSParams,
} from '../../core/types/notification';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsNotificationService implements NotificationService {
  private snsClient: SNSClient;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
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

    this.snsClient = new SNSClient(clientConfig);
  }

  async createTopic(name: string): Promise<Topic> {
    try {
      const command = new CreateTopicCommand({
        Name: name,
      });

      const response = await this.snsClient.send(command);

      const topic: Topic = {
        name,
        subscriptions: [],
        created: new Date(),
      };

      if (response.TopicArn) {
        topic.arn = response.TopicArn;
      }

      return topic;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to create topic: ${(error as Error).message}`
      );
    }
  }

  async getTopic(topicArn: string): Promise<Topic> {
    try {
      const attributesCommand = new GetTopicAttributesCommand({
        TopicArn: topicArn,
      });

      const attributesResponse = await this.snsClient.send(attributesCommand);

      // Get subscriptions for this topic
      const subscriptionsCommand = new ListSubscriptionsByTopicCommand({
        TopicArn: topicArn,
      });

      const subscriptionsResponse = await this.snsClient.send(subscriptionsCommand);

      const subscriptions: Subscription[] = [];
      for (const awsSub of subscriptionsResponse.Subscriptions || []) {
        if (awsSub.SubscriptionArn && awsSub.Protocol && awsSub.Endpoint) {
          subscriptions.push(
            this.convertAwsSubscription(
              awsSub.SubscriptionArn,
              awsSub.Protocol,
              awsSub.Endpoint
            )
          );
        }
      }

      const topic: Topic = {
        name: attributesResponse.Attributes?.DisplayName || topicArn.split(':').pop() || '',
        arn: topicArn,
        subscriptions,
        created: new Date(),
      };

      return topic;
    } catch (error) {
      if ((error as Error).name === 'NotFoundException') {
        throw new ResourceNotFoundError('Topic', topicArn);
      }
      throw new ServiceUnavailableError(
        `Failed to get topic: ${(error as Error).message}`
      );
    }
  }

  async deleteTopic(topicArn: string): Promise<void> {
    try {
      const command = new DeleteTopicCommand({
        TopicArn: topicArn,
      });

      await this.snsClient.send(command);
    } catch (error) {
      if ((error as Error).name === 'NotFoundException') {
        throw new ResourceNotFoundError('Topic', topicArn);
      }
      throw new ServiceUnavailableError(
        `Failed to delete topic: ${(error as Error).message}`
      );
    }
  }

  async publishToTopic(topicArn: string, message: NotificationMessage): Promise<string> {
    try {
      const publishParams: {
        TopicArn: string;
        Message: string;
        Subject?: string;
        MessageAttributes?: Record<string, { DataType: string; StringValue: string }>;
      } = {
        TopicArn: topicArn,
        Message: message.body,
      };

      if (message.subject) {
        publishParams.Subject = message.subject;
      }

      if (message.attributes) {
        publishParams.MessageAttributes = Object.fromEntries(
          Object.entries(message.attributes).map(([key, value]) => [
            key,
            { DataType: 'String', StringValue: value },
          ])
        );
      }

      const command = new PublishCommand(publishParams);

      const response = await this.snsClient.send(command);

      return response.MessageId || 'unknown';
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to publish message: ${(error as Error).message}`
      );
    }
  }

  async subscribe(topicArn: string, protocol: Protocol, endpoint: string): Promise<Subscription> {
    try {
      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: protocol,
        Endpoint: endpoint,
      });

      const response = await this.snsClient.send(command);

      const subscription: Subscription = {
        id: response.SubscriptionArn || 'pending',
        protocol,
        endpoint,
        confirmed: response.SubscriptionArn !== 'pending confirmation',
        created: new Date(),
      };

      return subscription;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to subscribe: ${(error as Error).message}`
      );
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      const command = new UnsubscribeCommand({
        SubscriptionArn: subscriptionId,
      });

      await this.snsClient.send(command);
    } catch (error) {
      if ((error as Error).name === 'NotFoundException') {
        throw new ResourceNotFoundError('Subscription', subscriptionId);
      }
      throw new ServiceUnavailableError(
        `Failed to unsubscribe: ${(error as Error).message}`
      );
    }
  }

  async confirmSubscription(subscriptionId: string, token: string): Promise<void> {
    try {
      // Extract topic ARN from subscription ARN
      // Format: arn:aws:sns:region:account:topic-name:subscription-id
      const topicArn = subscriptionId.split(':').slice(0, -1).join(':');

      const command = new ConfirmSubscriptionCommand({
        TopicArn: topicArn,
        Token: token,
      });

      await this.snsClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to confirm subscription: ${(error as Error).message}`
      );
    }
  }

  async listTopics(): Promise<Topic[]> {
    try {
      const command = new ListTopicsCommand({});

      const response = await this.snsClient.send(command);

      const topics: Topic[] = [];

      for (const awsTopic of response.Topics || []) {
        if (!awsTopic.TopicArn) continue;

        const topic: Topic = {
          name: awsTopic.TopicArn.split(':').pop() || '',
          arn: awsTopic.TopicArn,
          subscriptions: [],
          created: new Date(),
        };

        topics.push(topic);
      }

      return topics;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list topics: ${(error as Error).message}`
      );
    }
  }

  async listSubscriptions(topicArn: string): Promise<Subscription[]> {
    try {
      const command = new ListSubscriptionsByTopicCommand({
        TopicArn: topicArn,
      });

      const response = await this.snsClient.send(command);

      const subscriptions: Subscription[] = [];
      for (const awsSub of response.Subscriptions || []) {
        if (awsSub.SubscriptionArn && awsSub.Protocol && awsSub.Endpoint) {
          subscriptions.push(
            this.convertAwsSubscription(
              awsSub.SubscriptionArn,
              awsSub.Protocol,
              awsSub.Endpoint
            )
          );
        }
      }

      return subscriptions;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list subscriptions: ${(error as Error).message}`
      );
    }
  }

  async sendEmail(params: EmailParams): Promise<string> {
    // Note: AWS SES requires separate setup and verification
    // For now, we'll simulate email sending
    // In production, would use SES with verified domain/email
    try {
      // Simulate email sending with recipient count and subject
      const messageId = `email-${Date.now()}-${params.to.length}`;

      // Production code would use:
      // const command = new SendEmailCommand({
      //   Source: params.from || 'noreply@example.com',
      //   Destination: { ToAddresses: params.to },
      //   Message: {
      //     Subject: { Data: params.subject },
      //     Body: params.html
      //       ? { Html: { Data: params.body } }
      //       : { Text: { Data: params.body } }
      //   }
      // });

      return messageId;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to send email: ${(error as Error).message}`
      );
    }
  }

  async sendSMS(params: SMSParams): Promise<string> {
    try {
      const publishParams: {
        PhoneNumber: string;
        Message: string;
        MessageAttributes?: Record<string, { DataType: string; StringValue: string }>;
      } = {
        PhoneNumber: params.to,
        Message: params.message,
      };

      if (params.senderId) {
        publishParams.MessageAttributes = {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: params.senderId,
          },
        };
      }

      const command = new PublishCommand(publishParams);

      const response = await this.snsClient.send(command);

      return response.MessageId || 'unknown';
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to send SMS: ${(error as Error).message}`
      );
    }
  }

  // Helper methods
  private convertAwsSubscription(
    subscriptionArn: string,
    protocol: string,
    endpoint: string
  ): Subscription {
    return {
      id: subscriptionArn,
      protocol: protocol as Protocol,
      endpoint,
      confirmed: subscriptionArn !== 'PendingConfirmation',
      created: new Date(),
    };
  }
}
