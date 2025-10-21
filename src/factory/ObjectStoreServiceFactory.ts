/**
 * ObjectStoreService Factory
 */

import type { ProviderConfig } from '../core/types/common';
import type { ObjectStoreService } from '../core/services/ObjectStoreService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockObjectStoreService } from '../providers/mock/MockObjectStoreService';
import { AwsObjectStoreService } from '../providers/aws/AwsObjectStoreService';

export class ObjectStoreServiceFactory extends BaseProviderFactory<ObjectStoreService> {
  protected createAwsService(config: ProviderConfig): ObjectStoreService {
    const awsConfig: any = {
      region: config.region,
    };

    if (config.credentials) {
      awsConfig.credentials = config.credentials;
    }

    if (config.options?.endpoint) {
      awsConfig.endpoint = String(config.options.endpoint);
    }

    if (config.options?.forcePathStyle !== undefined) {
      awsConfig.forcePathStyle = Boolean(config.options.forcePathStyle);
    }

    return new AwsObjectStoreService(awsConfig);
  }

  protected createAzureService(_config: ProviderConfig): ObjectStoreService {
    throw new Error('Azure ObjectStoreService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): ObjectStoreService {
    return new MockObjectStoreService();
  }
}
