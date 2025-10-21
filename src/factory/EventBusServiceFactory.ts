/**
 * Event Bus Service Factory
 * Creates EventBusService instances based on provider configuration
 */

import type { EventBusService } from '../core/services/EventBusService';
import type { ProviderConfig } from '../core/types/common';
import { BaseProviderFactory } from './ProviderFactory';
import { MockEventBusService } from '../providers/mock/MockEventBusService';
import { AwsEventBusService } from '../providers/aws/AwsEventBusService';

export class EventBusServiceFactory extends BaseProviderFactory<EventBusService> {
  protected createAwsService(config: ProviderConfig): EventBusService {
    return new AwsEventBusService(config);
  }

  protected createAzureService(_config: ProviderConfig): EventBusService {
    throw new Error('Azure EventBusService not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): EventBusService {
    return new MockEventBusService();
  }
}
