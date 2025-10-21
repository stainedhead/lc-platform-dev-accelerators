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
      case 'aws':
        return this.createAwsService(config);
      case 'azure':
        return this.createAzureService(config);
      case 'mock':
        return this.createMockService(config);
      default:
        throw new ValidationError(
          `Unknown provider: ${String(config.provider)}`,
          { provider: config.provider }
        );
    }
  }
}

/**
 * Helper function to validate provider configuration
 */
export function validateProviderConfig(config: ProviderConfig): void {
  if (!config.provider) {
    throw new ValidationError('Provider type is required');
  }

  const validProviders: ProviderType[] = [
    ProviderType.AWS,
    ProviderType.AZURE,
    ProviderType.MOCK,
  ];
  if (!validProviders.includes(config.provider)) {
    throw new ValidationError(`Invalid provider: ${config.provider}`, {
      validProviders,
    });
  }

  // For AWS and Azure, region is recommended (but not required for workload identity)
  if ((config.provider === 'aws' || config.provider === 'azure') && !config.region) {
    console.warn(
      `Warning: No region specified for provider ${config.provider}. Using provider defaults.`
    );
  }
}
