/**
 * lc-platform-dev-accelerators
 *
 * Cloud-agnostic service wrappers for modern application development.
 * Provides seamless abstraction across AWS, Azure, and GCP.
 *
 * @packageDocumentation
 */

// Main Platform Class (Control Plane)
export { LCPlatform } from './LCPlatform';

// Runtime Class (Data Plane)
export { LCAppRuntime } from './LCAppRuntime';

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
export type { FunctionHostingService } from './core/services/FunctionHostingService';
export type { CacheService } from './core/services/CacheService';
export type { ContainerRepoService } from './core/services/ContainerRepoService';

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

// Function types
export type {
  ServerlessFunction,
  CreateFunctionParams,
  FunctionCode,
  UpdateFunctionParams,
  UpdateFunctionCodeParams,
  InvokeFunctionParams,
  InvocationResult,
  ListFunctionsParams,
  ListFunctionsResult,
  EventSourceMapping,
  CreateEventSourceParams,
  FunctionUrl,
  FunctionUrlParams,
  FunctionUrlCors,
} from './core/types/function';
export {
  FunctionStatus,
  FunctionRuntime,
  InvocationType,
  EventSourceType,
  FunctionUrlAuthType,
} from './core/types/function';

// Cache types
export type {
  CacheCluster,
  CacheClusterOptions,
  CacheClusterUpdateParams,
  CacheSecurityConfig,
} from './core/types/cache';
export { ClusterStatus } from './core/types/cache';

// Container types
export type {
  ContainerRepository,
  ContainerRepositoryOptions,
  ContainerImage,
  ContainerImageDetail,
  LifecyclePolicy,
  ImageScanConfig,
  RepositoryPermission,
  ImageListOptions,
  ImageFilter,
} from './core/types/container';
export {
  EncryptionType,
  TagStatus,
  CountType,
  ScanStatus,
  RepositoryAction,
} from './core/types/container';

// Runtime Types (Data Plane)
export type {
  RuntimeConfig,
  SendOptions,
  ReceiveOptions,
  BatchSendResult,
  ListOptions,
  BatchPublishResult,
  CacheSetOptions,
  CacheGetResult,
  BatchCacheResult,
  BatchDeleteImagesResult,
} from './core/types/runtime';

// Data Plane Client Interfaces
export type { QueueClient } from './core/clients/QueueClient';
export type { ObjectClient } from './core/clients/ObjectClient';
export type { SecretsClient } from './core/clients/SecretsClient';
export type { ConfigClient } from './core/clients/ConfigClient';
export type { EventPublisher } from './core/clients/EventPublisher';
export type { NotificationClient } from './core/clients/NotificationClient';
export type { DocumentClient } from './core/clients/DocumentClient';
export type { DataClient } from './core/clients/DataClient';
export type { AuthClient } from './core/clients/AuthClient';
export type { CacheClient } from './core/clients/CacheClient';
export type { ContainerRepoClient } from './core/clients/ContainerRepoClient';

// Client Factories (Data Plane)
export { QueueClientFactory } from './factory/clients/QueueClientFactory';
export { ObjectClientFactory } from './factory/clients/ObjectClientFactory';
export { SecretsClientFactory } from './factory/clients/SecretsClientFactory';
export { ConfigClientFactory } from './factory/clients/ConfigClientFactory';
export { EventPublisherFactory } from './factory/clients/EventPublisherFactory';
export { NotificationClientFactory } from './factory/clients/NotificationClientFactory';
export { DocumentClientFactory } from './factory/clients/DocumentClientFactory';
export { DataClientFactory } from './factory/clients/DataClientFactory';
export { AuthClientFactory } from './factory/clients/AuthClientFactory';
export { CacheClientFactory } from './factory/clients/CacheClientFactory';
export { ContainerRepoClientFactory } from './factory/clients/ContainerRepoClientFactory';
