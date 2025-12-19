/**
 * Runtime Types - Data Plane Configuration
 *
 * Types for LCAppRuntime - the data plane entry point for hosted applications.
 * Provider-agnostic configuration for runtime client operations.
 *
 * Constitution Principle I: Provider Independence
 */

import type { ProviderType } from './common';

/**
 * Configuration for LCAppRuntime
 * Used by hosted applications to access cloud services at runtime
 */
export interface RuntimeConfig {
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
  /**
   * Additional provider-specific options
   */
  options?: Record<string, unknown>;
}

/**
 * Options for queue send operations
 */
export interface SendOptions {
  delaySeconds?: number;
  messageGroupId?: string;
  messageDeduplicationId?: string;
  attributes?: Record<string, string>;
}

/**
 * Options for queue receive operations
 */
export interface ReceiveOptions {
  maxMessages?: number;
  visibilityTimeout?: number;
  waitTimeSeconds?: number;
}

/**
 * Result of batch send operations
 */
export interface BatchSendResult {
  successful: Array<{
    id: string;
    messageId: string;
  }>;
  failed: Array<{
    id: string;
    code: string;
    message: string;
  }>;
}

/**
 * Options for object list operations
 */
export interface ListOptions {
  maxKeys?: number;
  continuationToken?: string;
  delimiter?: string;
}

/**
 * Result of batch publish operations
 */
export interface BatchPublishResult {
  successful: Array<{
    id: string;
    eventId?: string;
  }>;
  failed: Array<{
    id: string;
    code: string;
    message: string;
  }>;
}
