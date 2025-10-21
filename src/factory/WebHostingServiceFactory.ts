/**
 * WebHostingService Factory
 *
 * Creates provider-specific WebHostingService implementations.
 */

import type { ProviderConfig } from '../core/types/common';
import type { WebHostingService } from '../core/services/WebHostingService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockWebHostingService } from '../providers/mock/MockWebHostingService';
import {
  AwsWebHostingService,
  type AwsWebHostingConfig,
} from '../providers/aws/AwsWebHostingService';

export class WebHostingServiceFactory extends BaseProviderFactory<WebHostingService> {
  protected createAwsService(config: ProviderConfig): WebHostingService {
    const awsConfig: AwsWebHostingConfig = {};

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

    return new AwsWebHostingService(awsConfig);
  }

  protected createAzureService(_config: ProviderConfig): WebHostingService {
    // TODO: Implement Azure Container Apps service
    throw new Error('Azure WebHostingService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): WebHostingService {
    return new MockWebHostingService();
  }
}
