/**
 * Secrets Client Factory
 * Creates SecretsClient instances based on provider configuration
 */

import type { SecretsClient } from '../../core/clients/SecretsClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockSecretsClient } from '../../providers/mock/clients/MockSecretsClient';
import { AwsSecretsClient } from '../../providers/aws/clients/AwsSecretsClient';

export class SecretsClientFactory extends BaseProviderFactory<SecretsClient> {
  protected createAwsService(config: ProviderConfig): SecretsClient {
    return new AwsSecretsClient(config);
  }

  protected createAzureService(_config: ProviderConfig): SecretsClient {
    throw new Error('Azure SecretsClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): SecretsClient {
    return new MockSecretsClient();
  }
}
