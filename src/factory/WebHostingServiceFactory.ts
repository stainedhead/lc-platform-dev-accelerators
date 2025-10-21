/**
 * WebHostingService Factory
 *
 * Creates provider-specific WebHostingService implementations.
 */

import type { ProviderConfig } from '../core/types/common';
import type { WebHostingService } from '../core/services/WebHostingService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockWebHostingService } from '../providers/mock/MockWebHostingService';
import { AwsWebHostingService } from '../providers/aws/AwsWebHostingService';

export class WebHostingServiceFactory extends BaseProviderFactory<WebHostingService> {
  protected createAwsService(config: ProviderConfig): WebHostingService {
    const awsConfig: any = {
      region: config.region,
    };

    if (config.credentials) {
      awsConfig.credentials = config.credentials;
    }

    if (config.options?.endpoint) {
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
