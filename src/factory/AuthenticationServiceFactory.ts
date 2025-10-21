/**
 * Authentication Service Factory
 * Creates AuthenticationService instances based on provider configuration
 */

import type { AuthenticationService } from '../core/services/AuthenticationService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockAuthenticationService } from '../providers/mock/MockAuthenticationService';

export class AuthenticationServiceFactory extends BaseProviderFactory<AuthenticationService> {
  protected createAwsService(_config: ProviderConfig): AuthenticationService {
    throw new Error('AWS AuthenticationService not yet implemented');
  }

  protected createAzureService(_config: ProviderConfig): AuthenticationService {
    throw new Error('Azure AuthenticationService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): AuthenticationService {
    return new MockAuthenticationService();
  }
}
