/**
 * Cache Service Factory
 * Creates CacheService instances based on provider configuration
 */

import type { CacheService } from '../core/services/CacheService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockCacheService } from '../providers/mock/MockCacheService';

export class CacheServiceFactory extends BaseProviderFactory<CacheService> {
  protected createAwsService(_config: ProviderConfig): CacheService {
    throw new Error('AWS CacheService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): CacheService {
    throw new Error('Azure CacheService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): CacheService {
    return new MockCacheService();
  }
}
