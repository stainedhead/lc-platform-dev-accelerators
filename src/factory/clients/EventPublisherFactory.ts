/**
 * Event Publisher Factory
 * Creates EventPublisher instances based on provider configuration
 */

import type { EventPublisher } from '../../core/clients/EventPublisher';
import type { ProviderConfig } from '../../core/types/common';
import { BaseProviderFactory } from '../ProviderFactory';
import { MockEventPublisher } from '../../providers/mock/clients/MockEventPublisher';
import { AwsEventPublisher } from '../../providers/aws/clients/AwsEventPublisher';

export class EventPublisherFactory extends BaseProviderFactory<EventPublisher> {
  protected createAwsService(config: ProviderConfig): EventPublisher {
    return new AwsEventPublisher(config);
  }

  protected createAzureService(_config: ProviderConfig): EventPublisher {
    throw new Error('Azure EventPublisher not yet implemented');
  }

  protected createMockService(_config: ProviderConfig): EventPublisher {
    return new MockEventPublisher();
  }
}
