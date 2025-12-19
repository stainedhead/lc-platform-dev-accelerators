/**
 * FunctionHostingService Factory
 *
 * Creates provider-specific FunctionHostingService implementations.
 * Constitution Principle I: Provider Independence
 */

import type { ProviderConfig } from '../core/types/common';
import type { FunctionHostingService } from '../core/services/FunctionHostingService';
import { BaseProviderFactory } from './ProviderFactory';
import { MockFunctionHostingService } from '../providers/mock/MockFunctionHostingService';
import {
  AwsFunctionHostingService,
  type AwsFunctionHostingConfig,
} from '../providers/aws/AwsFunctionHostingService';

export class FunctionHostingServiceFactory extends BaseProviderFactory<FunctionHostingService> {
  protected createAwsService(config: ProviderConfig): FunctionHostingService {
    const awsConfig: AwsFunctionHostingConfig = {};

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

    return new AwsFunctionHostingService(awsConfig);
  }

  protected createAzureService(_config: ProviderConfig): FunctionHostingService {
    // TODO: Implement Azure Functions service
    throw new Error('Azure FunctionHostingService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): FunctionHostingService {
    return new MockFunctionHostingService();
  }
}
