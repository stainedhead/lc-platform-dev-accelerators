/**
 * lc-platform-dev-accelerators
 *
 * Cloud-agnostic service wrappers for modern application development.
 * Provides seamless abstraction across AWS, Azure, and GCP.
 *
 * @packageDocumentation
 */

// Main Platform Class
export { LCPlatform } from './LCPlatform';

// Common Types
export type { ProviderConfig } from './core/types/common';
export { ProviderType } from './core/types/common';
export {
  LCPlatformError,
  ResourceNotFoundError,
  ServiceUnavailableError,
  QuotaExceededError,
  ValidationError,
  AuthenticationError,
} from './core/types/common';

// Service Interfaces
export type { WebHostingService } from './core/services/WebHostingService';
export type { DataStoreService } from './core/services/DataStoreService';
export type { ObjectStoreService } from './core/services/ObjectStoreService';
export type { BatchService } from './core/services/BatchService';
export type { SecretsService } from './core/services/SecretsService';
export type { ConfigurationService } from './core/services/ConfigurationService';
export type { DocumentStoreService } from './core/services/DocumentStoreService';
export type { QueueService } from './core/services/QueueService';
export type { EventBusService } from './core/services/EventBusService';
export type { NotificationService } from './core/services/NotificationService';
export type { AuthenticationService } from './core/services/AuthenticationService';

// Service-specific Types
// Deployment types
export type {
  Deployment,
  DeployApplicationParams,
  UpdateApplicationParams,
  ScaleParams,
} from './core/types/deployment';
export { DeploymentStatus } from './core/types/deployment';

// Database types
export type { Transaction, Migration, ExecuteResult, Connection } from './core/types/datastore';
export { IsolationLevel } from './core/types/datastore';

// Object types
export type {
  ObjectData,
  ObjectMetadata,
  ObjectInfo,
  ObjectLocation,
  BucketOptions,
  LifecycleRule,
} from './core/types/object';

// Job types
export type {
  Job,
  JobParams,
  ScheduledJob,
  ScheduleJobParams,
  ListJobsParams,
} from './core/types/job';
export { JobStatus } from './core/types/job';

// Secret types
export type {
  Secret,
  SecretMetadata,
  SecretValue,
  RotationFunction,
  CreateSecretParams,
  UpdateSecretParams,
  RotationConfig,
} from './core/types/secret';

// Configuration types
export type {
  Configuration,
  ConfigurationParams,
  UpdateConfigParams,
  ConfigurationData,
  ValidationResult,
  CreateConfigurationParams,
  UpdateConfigurationParams,
  DeployConfigurationParams,
  ConfigurationProfile,
} from './core/types/configuration';

// Document types
export type {
  Document,
  Collection,
  CollectionOptions,
  IndexDefinition,
  Query,
  QueryOperator,
} from './core/types/document';

// Queue types
export type {
  Message,
  ReceivedMessage,
  Queue,
  QueueOptions,
  QueueAttributes,
  SendMessageParams,
  ReceiveMessageParams,
} from './core/types/queue';

// Event types
export type { Event, EventBus, Rule, EventPattern, Target, RuleParams } from './core/types/event';
export { TargetType } from './core/types/event';

// Notification types
export type {
  NotificationMessage,
  Topic,
  Subscription,
  EmailParams,
  SMSParams,
} from './core/types/notification';
export { Protocol } from './core/types/notification';

// Auth types
export type { TokenSet, TokenClaims, UserInfo, AuthConfig } from './core/types/auth';
