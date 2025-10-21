/**
 * Document Store Service Factory
 * Creates DocumentStoreService instances based on provider configuration
 */

import type { DocumentStoreService } from '../core/services/DocumentStoreService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockDocumentStoreService } from '../providers/mock/MockDocumentStoreService';

export class DocumentStoreServiceFactory extends BaseProviderFactory<DocumentStoreService> {
  protected createAwsService(_config: ProviderConfig): DocumentStoreService {
    throw new Error('AWS DocumentStoreService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): DocumentStoreService {
    throw new Error('Azure DocumentStoreService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): DocumentStoreService {
    return new MockDocumentStoreService();
  }
}
