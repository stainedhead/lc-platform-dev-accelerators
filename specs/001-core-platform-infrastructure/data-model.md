# Data Model: Cloud-Agnostic Service Layer

**Feature**: 001-core-platform-infrastructure
**Date**: 2025-10-20
**Phase**: 1 - Design

## Overview

This document defines the core data entities and types for the 11 cloud-agnostic service interfaces. All types are provider-agnostic and use only TypeScript primitives and standard library types.

## Core Domain Entities

### 1. Deployment (Web Hosting Service)

Represents a deployed web application instance.

```typescript
interface Deployment {
  id: string;                    // Unique deployment identifier
  name: string;                  // Application name
  url: string;                   // Public URL for accessing the application
  status: DeploymentStatus;      // Current deployment state
  image: string;                 // Application image reference
  cpu: number;                   // Allocated vCPUs
  memory: number;                // Allocated memory in MB
  minInstances: number;          // Minimum scaling instances
  maxInstances: number;          // Maximum scaling instances
  currentInstances: number;      // Currently running instances
  created: Date;                 // Deployment creation time
  lastUpdated: Date;             // Last modification time
  environment: Record<string, string>; // Environment variables
}

enum DeploymentStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  UPDATING = 'updating',
  DELETING = 'deleting',
  FAILED = 'failed',
  STOPPED = 'stopped'
}
```

**Validation Rules**:
- `name`: Must be 1-64 characters, alphanumeric + hyphens only
- `cpu`: Must be positive number (0.25, 0.5, 1, 2, 4)
- `memory`: Must be positive number in MB (512, 1024, 2048, 4096, 8192)
- `minInstances`: Must be >= 1, <= maxInstances
- `maxInstances`: Must be >= minInstances

**State Transitions**:
```
CREATING → RUNNING | FAILED
RUNNING → UPDATING | DELETING | STOPPED
UPDATING → RUNNING | FAILED
DELETING → (deleted, no final state)
FAILED → DELETING
STOPPED → RUNNING | DELETING
```

### 2. Job (Batch Processing Service)

Represents a batch job execution.

```typescript
interface Job {
  id: string;                    // Unique job identifier
  name: string;                  // Job name
  status: JobStatus;             // Current job state
  image: string;                 // Job executable image
  command?: string[];            // Command to execute
  environment: Record<string, string>; // Environment variables
  cpu: number;                   // Allocated vCPUs
  memory: number;                // Allocated memory in MB
  timeout: number;               // Timeout in seconds
  retryCount: number;            // Max retry attempts
  attemptsMade: number;          // Attempts executed so far
  created: Date;                 // Job creation time
  started?: Date;                // Job start time
  completed?: Date;              // Job completion time
  exitCode?: number;             // Process exit code
  errorMessage?: string;         // Error details if failed
}

enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

interface ScheduledJob extends Job {
  schedule: string;              // Cron expression
  nextRun: Date;                 // Next scheduled execution
  lastRun?: Date;                // Last execution time
  enabled: boolean;              // Whether schedule is active
}
```

**Validation Rules**:
- `name`: Must be 1-128 characters
- `timeout`: Must be > 0, recommended max 86400 seconds (24 hours)
- `retryCount`: Must be >= 0, <= 10
- `schedule`: Must be valid cron expression (for ScheduledJob)

**State Transitions**:
```
PENDING → RUNNING | CANCELLED
RUNNING → SUCCEEDED | FAILED | TIMEOUT
FAILED → PENDING (if retryCount not exceeded)
```

### 3. Secret (Secrets Management Service)

Represents securely stored sensitive data.

```typescript
interface Secret {
  name: string;                  // Secret identifier
  version: string;               // Current version identifier
  created: Date;                 // Creation timestamp
  lastModified: Date;            // Last update timestamp
  lastRotated?: Date;            // Last rotation timestamp
  rotationEnabled: boolean;      // Whether auto-rotation is enabled
  rotationDays?: number;         // Rotation interval in days
}

interface SecretMetadata {
  name: string;
  version: string;
  created: Date;
  lastModified: Date;
  // Value not included in metadata (security)
}

type SecretValue = string | object; // String or JSON object
```

**Validation Rules**:
- `name`: Must be 1-512 characters, path-like format recommended (e.g., `db/prod/password`)
- `value`: Max 65536 bytes when serialized
- `rotationDays`: If specified, must be >= 1

**Security Constraints**:
- Secret values never logged or included in error messages
- Metadata operations don't expose secret values
- Soft delete with recovery period (not immediate permanent deletion)

### 4. Configuration (Configuration Service)

Represents application configuration data.

