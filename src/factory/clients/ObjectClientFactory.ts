/**
 * Object Client Factory
 * Creates ObjectClient instances based on provider configuration
 */

import type { ObjectClient } from '../../core/clients/ObjectClient';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockObjectClient } from '../../providers/mock/clients/MockObjectClient';
import { AwsObjectClient } from '../../providers/aws/clients/AwsObjectClient';

export class ObjectClientFactory extends BaseProviderFactory<ObjectClient> {
  protected createAwsService(config: ProviderConfig): ObjectClient {
    return new AwsObjectClient(config);
  }

  protected createAzureService(_config: ProviderConfig): ObjectClient {
    throw new Error('Azure ObjectClient not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ObjectClient {
    return new MockObjectClient();
  }
}
