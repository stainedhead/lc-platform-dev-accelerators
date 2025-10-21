/**
 * Mock Notification Service Implementation
 * In-memory notification/messaging for testing
 */

import type { NotificationService } from '../../core/services/NotificationService';
import type {
  NotificationMessage,
  Topic,
  Subscription,
  Protocol,
  EmailParams,
  SMSParams,
} from '../../core/types/notification';
import { ResourceNotFoundError } from '../../core/types/common';

interface TopicData {
  topic: Topic;
  subscriptions: Map<string, Subscription>;
  messages: NotificationMessage[];
}

export class MockNotificationService implements NotificationService {
  private topics = new Map<string, TopicData>();
  private subscriptionCounter = 1;
  private messageCounter = 1;

  async createTopic(name: string): Promise<Topic> {
    const arn = `arn:mock:sns:us-east-1:000000000000:${name}`;

    if (this.topics.has(arn)) {
      throw new Error(`Topic ${name} already exists`);
    }

    const topic: Topic = {
      name,
      arn,
      subscriptions: [],
      created: new Date(),
    };

    this.topics.set(arn, {
      topic,
      subscriptions: new Map(),
      messages: [],
    });

    return topic;
  }

  async getTopic(topicArn: string): Promise<Topic> {
    const topicData = this.topics.get(topicArn);
    if (!topicData) {
      throw new ResourceNotFoundError('Topic', topicArn);
    }

    return {
      ...topicData.topic,
      subscriptions: Array.from(topicData.subscriptions.values()),
    };
  }

  async deleteTopic(topicArn: string): Promise<void> {
    const exists = this.topics.has(topicArn);
    if (!exists) {
      throw new ResourceNotFoundError('Topic', topicArn);
    }
    this.topics.delete(topicArn);
  }

  async publishToTopic(topicArn: string, message: NotificationMessage): Promise<string> {
    const topicData = this.topics.get(topicArn);
    if (!topicData) {
      throw new ResourceNotFoundError('Topic', topicArn);
    }

    const messageId = `mock-msg-${this.messageCounter++}`;
    topicData.messages.push(message);

    // Simulate delivery to all confirmed subscriptions
    for (const subscription of topicData.subscriptions.values()) {
      if (subscription.confirmed) {
        await this.simulateDelivery(subscription, message);
      }
    }

    return messageId;
  }

  async subscribe(topicArn: string, protocol: Protocol, endpoint: string): Promise<Subscription> {
    const topicData = this.topics.get(topicArn);
    if (!topicData) {
      throw new ResourceNotFoundError('Topic', topicArn);
    }

    const subscriptionId = `mock-sub-${this.subscriptionCounter++}`;

    const subscription: Subscription = {
      id: subscriptionId,
      protocol,
      endpoint,
      confirmed: protocol === 'email' ? false : true, // Email requires confirmation
      created: new Date(),
    };

    topicData.subscriptions.set(subscriptionId, subscription);
    topicData.topic.subscriptions = Array.from(topicData.subscriptions.values());

    // Simulate sending confirmation email
    if (protocol === 'email') {
      // In real implementation, would send confirmation email
      // For mock, auto-confirm after a delay
      setTimeout(() => {
        const sub = topicData.subscriptions.get(subscriptionId);
        if (sub) {
          sub.confirmed = true;
        }
      }, 100);
    }

    return subscription;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Find subscription across all topics
    for (const topicData of this.topics.values()) {
      if (topicData.subscriptions.has(subscriptionId)) {
        topicData.subscriptions.delete(subscriptionId);
        topicData.topic.subscriptions = Array.from(topicData.subscriptions.values());
        return;
      }
    }

    throw new ResourceNotFoundError('Subscription', subscriptionId);
  }

  async confirmSubscription(subscriptionId: string, _token: string): Promise<void> {
    // Find subscription across all topics
    for (const topicData of this.topics.values()) {
      const subscription = topicData.subscriptions.get(subscriptionId);
      if (subscription) {
        // In real implementation, would validate token
        subscription.confirmed = true;
        return;
      }
    }

    throw new ResourceNotFoundError('Subscription', subscriptionId);
  }

  async listTopics(): Promise<Topic[]> {
    return Array.from(this.topics.values()).map((data) => ({
      ...data.topic,
      subscriptions: Array.from(data.subscriptions.values()),
    }));
  }

  async listSubscriptions(topicArn: string): Promise<Subscription[]> {
    const topicData = this.topics.get(topicArn);
    if (!topicData) {
      throw new ResourceNotFoundError('Topic', topicArn);
    }

    return Array.from(topicData.subscriptions.values());
  }

  async sendEmail(_params: EmailParams): Promise<string> {
    const messageId = `mock-email-${this.messageCounter++}`;

    // Simulate sending email with delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return messageId;
  }

  async sendSMS(_params: SMSParams): Promise<string> {
    const messageId = `mock-sms-${this.messageCounter++}`;

    // Simulate sending SMS with delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return messageId;
  }

  // Helper methods
  private async simulateDelivery(
    subscription: Subscription,
    _message: NotificationMessage
  ): Promise<void> {
    // Simulate delivery delay based on protocol
    const delay = subscription.protocol === 'email' ? 100 : 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
