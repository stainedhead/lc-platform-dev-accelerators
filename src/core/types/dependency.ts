/**
 * Dependency Types for LCPlatform Dependency Management
 *
 * This module defines types for cloud service dependencies.
 * Following Constitution Principle I: Provider Independence - no cloud-specific types.
 */

/**
 * Supported cloud service types
 */
export enum DependencyType {
  OBJECT_STORE = 'object-store',
  QUEUE = 'queue',
  SECRETS = 'secrets',
  CONFIGURATION = 'configuration',
  DATA_STORE = 'data-store',
  DOCUMENT_STORE = 'document-store',
  EVENT_BUS = 'event-bus',
  NOTIFICATION = 'notification',
  CACHE = 'cache',
  WEB_HOSTING = 'web-hosting',
  FUNCTION_HOSTING = 'function-hosting',
  BATCH = 'batch',
  AUTHENTICATION = 'authentication',
  CONTAINER_REPO = 'container-repo',
}

/**
 * Dependency lifecycle status
 */
export enum DependencyStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  UPDATING = 'updating',
  DELETING = 'deleting',
}

/**
 * Error codes for dependency operations
 */
export enum DependencyErrorCode {
  VALIDATION_FAILED = 'validation_failed',
  NAME_COLLISION = 'name_collision',
  DUPLICATE_NAME = 'duplicate_name',
  DUPLICATE_RESOURCE_NAME = 'duplicate_resource_name',
  INVALID_CONFIGURATION = 'invalid_configuration',
  INVALID_POLICY = 'invalid_policy',
  DEPLOYMENT_FAILED = 'deployment_failed',
  PERSISTENCE_FAILED = 'persistence_failed',
  NOT_FOUND = 'not_found',
  ALREADY_EXISTS = 'already_exists',
  INVALID_STATE_TRANSITION = 'invalid_state_transition',
}

/**
 * Dependency error with code and details
 */
export interface DependencyError {
  code: DependencyErrorCode;
  message: string;
  details?: Record<string, unknown>;
  dependencyId?: string;
  appId?: string;
}

/**
 * Encryption types for storage services
 */
export enum EncryptionType {
  NONE = 'none',
  AES256 = 'aes256',
  KMS = 'kms',
}

/**
 * Lifecycle rule for object storage
 */
export interface LifecycleRule {
  id: string;
  enabled: boolean;
  prefix?: string;
  expirationDays?: number;
  transitionToArchiveDays?: number;
}

/**
 * Object Store configuration
 */
export interface ObjectStoreConfiguration {
  type: 'object-store';
  bucketName?: string;
  versioning: boolean;
  encryption: EncryptionType;
  publicAccess: boolean;
  lifecycleRules?: LifecycleRule[];
  tags?: Record<string, string>;
}

/**
 * Queue configuration
 */
export interface QueueConfiguration {
  type: 'queue';
  queueName?: string;
  fifo: boolean;
  visibilityTimeout: number;
  messageRetention: number;
  maxReceiveCount?: number;
  deadLetterQueue?: string;
  encryption: boolean;
}

/**
 * Secrets configuration
 */
export interface SecretsConfiguration {
  type: 'secrets';
  secretName: string;
  description?: string;
  rotationEnabled?: boolean;
  rotationDays?: number;
}

/**
 * Data Store (database) configuration
 */
export interface DataStoreConfiguration {
  type: 'data-store';
  engine: 'postgres' | 'mysql' | 'mariadb';
  engineVersion?: string;
  instanceClass: string;
  allocatedStorage: number;
  multiAZ?: boolean;
  backupRetention?: number;
  encrypted?: boolean;
}

/**
 * Union type for all dependency configurations
 */
export type DependencyConfiguration =
  | ObjectStoreConfiguration
  | QueueConfiguration
  | SecretsConfiguration
  | DataStoreConfiguration;

/**
 * Policy document (cloud-agnostic wrapper)
 */
export interface PolicyDocument {
  version: string;
  provider: 'aws' | 'azure' | 'gcp';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application Dependency
 */
export interface ApplicationDependency {
  readonly id: string;
  name: string;
  type: DependencyType;
  status: DependencyStatus;
  configuration: DependencyConfiguration;
  policy?: PolicyDocument;
  generatedName?: string;
  deployedAt?: Date;
  deployedBy?: string;
  deploymentError?: string;
  readonly createdAt: Date;
  updatedAt: Date;
}
