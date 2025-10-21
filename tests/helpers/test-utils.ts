/**
 * Test utilities for Bun test framework
 *
 * Provides common helpers for unit, integration, and contract tests
 */

import type { ProviderType } from '../../src/core/types/common';

/**
 * Create a test provider configuration
 */
export function createTestProviderConfig(provider: ProviderType) {
  return {
    provider,
    region: 'us-east-1',
  };
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock timestamp
 */
export function createMockDate(daysAgo = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Assert that a promise rejects with a specific error
 */
export async function assertRejects(
  fn: () => Promise<unknown>,
  expectedError?: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    if (expectedError) {
      const message = error instanceof Error ? error.message : String(error);
      if (typeof expectedError === 'string') {
        if (!message.includes(expectedError)) {
          throw new Error(
            `Expected error message to include "${expectedError}", but got "${message}"`
          );
        }
      } else {
        if (!expectedError.test(message)) {
          throw new Error(`Expected error message to match ${expectedError}, but got "${message}"`);
        }
      }
    }
  }
}

/**
 * Generate random string for test data
 */
export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
