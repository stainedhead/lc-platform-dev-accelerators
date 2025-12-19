/**
 * Notification Client Factory
 * Creates NotificationClient instances based on provider configuration
 */

import type { NotificationClient } from '../../core/clients/NotificationClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockNotificationClient } from '../../providers/mock/clients/MockNotificationClient';
import { AwsNotificationClient } from '../../providers/aws/clients/AwsNotificationClient';

export class NotificationClientFactory extends BaseProviderFactory<NotificationClient> {
  protected createAwsService(config: ProviderConfig): NotificationClient {
    return new AwsNotificationClient(config);
  }

  protected createAzureService(_config: ProviderConfig): NotificationClient {
    throw new Error('Azure NotificationClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): NotificationClient {
    return new MockNotificationClient();
  }
}
