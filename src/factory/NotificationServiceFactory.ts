/**
 * Notification Service Factory
 * Creates NotificationService instances based on provider configuration
 */

import type { NotificationService } from '../core/services/NotificationService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockNotificationService } from '../providers/mock/MockNotificationService';
import { AwsNotificationService } from '../providers/aws/AwsNotificationService';

export class NotificationServiceFactory extends BaseProviderFactory<NotificationService> {
  protected createAwsService(config: ProviderConfig): NotificationService {
    return new AwsNotificationService(config);
  }

  protected createAzureService(_config: ProviderConfig): NotificationService {
    throw new Error('Azure NotificationService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): NotificationService {
    return new MockNotificationService();
  }
}
