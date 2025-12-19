/**
 * Auth Client Factory
 * Creates AuthClient instances based on provider configuration
 */

import type { AuthClient } from '../../core/clients/AuthClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockAuthClient } from '../../providers/mock/clients/MockAuthClient';
import { AwsAuthClient } from '../../providers/aws/clients/AwsAuthClient';

export class AuthClientFactory extends BaseProviderFactory<AuthClient> {
  protected createAwsService(config: ProviderConfig): AuthClient {
    return new AwsAuthClient(config);
  }

  protected createAzureService(_config: ProviderConfig): AuthClient {
    throw new Error('Azure AuthClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): AuthClient {
    return new MockAuthClient();
  }
}
