/**
 * Document Store Service Factory
 * Creates DocumentStoreService instances based on provider configuration
 */

import type { DocumentStoreService } from '../core/services/DocumentStoreService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockDocumentStoreService } from '../providers/mock/MockDocumentStoreService';
import { AwsDocumentStoreService } from '../providers/aws/AwsDocumentStoreService';

export class DocumentStoreServiceFactory extends BaseProviderFactory<DocumentStoreService> {
  protected createAwsService(config: ProviderConfig): DocumentStoreService {
    return new AwsDocumentStoreService(config);
  }

  protected createAzureService(_config: ProviderConfig): DocumentStoreService {
    throw new Error('Azure DocumentStoreService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): DocumentStoreService {
    return new MockDocumentStoreService();
  }
}