```typescript
interface Configuration {
  application: string;           // Application identifier
  environment: string;           // Environment (dev, staging, prod)
  version: string;               // Configuration version
  data: Record<string, any>;     // Configuration key-value pairs
  schema?: object;               // JSON schema for validation
  description?: string;          // Version description
  created: Date;                 // Creation timestamp
  deployed: boolean;             // Whether actively deployed
}

interface ConfigurationData {
  [key: string]: string | number | boolean | object | null;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;                  // JSON path to invalid field
  message: string;               // Error description
  expected: string;              // Expected type/format
  actual: string;                // Actual value received
}
```

**Validation Rules**:
- `application`: Must be 1-128 characters, lowercase alphanumeric + hyphens
- `environment`: Must be 1-64 characters, lowercase alphanumeric
- `data`: Max 64KB when serialized
- `schema`: Must be valid JSON Schema (if provided)

**Versioning**:
- Immutable versions (cannot edit deployed configuration)
- Rollback by deploying previous version
- Version identifiers are UUIDs

### 5. Document (Document Store Service)

Represents a JSON document in a collection.

```typescript
interface Document<T = any> {
  _id: string;                   // Document unique identifier
  [key: string]: T;              // Document fields (flexible schema)
}

interface Collection {
  name: string;                  // Collection identifier
  indexes: IndexDefinition[];    // Configured indexes
  documentCount: number;         // Number of documents
  ttl?: number;                  // TTL in seconds (auto-deletion)
}

interface IndexDefinition {
  field: string;                 // Field to index
  unique?: boolean;              // Whether values must be unique
  sparse?: boolean;              // Whether to index null values
}

interface Query {
  [field: string]: any | QueryOperator;
}

interface QueryOperator {
  $eq?: any;                     // Equals
  $ne?: any;                     // Not equals
  $gt?: number | Date;           // Greater than
  $gte?: number | Date;          // Greater than or equal
  $lt?: number | Date;           // Less than
  $lte?: number | Date;          // Less than or equal
  $in?: any[];                   // Value in array
  $nin?: any[];                  // Value not in array
}
```

**Validation Rules**:
- `_id`: Generated by system if not provided, must be unique
- Collection `name`: Must be 1-64 characters, alphanumeric + underscores
- Document size: Max 16MB
- Index field depth: Max 5 levels (e.g., `user.address.city.name.value`)

### 6. Query and Transaction (Relational Database Service)

```typescript
interface Transaction {
  id: string;                    // Transaction identifier
  isolationLevel: IsolationLevel;
  startedAt: Date;
  active: boolean;
}

enum IsolationLevel {
  READ_UNCOMMITTED = 'read_uncommitted',
  READ_COMMITTED = 'read_committed',
  REPEATABLE_READ = 'repeatable_read',
  SERIALIZABLE = 'serializable'
}

interface ExecuteResult {
  rowsAffected: number;
  insertId?: string | number;   // For INSERT operations
}

interface Migration {
  version: string;               // Migration version (semver recommended)
  description: string;           // Migration purpose
  up: string;                    // SQL for applying migration
  down: string;                  // SQL for rolling back
  appliedAt?: Date;              // When migration was applied
}
```

**Validation Rules**:
- Parameterized queries required (no string interpolation for safety)
- Transaction timeout: 30 seconds default, max 300 seconds

### 7. ObjectData (Object Storage Service)

Represents stored binary objects/files.

```typescript
interface ObjectData {
  bucket: string;                // Bucket/container name
  key: string;                   // Object key (path)
  data: Buffer | ReadableStream; // Object content
  size: number;                  // Size in bytes
  contentType?: string;          // MIME type
  metadata?: ObjectMetadata;     // Custom metadata
  etag: string;                  // Content hash for integrity
  lastModified: Date;            // Last modification time
}

interface ObjectMetadata {
  contentType?: string;          // MIME type override
  cacheControl?: string;         // Cache-Control header
  contentDisposition?: string;   // Content-Disposition header
  contentEncoding?: string;      // Content-Encoding (gzip, etc.)
  metadata?: Record<string, string>; // Custom key-value pairs
  tags?: Record<string, string>; // Object tags for organization
}

interface ObjectInfo {
  bucket: string;
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

interface ObjectLocation {
  bucket: string;
  key: string;
}

interface BucketOptions {
  versioning?: boolean;          // Enable object versioning
  encryption?: boolean;          // Server-side encryption
  publicRead?: boolean;          // Public read access
  lifecycle?: LifecycleRule[];   // Automatic deletion rules
}

interface LifecycleRule {
  prefix: string;                // Apply to keys matching prefix
  expirationDays: number;        // Delete after N days
}
```

**Validation Rules**:
- `bucket`: Must be 3-63 characters, lowercase alphanumeric + hyphens
- `key`: Max 1024 characters, URL-safe recommended
- Object size: Max 5GB per single upload (use multipart for larger)
- Metadata: Max 2KB total size
- Presigned URL expiration: Max 7 days

