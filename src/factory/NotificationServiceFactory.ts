/**
 * Notification Service Factory
 * Creates NotificationService instances based on provider configuration
 */

import type { NotificationService } from '../core/services/NotificationService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockNotificationService } from '../providers/mock/MockNotificationService';

export class NotificationServiceFactory extends BaseProviderFactory<NotificationService> {
  protected createAwsService(_config: ProviderConfig): NotificationService {
    throw new Error('AWS NotificationService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): NotificationService {
    throw new Error('Azure NotificationService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): NotificationService {
    return new MockNotificationService();
  }
}
