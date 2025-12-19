/**
 * Retry Logic Utility
 *
 * Implements exponential backoff retry strategy for transient failures.
 * Respects Retry-After headers from cloud providers.
 *
 * Based on research.md decision #5: Exponential backoff with 3 attempts default
 */

import { ServiceUnavailableError } from '../core/types/common';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  exponentialBase?: number;
  retryableErrors?: string[];
}

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  nextDelayMs: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  exponentialBase: 2,
  retryableErrors: [
    'SERVICE_UNAVAILABLE',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'THROTTLING',
    'TOO_MANY_REQUESTS',
  ],
};

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if we've exhausted attempts
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = calculateBackoff(attempt, opts);

      // Check for Retry-After header (if error has it)
      const retryAfter = getRetryAfter(lastError);
      const finalDelay = retryAfter !== null ? retryAfter * 1000 : delay;

      // Wait before retrying
      await sleep(finalDelay);
    }
  }

  // All retries exhausted
  throw (
    lastError ??
    new ServiceUnavailableError('Unknown service', {
      maxRetries: opts.maxRetries,
    })
  );
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.baseDelayMs * Math.pow(options.exponentialBase, attempt);
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Check if an error should be retried
 */
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  // Check error code
  const errorCode = (error as { code?: string }).code;
  if (errorCode !== null && errorCode !== undefined && retryableErrors.includes(errorCode)) {
    return true;
  }

  // Check error message for retryable patterns
  const message = error.message;
  if (message === null || message === undefined || message === '') {
    return false;
  }
  return retryableErrors.some((pattern) => message.toUpperCase().includes(pattern));
}

/**
 * Extract Retry-After header from error (if present)
 * Returns null if not found, or the number of seconds to wait
 */
function getRetryAfter(error: Error): number | null {
  const retryAfter = (error as { retryAfter?: string | number }).retryAfter;

  if (retryAfter === undefined) {
    return null;
  }

  if (typeof retryAfter === 'number') {
    return retryAfter;
  }

  if (typeof retryAfter === 'string') {
    const parsed = parseInt(retryAfter, 10);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorator for class methods
 * Usage: @retry({ maxRetries: 5 })
 */
export function retry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      return retryWithBackoff(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Convenient alias for retryWithBackoff
 */
export const withRetry = retryWithBackoff;
