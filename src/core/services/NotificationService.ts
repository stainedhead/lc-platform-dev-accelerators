/**
 * Notification Service Interface
 * Provides cloud-agnostic push notification and messaging capabilities
 */

import type {
  NotificationMessage,
  Topic,
  Subscription,
  Protocol,
  EmailParams,
  SMSParams,
} from '../types/notification';

export interface NotificationService {
  /**
   * Create a new notification topic
   * @param name Topic name
   * @returns The created topic
   */
  createTopic(name: string): Promise<Topic>;

  /**
   * Get topic details
   * @param topicArn Topic ARN or name
   * @returns Topic metadata including subscriptions
   */
  getTopic(topicArn: string): Promise<Topic>;

  /**
   * Delete a topic and all its subscriptions
   * @param topicArn Topic ARN or name
   */
  deleteTopic(topicArn: string): Promise<void>;

  /**
   * Publish a message to a topic
   * @param topicArn Topic ARN or name
   * @param message Message to publish
   * @returns Message ID
   */
  publishToTopic(topicArn: string, message: NotificationMessage): Promise<string>;

  /**
   * Subscribe to a topic
   * @param topicArn Topic ARN or name
   * @param protocol Subscription protocol (email, sms, http, etc.)
   * @param endpoint Destination endpoint (email address, phone number, URL)
   * @returns The created subscription
   */
  subscribe(topicArn: string, protocol: Protocol, endpoint: string): Promise<Subscription>;

  /**
   * Unsubscribe from a topic
   * @param subscriptionId Subscription ID
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Confirm a subscription (typically after receiving confirmation message)
   * @param subscriptionId Subscription ID
   * @param token Confirmation token
   */
  confirmSubscription(subscriptionId: string, token: string): Promise<void>;

  /**
   * List all topics
   * @returns Array of topics
   */
  listTopics(): Promise<Topic[]>;

  /**
   * List subscriptions for a topic
   * @param topicArn Topic ARN or name
   * @returns Array of subscriptions
   */
  listSubscriptions(topicArn: string): Promise<Subscription[]>;

  /**
   * Send an email directly (without using topics)
   * @param params Email parameters
   * @returns Message ID
   */
  sendEmail(params: EmailParams): Promise<string>;

  /**
   * Send an SMS message directly (without using topics)
   * @param params SMS parameters
   * @returns Message ID
   */
  sendSMS(params: SMSParams): Promise<string>;
}
