/**
 * Common types used across all services
 *
 * These types are provider-agnostic and contain NO cloud-specific concepts.
 * Constitution Principle I: Provider Independence
 */

export enum ProviderType {
  AWS = 'aws',
  AZURE = 'azure',
  MOCK = 'mock',
}

export interface ProviderConfig {
  provider: ProviderType;
  region?: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  /**
   * Optional endpoint override for testing (e.g., LocalStack)
   */
  endpoint?: string;
  options?: Record<string, unknown>;
}

/**
 * Base error class for all LCPlatform errors
 * Extends Error with additional metadata for better error handling
 */
export class LCPlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LCPlatformError';
    Object.setPrototypeOf(this, LCPlatformError.prototype);
  }
}

/**
 * Error hierarchy for specific error types
 */

export class ResourceNotFoundError extends LCPlatformError {
  constructor(resource: string, identifier: string, details?: Record<string, unknown>) {
    super(
      `Resource not found: ${resource} with identifier ${identifier}`,
      'RESOURCE_NOT_FOUND',
      false,
      details
    );
    this.name = 'ResourceNotFoundError';
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

export class ServiceUnavailableError extends LCPlatformError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Service temporarily unavailable: ${service}`, 'SERVICE_UNAVAILABLE', true, details);
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

export class QuotaExceededError extends LCPlatformError {
  constructor(resource: string, limit: number, details?: Record<string, unknown>) {
    super(`Quota exceeded for ${resource}: limit ${limit}`, 'QUOTA_EXCEEDED', false, details);
    this.name = 'QuotaExceededError';
    Object.setPrototypeOf(this, QuotaExceededError.prototype);
  }
}

export class ValidationError extends LCPlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', false, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends LCPlatformError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', false, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
