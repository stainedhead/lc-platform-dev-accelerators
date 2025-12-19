/**
 * Queue Client Factory
 * Creates QueueClient instances based on provider configuration
 */

import type { QueueClient } from '../../core/clients/QueueClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockQueueClient } from '../../providers/mock/clients/MockQueueClient';
import { AwsQueueClient } from '../../providers/aws/clients/AwsQueueClient';

export class QueueClientFactory extends BaseProviderFactory<QueueClient> {
  protected createAwsService(config: ProviderConfig): QueueClient {
    return new AwsQueueClient(config);
  }

  protected createAzureService(_config: ProviderConfig): QueueClient {
    throw new Error('Azure QueueClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): QueueClient {
    return new MockQueueClient();
  }
}
