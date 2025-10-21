/**
 * Unit tests for MockNotificationService
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockNotificationService } from '../../../../src/providers/mock/MockNotificationService';
import { Protocol } from '../../../../src/core/types/notification';
import { ResourceNotFoundError } from '../../../../src/core/types/common';

describe('MockNotificationService', () => {
  let service: MockNotificationService;

  beforeEach(() => {
    service = new MockNotificationService();
  });

  describe('Topic Management', () => {
    it('should create a topic', async () => {
      const topic = await service.createTopic('test-topic');

      expect(topic.name).toBe('test-topic');
      expect(topic.arn).toBeDefined();
      expect(topic.subscriptions).toHaveLength(0);
      expect(topic.created).toBeInstanceOf(Date);
    });

    it('should throw error when creating duplicate topic', async () => {
      await service.createTopic('test-topic');

      await expect(service.createTopic('test-topic')).rejects.toThrow(
        'Topic test-topic already exists'
      );
    });

    it('should get a topic', async () => {
      await service.createTopic('test-topic');
      const topic = await service.getTopic('arn:mock:sns:us-east-1:000000000000:test-topic');

      expect(topic.name).toBe('test-topic');
    });

    it('should delete a topic', async () => {
      const created = await service.createTopic('test-topic');
      await service.deleteTopic(created.arn!);

      await expect(service.getTopic(created.arn!)).rejects.toThrow(ResourceNotFoundError);
    });

    it('should list all topics', async () => {
      await service.createTopic('topic1');
      await service.createTopic('topic2');

      const topics = await service.listTopics();

      expect(topics).toHaveLength(2);
      expect(topics.map((t) => t.name).sort()).toEqual(['topic1', 'topic2']);
    });
  });

  describe('Subscriptions', () => {
    let topicArn: string;

    beforeEach(async () => {
      const topic = await service.createTopic('test-topic');
      topicArn = topic.arn!;
    });

    it('should subscribe to a topic with SMS', async () => {
      const subscription = await service.subscribe(topicArn, Protocol.SMS, '+1234567890');

      expect(subscription.id).toBeDefined();
      expect(subscription.protocol).toBe(Protocol.SMS);
      expect(subscription.endpoint).toBe('+1234567890');
      expect(subscription.confirmed).toBe(true); // SMS auto-confirms
    });

    it('should subscribe to a topic with email (pending confirmation)', async () => {
      const subscription = await service.subscribe(
        topicArn,
        Protocol.EMAIL,
        'test@example.com'
      );

      expect(subscription.protocol).toBe(Protocol.EMAIL);
      expect(subscription.endpoint).toBe('test@example.com');
      expect(subscription.confirmed).toBe(false); // Email requires confirmation
    });

    it('should confirm a subscription', async () => {
      const subscription = await service.subscribe(
        topicArn,
        Protocol.EMAIL,
        'test@example.com'
      );

      await service.confirmSubscription(subscription.id, 'mock-token');

      const topic = await service.getTopic(topicArn);
      const confirmedSub = topic.subscriptions.find((s) => s.id === subscription.id);

      expect(confirmedSub?.confirmed).toBe(true);
    });

    it('should unsubscribe from a topic', async () => {
      const subscription = await service.subscribe(topicArn, Protocol.SMS, '+1234567890');

      await service.unsubscribe(subscription.id);

      const topic = await service.getTopic(topicArn);
      expect(topic.subscriptions).toHaveLength(0);
    });

    it('should list subscriptions for a topic', async () => {
      await service.subscribe(topicArn, Protocol.SMS, '+1234567890');
      await service.subscribe(topicArn, Protocol.EMAIL, 'test@example.com');

      const subscriptions = await service.listSubscriptions(topicArn);

      expect(subscriptions).toHaveLength(2);
    });
  });

  describe('Message Publishing', () => {
    let topicArn: string;

    beforeEach(async () => {
      const topic = await service.createTopic('test-topic');
      topicArn = topic.arn!;
    });

    it('should publish a message to a topic', async () => {
      const messageId = await service.publishToTopic(topicArn, {
        subject: 'Test Subject',
        body: 'Test message body',
      });

      expect(messageId).toBeDefined();
      expect(messageId).toContain('mock-msg');
    });

    it('should publish a message with attributes', async () => {
      const messageId = await service.publishToTopic(topicArn, {
        subject: 'Test',
        body: 'Body',
        attributes: {
          priority: 'high',
          category: 'alert',
        },
      });

      expect(messageId).toBeDefined();
    });

    it('should deliver messages to confirmed subscriptions', async () => {
      const subscription = await service.subscribe(topicArn, Protocol.SMS, '+1234567890');

      expect(subscription.confirmed).toBe(true);

      const messageId = await service.publishToTopic(topicArn, {
        subject: 'Test',
        body: 'Message for confirmed subscriber',
      });

      expect(messageId).toBeDefined();
    });
  });

  describe('Direct Messaging', () => {
    it('should send an email directly', async () => {
      const messageId = await service.sendEmail({
        to: ['test@example.com', 'other@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
        html: false,
      });

      expect(messageId).toBeDefined();
      expect(messageId).toContain('mock-email');
    });

    it('should send an HTML email', async () => {
      const messageId = await service.sendEmail({
        to: ['test@example.com'],
        subject: 'HTML Email',
        body: '<h1>Test</h1><p>HTML email body</p>',
        html: true,
      });

      expect(messageId).toBeDefined();
    });

    it('should send an SMS directly', async () => {
      const messageId = await service.sendSMS({
        to: '+1234567890',
        message: 'Test SMS message',
        senderId: 'TestApp',
      });

      expect(messageId).toBeDefined();
      expect(messageId).toContain('mock-sms');
    });

    it('should send SMS without sender ID', async () => {
      const messageId = await service.sendSMS({
        to: '+1234567890',
        message: 'Test SMS without sender',
      });

      expect(messageId).toBeDefined();
    });
  });
});
