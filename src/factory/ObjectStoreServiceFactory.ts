/**
 * ObjectStoreService Factory
 */

import type { ProviderConfig } from '../core/types/common';
import type { ObjectStoreService } from '../core/services/ObjectStoreService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockObjectStoreService } from '../providers/mock/MockObjectStoreService';
import {
  AwsObjectStoreService,
  type AwsObjectStoreConfig,
} from '../providers/aws/AwsObjectStoreService';

export class ObjectStoreServiceFactory extends BaseProviderFactory<ObjectStoreService> {
  protected createAwsService(config: ProviderConfig): ObjectStoreService {
    const awsConfig: AwsObjectStoreConfig = {};

    if (config.region !== undefined && config.region !== null) {
      awsConfig.region = config.region;
    }

    if (config.credentials !== undefined && config.credentials !== null) {
      const { accessKeyId, secretAccessKey } = config.credentials;
      if (accessKeyId !== undefined && secretAccessKey !== undefined) {
        awsConfig.credentials = { accessKeyId, secretAccessKey };
      }
    }

    if (config.options?.endpoint !== undefined && config.options.endpoint !== null) {
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
