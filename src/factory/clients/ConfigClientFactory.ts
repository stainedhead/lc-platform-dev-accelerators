/**
 * Config Client Factory
 * Creates ConfigClient instances based on provider configuration
 */

import type { ConfigClient } from '../../core/clients/ConfigClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockConfigClient } from '../../providers/mock/clients/MockConfigClient';
import { AwsConfigClient } from '../../providers/aws/clients/AwsConfigClient';

export class ConfigClientFactory extends BaseProviderFactory<ConfigClient> {
  protected createAwsService(config: ProviderConfig): ConfigClient {
    return new AwsConfigClient(config);
  }

  protected createAzureService(_config: ProviderConfig): ConfigClient {
    throw new Error('Azure ConfigClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ConfigClient {
    return new MockConfigClient();
  }
}
