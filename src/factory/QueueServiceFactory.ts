/**
 * Queue Service Factory
 * Creates QueueService instances based on provider configuration
 */

import type { QueueService } from '../core/services/QueueService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockQueueService } from '../providers/mock/MockQueueService';

export class QueueServiceFactory extends BaseProviderFactory<QueueService> {
  protected createAwsService(_config: ProviderConfig): QueueService {
    throw new Error('AWS QueueService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): QueueService {
    throw new Error('Azure QueueService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): QueueService {
    return new MockQueueService();
  }
}
