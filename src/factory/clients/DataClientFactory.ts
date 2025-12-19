/**
 * Data Client Factory
 * Creates DataClient instances based on provider configuration
 */

import type { DataClient } from '../../core/clients/DataClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockDataClient } from '../../providers/mock/clients/MockDataClient';
import { AwsDataClient } from '../../providers/aws/clients/AwsDataClient';

export class DataClientFactory extends BaseProviderFactory<DataClient> {
  protected createAwsService(config: ProviderConfig): DataClient {
    return new AwsDataClient(config);
  }

  protected createAzureService(_config: ProviderConfig): DataClient {
    throw new Error('Azure DataClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): DataClient {
    return new MockDataClient();
  }
}