### 8. Message (Queue Service)

Represents a queue message.

```typescript
interface Message {
  body: string | object;         // Message payload
  attributes?: Record<string, string>; // Message attributes
  delaySeconds?: number;         // Delay before available
  deduplicationId?: string;      // For FIFO queues
  groupId?: string;              // For FIFO queues
}

interface ReceivedMessage {
  id: string;                    // Message identifier
  receiptHandle: string;         // Required for deletion/ack
  body: string | object;         // Message payload
  attributes: Record<string, string>;
  sentTimestamp: Date;           // When message was sent
  approximateReceiveCount: number; // Times message received
}

interface Queue {
  name: string;                  // Queue identifier
  url: string;                   // Queue URL/endpoint
  messageCount: number;          // Approximate count
  created: Date;
}

interface QueueOptions {
  visibilityTimeout?: number;    // Seconds (default: 30)
  messageRetention?: number;     // Seconds (default: 345600 = 4 days)
  maxMessageSize?: number;       // Bytes (default: 262144 = 256KB)
  enableDeadLetter?: boolean;    // Enable DLQ
  deadLetterAfterRetries?: number; // Move to DLQ after N retries
  fifo?: boolean;                // FIFO queue (ordered delivery)
}

interface QueueAttributes {
  approximateMessageCount: number;
  approximateMessageNotVisibleCount: number;
  created: Date;
  lastModified: Date;
}
```

**Validation Rules**:
- `body`: Max size per queue config (default 256KB)
- `visibilityTimeout`: 0-43200 seconds (12 hours)
- `messageRetention`: 60-1209600 seconds (1 minute to 14 days)
- `delaySeconds`: 0-900 seconds (15 minutes)
- FIFO queue names must end with `.fifo`

### 9. Event (Event Bus Service)

Represents a published event.

```typescript
interface Event {
  source: string;                // Event source (e.g., "user.service")
  type: string;                  // Event type (e.g., "user.created")
  data: object;                  // Event payload
  metadata?: Record<string, string>; // Additional metadata
  time?: Date;                   // Event timestamp (defaults to now)
  id?: string;                   // Event ID (generated if omitted)
}

interface EventBus {
  name: string;                  // Event bus identifier
  arn?: string;                  // Provider-specific identifier
  created: Date;
}

interface Rule {
  name: string;                  // Rule identifier
  eventPattern: EventPattern;    // Pattern to match events
  description?: string;          // Rule purpose
  enabled: boolean;              // Whether rule is active
  targets: Target[];             // Where matched events go
}

interface EventPattern {
  source?: string[];             // Match sources
  type?: string[];               // Match types
  data?: Record<string, any>;    // Match data fields
}

interface Target {
  id: string;                    // Target identifier
  type: TargetType;              // Target destination type
  endpoint: string;              // Target URL/ARN/identifier
}

enum TargetType {
  HTTP = 'http',
  HTTPS = 'https',
  QUEUE = 'queue',
  FUNCTION = 'function',
  EMAIL = 'email'
}
```

**Validation Rules**:
- `source`: Must be 1-256 characters, reverse-DNS format recommended
- `type`: Must be 1-256 characters, dot-separated recommended
- `data`: Max 256KB when serialized
- Event retention: 24 hours

### 10. Notification (Notification Service)

Represents notifications sent via multiple channels.

```typescript
interface NotificationMessage {
  subject?: string;              // Message subject (email only)
  body: string;                  // Message content
  attributes?: Record<string, string>; // Additional attributes
}

interface Topic {
  name: string;                  // Topic identifier
  arn?: string;                  // Provider-specific identifier
  subscriptions: Subscription[]; // Active subscriptions
  created: Date;
}

interface Subscription {
  id: string;                    // Subscription identifier
  protocol: Protocol;            // Delivery protocol
  endpoint: string;              // Delivery destination
  confirmed: boolean;            // Whether endpoint confirmed
  created: Date;
}

enum Protocol {
  EMAIL = 'email',
  SMS = 'sms',
  HTTP = 'http',
  HTTPS = 'https',
  WEBHOOK = 'webhook'
}

interface EmailParams {
  to: string[];                  // Recipient addresses
  from?: string;                 // Sender (may be provider-default)
  subject: string;               // Email subject
  body: string;                  // Email body (plain text or HTML)
  html?: boolean;                // Whether body is HTML
}

interface SMSParams {
  to: string;                    // Phone number (E.164 format)
  message: string;               // SMS text content
  senderId?: string;             // Sender ID (if supported)
}
```

**Validation Rules**:
- Email `to`: Max 50 recipients per call
- Email `subject`: Max 256 characters
- Email `body`: Max 1MB
- SMS `message`: Max 160 characters (or 1600 for concatenated)
- Phone numbers: E.164 format (+1234567890)

