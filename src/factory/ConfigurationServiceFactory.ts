/**
 * Configuration Service Factory
 * Creates ConfigurationService instances based on provider configuration
 */

import type { ConfigurationService } from '../core/services/ConfigurationService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockConfigurationService } from '../providers/mock/MockConfigurationService';
import { AwsConfigurationService } from '../providers/aws/AwsConfigurationService';

export class ConfigurationServiceFactory extends BaseProviderFactory<ConfigurationService> {
  protected createAwsService(config: ProviderConfig): ConfigurationService {
    return new AwsConfigurationService(config);
  }

  protected createAzureService(_config: ProviderConfig): ConfigurationService {
    throw new Error('Azure ConfigurationService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ConfigurationService {
    return new MockConfigurationService();
  }
}
