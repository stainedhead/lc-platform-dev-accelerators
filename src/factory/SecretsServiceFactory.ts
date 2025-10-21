/**
 * Secrets Service Factory
 * Creates SecretsService instances based on provider configuration
 */

import type { SecretsService } from '../core/services/SecretsService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockSecretsService } from '../providers/mock/MockSecretsService';
import { AwsSecretsService } from '../providers/aws/AwsSecretsService';

export class SecretsServiceFactory extends BaseProviderFactory<SecretsService> {
  protected createAwsService(config: ProviderConfig): SecretsService {
    return new AwsSecretsService(config);
  }

  protected createAzureService(_config: ProviderConfig): SecretsService {
    throw new Error('Azure SecretsService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): SecretsService {
    return new MockSecretsService();
  }
}
