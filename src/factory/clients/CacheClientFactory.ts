/**
 * Cache Client Factory
 * Creates CacheClient instances based on provider configuration
 */

import type { CacheClient } from '../../core/clients/CacheClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockCacheClient } from '../../providers/mock/clients/MockCacheClient';

export class CacheClientFactory extends BaseProviderFactory<CacheClient> {
  protected createAwsService(_config: ProviderConfig): CacheClient {
    throw new Error('AWS CacheClient not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): CacheClient {
    throw new Error('Azure CacheClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): CacheClient {
    return new MockCacheClient();
  }
}
