/**
 * Batch Service Factory
 * Creates BatchService instances based on provider configuration
 */

import type { BatchService } from '../core/services/BatchService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockBatchService } from '../providers/mock/MockBatchService';
import { AwsBatchService } from '../providers/aws/AwsBatchService';

export class BatchServiceFactory extends BaseProviderFactory<BatchService> {
  protected createAwsService(config: ProviderConfig): BatchService {
    return new AwsBatchService(config);
  }

  protected createAzureService(_config: ProviderConfig): BatchService {
    throw new Error('Azure BatchService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): BatchService {
    return new MockBatchService();
  }
}
