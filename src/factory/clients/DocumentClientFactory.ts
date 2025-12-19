/**
 * Document Client Factory
 * Creates DocumentClient instances based on provider configuration
 */

import type { DocumentClient } from '../../core/clients/DocumentClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockDocumentClient } from '../../providers/mock/clients/MockDocumentClient';
import { AwsDocumentClient } from '../../providers/aws/clients/AwsDocumentClient';

export class DocumentClientFactory extends BaseProviderFactory<DocumentClient> {
  protected createAwsService(config: ProviderConfig): DocumentClient {
    return new AwsDocumentClient(config);
  }

  protected createAzureService(_config: ProviderConfig): DocumentClient {
    throw new Error('Azure DocumentClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): DocumentClient {
    return new MockDocumentClient();
  }
}
