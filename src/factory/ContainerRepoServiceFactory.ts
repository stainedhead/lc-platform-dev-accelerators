/**
 * Container Repository Service Factory
 * Creates ContainerRepoService instances based on provider configuration
 */

import type { ContainerRepoService } from '../core/services/ContainerRepoService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockContainerRepoService } from '../providers/mock/MockContainerRepoService';

export class ContainerRepoServiceFactory extends BaseProviderFactory<ContainerRepoService> {
  protected createAwsService(_config: ProviderConfig): ContainerRepoService {
    throw new Error('AWS ContainerRepoService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): ContainerRepoService {
    throw new Error('Azure ContainerRepoService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ContainerRepoService {
    return new MockContainerRepoService();
  }
}