### 11. TokenSet (Authentication Service)

Represents OAuth2 authentication tokens.

```typescript
interface TokenSet {
  accessToken: string;           // Access token for API calls
  idToken?: string;              // ID token (OIDC only)
  refreshToken?: string;         // Refresh token
  expiresIn: number;             // Seconds until access token expires
  tokenType: string;             // Typically "Bearer"
  scope?: string;                // Granted scopes
}

interface TokenClaims {
  sub: string;                   // Subject (user ID)
  iss: string;                   // Issuer (auth provider)
  aud: string | string[];        // Audience
  exp: number;                   // Expiration (Unix timestamp)
  iat: number;                   // Issued at (Unix timestamp)
  email?: string;                // User email
  name?: string;                 // User full name
  [claim: string]: any;          // Additional custom claims
}

interface UserInfo {
  sub: string;                   // Subject (user ID)
  email?: string;                // User email
  emailVerified?: boolean;       // Email verification status
  name?: string;                 // Full name
  givenName?: string;            // First name
  familyName?: string;           // Last name
  picture?: string;              // Profile picture URL
  locale?: string;               // User locale (en-US, etc.)
  [key: string]: any;            // Provider-specific fields
}

interface AuthConfig {
  provider: 'okta' | 'auth0' | 'azure-ad';
  domain: string;                // Provider domain/issuer
  clientId: string;              // OAuth2 client ID
  clientSecret?: string;         // Client secret (if confidential)
  scopes?: string[];             // Requested scopes
  redirectUri?: string;          // Callback URL
}
```

**Validation Rules**:
- Token expiration: Validate before use, auto-refresh if within 5 minutes of expiry
- Scopes: Space-separated string or array
- `redirectUri`: Must be HTTPS in production

## Common Types

### Provider Configuration

```typescript
interface ProviderConfig {
  provider: ProviderType;
  region?: string;               // Cloud provider region
  credentials?: ProviderCredentials;
  options?: Record<string, any>; // Provider-specific options
}

enum ProviderType {
  AWS = 'aws',
  AZURE = 'azure',
  MOCK = 'mock'
}

interface ProviderCredentials {
  accessKeyId?: string;          // For local development
  secretAccessKey?: string;      // For local development
  // Workload identity preferred in production
}
```

### Error Types

```typescript
class LCPlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LCPlatformError';
  }
}

// Specific error classes
class ResourceNotFoundError extends LCPlatformError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} '${identifier}' not found`,
      'RESOURCE_NOT_FOUND',
      false
    );
  }
}

class ServiceUnavailableError extends LCPlatformError {
  constructor(service: string) {
    super(
      `${service} temporarily unavailable`,
      'SERVICE_UNAVAILABLE',
      true
    );
  }
}

class QuotaExceededError extends LCPlatformError {
  constructor(resource: string, limit: number) {
    super(
      `Quota exceeded for ${resource} (limit: ${limit})`,
      'QUOTA_EXCEEDED',
      false
    );
  }
}

class ValidationError extends LCPlatformError {
  constructor(field: string, reason: string) {
    super(
      `Validation failed for '${field}': ${reason}`,
      'VALIDATION_ERROR',
      false
    );
  }
}

class AuthenticationError extends LCPlatformError {
  constructor(reason: string) {
    super(
      `Authentication failed: ${reason}`,
      'AUTHENTICATION_ERROR',
      false
    );
  }
}
```

## Relationships

```
LCPlatform
  ├── WebHostingService → Deployment[]
  ├── BatchService → Job[], ScheduledJob[]
  ├── SecretsService → Secret[], SecretMetadata[]
  ├── ConfigurationService → Configuration[]
  ├── DocumentStoreService → Collection[], Document[]
  ├── DataStoreService → Transaction
  ├── ObjectStoreService → ObjectData[], ObjectInfo[]
  ├── QueueService → Queue[], Message[], ReceivedMessage[]
  ├── EventBusService → EventBus[], Event[], Rule[]
  ├── NotificationService → Topic[], Subscription[], NotificationMessage
  └── AuthenticationService → TokenSet, TokenClaims, UserInfo
```

## Data Persistence

**Note**: This package provides service abstractions, not data persistence itself. Data is persisted by underlying cloud providers:

- **AWS**: DynamoDB, RDS, S3, SQS, EventBridge, SNS, Secrets Manager, AppConfig
- **Mock**: In-memory (lost on process exit, for testing only)
- **Azure** (future): Cosmos DB, Azure Database, Blob Storage, Storage Queues, Event Grid, Notification Hubs, Key Vault, App Configuration

Applications using this package should design for provider-specific data persistence characteristics (eventual consistency, transaction support, etc.).
