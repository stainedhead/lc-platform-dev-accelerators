/**
 * Provider Factory
 *
 * Implements the Factory pattern for creating provider-specific service implementations.
 * This is the core of the hexagonal architecture - it maps provider types to concrete implementations.
 *
 * Constitution Principle I: Provider Independence
 * - Provides runtime selection of cloud providers
 * - Isolates provider-specific code from application logic
 */

import type { ProviderConfig } from '../core/types/common';
import { ProviderType, ValidationError } from '../core/types/common';

export interface ServiceFactory<T> {
  create(config: ProviderConfig): T;
}

/**
 * Base provider factory
 * Each service will extend this to provide provider-specific implementations
 */
export abstract class BaseProviderFactory<T> implements ServiceFactory<T> {
  protected abstract createAwsService(config: ProviderConfig): T;
  protected abstract createAzureService(config: ProviderConfig): T;
  protected abstract createMockService(config: ProviderConfig): T;

  public create(config: ProviderConfig): T {
    switch (config.provider) {
      case ProviderType.AWS:
        return this.createAwsService(config);
      case ProviderType.AZURE:
        return this.createAzureService(config);
      case ProviderType.MOCK:
        return this.createMockService(config);
      default:
        throw new ValidationError(`Unknown provider: ${String(config.provider)}`, {
          provider: config.provider,
        });
    }
  }
}

/**
 * Helper function to validate provider configuration
 */
export function validateProviderConfig(config: ProviderConfig): void {
  if (config.provider === undefined || config.provider === null) {
    throw new ValidationError('Provider type is required');
  }

  const validProviders: ProviderType[] = [ProviderType.AWS, ProviderType.AZURE, ProviderType.MOCK];
  if (!validProviders.includes(config.provider)) {
    throw new ValidationError(`Invalid provider: ${config.provider}`, {
      validProviders,
    });
  }

  // For AWS and Azure, region is recommended (but not required for workload identity)
  if (
    (config.provider === ProviderType.AWS || config.provider === ProviderType.AZURE) &&
    (config.region === undefined || config.region === null || config.region === '')
  ) {
    console.warn(
      `Warning: No region specified for provider ${config.provider}. Using provider defaults.`
    );
  }
}
