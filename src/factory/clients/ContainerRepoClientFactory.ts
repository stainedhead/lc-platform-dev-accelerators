/**
 * Container Repository Client Factory
 * Creates ContainerRepoClient instances based on provider configuration
 */

import type { ContainerRepoClient } from '../../core/clients/ContainerRepoClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockContainerRepoClient } from '../../providers/mock/clients/MockContainerRepoClient';

export class ContainerRepoClientFactory extends BaseProviderFactory<ContainerRepoClient> {
  protected createAwsService(_config: ProviderConfig): ContainerRepoClient {
    throw new Error('AWS ContainerRepoClient not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): ContainerRepoClient {
    throw new Error('Azure ContainerRepoClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ContainerRepoClient {
    return new MockContainerRepoClient();
  }
}
