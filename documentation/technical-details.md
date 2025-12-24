# lc-platform-dev-accelerators - Technical Details

**Status**: Full Platform Complete - 12 Control Plane Services + 9 Data Plane Clients + Application Dependency Management Implemented

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Code Organization](#code-organization)
3. [Design Patterns](#design-patterns)
4. [Provider Abstraction Layer](#provider-abstraction-layer)
5. [Extension Points](#extension-points)
6. [Build & Deployment](#build--deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### Dual-Plane Hexagonal Architecture

lc-platform-dev-accelerators implements a **dual-plane architecture** using Hexagonal (Ports and Adapters) patterns to achieve complete provider independence across both infrastructure management and application runtime scenarios.

#### Control Plane Architecture (LCPlatform)

The **Control Plane** provides comprehensive service management for platform operators:

```
┌─────────────────────────────────────────────────────────────┐
│                Control Plane Application Layer               │
│     (Platform operators using LCPlatform interfaces)        │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │        LCPlatform              │
         │  (Full service management)     │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │    Service Factories           │
         │  (Runtime provider selection)  │
         └───────────────┬────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────────▼───────────┐  ┌─────▼───────┐
│ Core Domain  │  │    AWS Services      │  │ Mock Layer  │
│              │  │                      │  │             │
│ 12 Services: │  │  AWS Adapters:       │  │ Adapters:   │
│ - WebHosting │  │  - AppRunner         │  │ - InMemory  │
│ - FunctionHost│ │  - Lambda            │  │ - InMemory  │
│ - Batch      │  │  - Batch+EventBridge │  │ - InMemory  │
│ - DataStore  │  │  - RDS PostgreSQL    │  │ - InMemory  │
│ - DocStore   │  │  - DocumentDB        │  │ - InMemory  │
│ - ObjectStore│  │  - S3                │  │ - InMemory  │
│ - Queue      │  │  - SQS               │  │ - InMemory  │
│ - EventBus   │  │  - EventBridge       │  │ - InMemory  │
│ - Secrets    │  │  - Secrets Manager   │  │ - InMemory  │
│ - Config     │  │  - AppConfig         │  │ - InMemory  │
│ - Notify     │  │  - SNS               │  │ - InMemory  │
│ - Auth       │  │  - Cognito           │  │ - InMemory  │
└──────────────┘  └──────────────────────┘  └─────────────┘
```

#### Data Plane Architecture (LCAppRuntime)

The **Data Plane** provides lightweight runtime access for applications:

```
┌─────────────────────────────────────────────────────────────┐
│                 Data Plane Application Layer                │
│        (Running applications using LCAppRuntime)            │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │      LCAppRuntime              │
         │  (Lightweight runtime API)     │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │    Client Factories            │
         │  (Auto provider detection)     │
         └───────────────┬────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────────▼───────────┐  ┌─────▼───────┐
│ Core Domain  │  │   AWS Clients        │  │ Mock Layer  │
│              │  │                      │  │             │
│ 9 Clients:   │  │  Lightweight AWS:    │  │ Adapters:   │
│ - QueueClient│  │  - SQS Client        │  │ - InMemory  │
│ - ObjectClient│ │  - S3 Client         │  │ - InMemory  │
│ - SecretsClient│ │  - Secrets Client    │  │ - InMemory  │
│ - ConfigClient│ │  - AppConfig Client  │  │ - InMemory  │
│ - EventPublisher│ │ - EventBridge      │  │ - InMemory  │
│ - NotifyClient│ │  - SNS Client        │  │ - InMemory  │
│ - DocClient  │  │  - DocumentDB Client │  │ - InMemory  │
│ - DataClient │  │  - PostgreSQL Client │  │ - InMemory  │
│ - AuthClient │  │  - Cognito Client    │  │ - InMemory  │
└──────────────┘  └──────────────────────┘  └─────────────┘
```

### Architectural Principles & Benefits

#### 1. **Separation of Concerns**
- **Control Plane (LCPlatform)**: Infrastructure management, service orchestration, full feature sets
- **Data Plane (LCAppRuntime)**: Runtime service access, lightweight operations, minimal overhead

#### 2. **Provider Independence**
- **Dependency Inversion**: Applications depend on abstractions (interfaces), not implementations
- **No Cloud Lock-in**: No cloud-specific types in core domain interfaces
- **Configuration-based**: Provider selection at runtime via environment variables

#### 3. **Testability & Development**
- **Mock Providers**: Enable testing and development without cloud resources
- **Fast Feedback**: No network calls during unit testing
- **Cost Efficiency**: Local development without cloud costs

#### 4. **Performance Optimization**
- **Control Plane**: Rich feature sets with full service capabilities
- **Data Plane**: Optimized for runtime performance with minimal resource usage
- **Connection Pooling**: Efficient resource management in both planes

#### 5. **Operational Benefits**
- **Different Use Cases**: Infrastructure ops vs application runtime
- **Independent Scaling**: Scale control plane and data plane independently
- **Security Boundaries**: Different authentication and access patterns

---

## Code Organization

### Directory Structure

```
lc-platform-dev-accelerators/
├── src/
│   ├── core/                    # Domain layer (provider-agnostic)
│   │   ├── types/              # Shared type definitions
│   │   │   ├── common.ts       # Shared types, errors, config
│   │   │   ├── runtime.ts      # Runtime-specific types
│   │   │   ├── application.ts  # Application metadata types
│   │   │   ├── dependency.ts   # Dependency configuration types
│   │   │   ├── deployment.ts   # WebHosting types
│   │   │   ├── function.ts     # FunctionHosting types
│   │   │   ├── datastore.ts    # Database types
│   │   │   ├── object.ts       # Object storage types
│   │   │   ├── job.ts          # Batch job types
│   │   │   ├── queue.ts        # Queue types
│   │   │   ├── secret.ts       # Secrets types
│   │   │   ├── configuration.ts # Configuration types
│   │   │   ├── document.ts     # Document store types
│   │   │   ├── event.ts        # Event bus types
│   │   │   ├── notification.ts # Notification types
│   │   │   └── auth.ts         # Authentication types
│   │   │
│   │   ├── services/           # Control Plane interfaces (12 total)
│   │   │   ├── WebHostingService.ts
│   │   │   ├── FunctionHostingService.ts
│   │   │   ├── BatchService.ts
│   │   │   ├── DataStoreService.ts
│   │   │   ├── DocumentStoreService.ts
│   │   │   ├── ObjectStoreService.ts
│   │   │   ├── QueueService.ts
│   │   │   ├── EventBusService.ts
│   │   │   ├── SecretsService.ts
│   │   │   ├── ConfigurationService.ts
│   │   │   ├── NotificationService.ts
│   │   │   └── AuthenticationService.ts
│   │   │
│   │   └── clients/            # Data Plane interfaces (9 total)
│   │       ├── QueueClient.ts
│   │       ├── ObjectClient.ts
│   │       ├── SecretsClient.ts
│   │       ├── ConfigClient.ts
│   │       ├── EventPublisher.ts
│   │       ├── NotificationClient.ts
│   │       ├── DocumentClient.ts
│   │       ├── DataClient.ts
│   │       └── AuthClient.ts
│   │
│   ├── providers/              # Infrastructure layer (cloud-specific)
│   │   ├── aws/               # AWS implementations
│   │   │   ├── services/      # Control plane services (12 total)
│   │   │   │   ├── AwsWebHostingService.ts      # App Runner
│   │   │   │   ├── AwsFunctionHostingService.ts # Lambda
│   │   │   │   ├── AwsBatchService.ts           # AWS Batch
│   │   │   │   ├── AwsDataStoreService.ts       # RDS PostgreSQL
│   │   │   │   ├── AwsDocumentStoreService.ts   # DocumentDB
│   │   │   │   ├── AwsObjectStoreService.ts     # S3
│   │   │   │   ├── AwsQueueService.ts           # SQS
│   │   │   │   ├── AwsEventBusService.ts        # EventBridge
│   │   │   │   ├── AwsSecretsService.ts         # Secrets Manager
│   │   │   │   ├── AwsConfigurationService.ts   # AppConfig
│   │   │   │   ├── AwsNotificationService.ts    # SNS
│   │   │   │   └── AwsAuthenticationService.ts  # Cognito + Okta
│   │   │   │
│   │   │   ├── clients/       # Data plane clients (9 total)
│   │   │   │   ├── AwsQueueClient.ts            # SQS client
│   │   │   │   ├── AwsObjectClient.ts           # S3 client
│   │   │   │   ├── AwsSecretsClient.ts          # Secrets Manager client
│   │   │   │   ├── AwsConfigClient.ts           # AppConfig client
│   │   │   │   ├── AwsEventPublisher.ts         # EventBridge client
│   │   │   │   ├── AwsNotificationClient.ts     # SNS client
│   │   │   │   ├── AwsDocumentClient.ts         # DocumentDB client
│   │   │   │   ├── AwsDataClient.ts             # RDS client
│   │   │   │   └── AwsAuthClient.ts             # Cognito client
│   │   │   │
│   │   │   └── AwsProviderConfig.ts # AWS provider configuration
│   │   │
│   │   ├── azure/             # Future: Azure implementations
│   │   │   ├── services/      # Azure control plane services
│   │   │   └── clients/       # Azure data plane clients
│   │   │
│   │   └── mock/              # Mock implementations (testing)
│   │       ├── services/      # Mock control plane services (12 total)
│   │       │   ├── MockWebHostingService.ts
│   │       │   ├── MockFunctionHostingService.ts
│   │       │   ├── MockBatchService.ts
│   │       │   ├── MockDataStoreService.ts
│   │       │   ├── MockDocumentStoreService.ts
│   │       │   ├── MockObjectStoreService.ts
│   │       │   ├── MockQueueService.ts
│   │       │   ├── MockEventBusService.ts
│   │       │   ├── MockSecretsService.ts
│   │       │   ├── MockConfigurationService.ts
│   │       │   ├── MockNotificationService.ts
│   │       │   └── MockAuthenticationService.ts
│   │       │
│   │       ├── clients/       # Mock data plane clients (9 total)
│   │       │   ├── MockQueueClient.ts
│   │       │   ├── MockObjectClient.ts
│   │       │   ├── MockSecretsClient.ts
│   │       │   ├── MockConfigClient.ts
│   │       │   ├── MockEventPublisher.ts
│   │       │   ├── MockNotificationClient.ts
│   │       │   ├── MockDocumentClient.ts
│   │       │   ├── MockDataClient.ts
│   │       │   └── MockAuthClient.ts
│   │       │
│   │       └── MockProviderConfig.ts # Mock provider configuration
│   │
│   ├── factory/               # Factory pattern implementations
│   │   ├── LCPlatformFactory.ts    # Control plane DI container
│   │   └── LCAppRuntimeFactory.ts  # Data plane DI container
│   │
│   ├── utils/                 # Utility functions
│   │   ├── retry.ts          # Retry logic with exponential backoff
│   │   ├── cache.ts          # LRU cache implementation
│   │   ├── validation.ts     # Input validation utilities
│   │   ├── configPersistence.ts     # Configuration persistence to object storage
│   │   └── dependencyValidator.ts  # Dependency validation and schema checking
│   │
│   ├── LCPlatform.ts         # Control plane entry point
│   ├── LCAppRuntime.ts       # Data plane entry point
│   └── index.ts              # Public API exports
│
├── tests/
│   ├── unit/                 # Unit tests (Mock provider)
│   ├── contract/             # Contract tests (provider parity)
│   ├── integration/          # Integration tests (LocalStack)
│   └── e2e/                  # End-to-end tests
│
├── documentation/            # Project documentation
│   ├── product-summary.md
│   ├── product-details.md
│   └── technical-details.md (this file)
│
├── specs/                    # Feature specifications
│   └── 001-core-platform-infrastructure/
│
├── package.json             # Bun package configuration
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.cjs            # ESLint rules
├── .prettierrc              # Prettier configuration
└── docker-compose.yml       # LocalStack + PostgreSQL setup
```

### Module Boundaries

#### Core Domain (`src/core/`)
**Purpose**: Define cloud-agnostic contracts

**Rules**:
- ✅ Only TypeScript primitives and generic types
- ✅ No cloud SDK imports (no `@aws-sdk/*`, `@azure/*`)
- ✅ No implementation logic
- ❌ Must NOT depend on `src/providers/`

**Example**:
```typescript
// ✅ Good - Generic interface
interface ObjectStoreService {
  putObject(bucket: string, key: string, data: Buffer): Promise<void>;
}

// ❌ Bad - AWS-specific type
import { PutObjectCommand } from '@aws-sdk/client-s3';
interface ObjectStoreService {
  putObject(command: PutObjectCommand): Promise<void>; // Leaks AWS types!
}
```

#### Provider Layer (`src/providers/`)
**Purpose**: Implement cloud-specific adapters

**Rules**:
- ✅ Implements interfaces from `src/core/services/`
- ✅ Can import cloud SDKs (`@aws-sdk/*`, `@azure/*`)
- ✅ Handles cloud-specific authentication
- ❌ Must NOT expose cloud types in public API

**Example**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { ObjectStoreService } from '../../core/services/ObjectStoreService';

export class AwsObjectStoreService implements ObjectStoreService {
  private client: S3Client;

  async putObject(bucket: string, key: string, data: Buffer): Promise<void> {
    // AWS-specific implementation hidden from consumers
    await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }));
  }
}
```

#### Factory Layer (`src/factory/`)
**Purpose**: Create provider instances at runtime

**Rules**:
- ✅ Selects provider based on configuration
- ✅ Hides provider instantiation from consumers
- ✅ Manages provider-specific configuration

---

## Design Patterns

### 1. Dual-Plane Factory Pattern

The platform uses separate factory classes for Control Plane and Data Plane services.

```typescript
// src/factory/LCPlatformFactory.ts - Control Plane Factory
export class LCPlatformFactory {
  constructor(private config: ProviderConfig) {}

  createWebHostingService(): WebHostingService {
    return this.createService('webhosting');
  }

  createFunctionHostingService(): FunctionHostingService {
    return this.createService('functionhosting');
  }

  // ... other control plane services

  private createService(serviceName: string) {
    switch (this.config.provider) {
      case 'aws': return new AwsServicesFactory().create(serviceName, this.config);
      case 'mock': return new MockServicesFactory().create(serviceName, this.config);
      default: throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }
}

// src/factory/LCAppRuntimeFactory.ts - Data Plane Factory
export class LCAppRuntimeFactory {
  constructor(private config: ProviderConfig) {}

  createQueueClient(): QueueClient {
    return this.createClient('queue');
  }

  createObjectClient(): ObjectClient {
    return this.createClient('object');
  }

  // ... other data plane clients

  private createClient(clientName: string) {
    switch (this.config.provider) {
      case 'aws': return new AwsClientsFactory().create(clientName, this.config);
      case 'mock': return new MockClientsFactory().create(clientName, this.config);
      default: throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }
}
```

### 2. Dual-Plane Dependency Injection

Services are injected via separate entry points for Control and Data planes.

```typescript
// Control Plane - Infrastructure management
export class LCPlatform {
  private factory: LCPlatformFactory;

  constructor(config: ProviderConfig) {
    this.factory = new LCPlatformFactory(config);
  }

  // Control Plane Services (12 total)
  getWebHosting(): WebHostingService { return this.factory.createWebHostingService(); }
  getFunctionHosting(): FunctionHostingService { return this.factory.createFunctionHostingService(); }
  getBatch(): BatchService { return this.factory.createBatchService(); }
  // ... other services
}

// Data Plane - Runtime operations
export class LCAppRuntime {
  private factory: LCAppRuntimeFactory;

  constructor(config: ProviderConfig) {
    this.factory = new LCAppRuntimeFactory(config);
  }

  // Data Plane Clients (9 total)
  getQueue(): QueueClient { return this.factory.createQueueClient(); }
  getObject(): ObjectClient { return this.factory.createObjectClient(); }
  getSecrets(): SecretsClient { return this.factory.createSecretsClient(); }
  // ... other clients
}
```

### 3. Retry Pattern (Exponential Backoff)

Automatic retry for transient failures.

```typescript
// src/utils/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 1000;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      await sleep(delay);
    }
  }

  throw lastError!;
}

function isRetryableError(error: unknown): boolean {
  return error instanceof ServiceUnavailableError ||
         (error as any).code === 'ETIMEDOUT';
}
```

**Usage in Provider**:
```typescript
async putObject(bucket: string, key: string, data: Buffer): Promise<void> {
  return retryWithBackoff(() => {
    return this.client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }));
  }, { maxRetries: 3, baseDelay: 1000 });
}
```

### 4. Connection Pooling

Reuse database connections for performance.

```typescript
// src/providers/aws/AwsDataStoreService.ts
export class AwsDataStoreService implements DataStoreService {
  private pool?: Pool;

  async connect(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: 100,              // Maximum 100 connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool!.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release(); // Return to pool
    }
  }
}
```

### 5. LRU Cache Pattern

Cache secrets and configuration for performance.

```typescript
// src/utils/cache.ts
export class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey); // Evict oldest
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }
}
```

---

## Provider Abstraction Layer

### Type Mapping Strategy

Cloud provider types are mapped to generic TypeScript types in the core domain.

#### Example: Deployment Status Mapping

**Core Domain**:
```typescript
enum DeploymentStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  UPDATING = 'updating',
  DELETING = 'deleting',
  FAILED = 'failed',
  STOPPED = 'stopped',
}
```

**AWS Provider Mapping**:
```typescript
// AWS App Runner has different status values
import { ServiceStatus } from '@aws-sdk/client-apprunner';

private mapStatus(appRunnerStatus?: ServiceStatus): DeploymentStatus {
  switch (appRunnerStatus) {
    case 'OPERATION_IN_PROGRESS':
    case 'CREATE_IN_PROGRESS':
      return DeploymentStatus.CREATING;
    case 'RUNNING':
      return DeploymentStatus.RUNNING;
    case 'UPDATE_IN_PROGRESS':
      return DeploymentStatus.UPDATING;
    case 'DELETE_IN_PROGRESS':
      return DeploymentStatus.DELETING;
    case 'CREATE_FAILED':
    case 'UPDATE_FAILED':
      return DeploymentStatus.FAILED;
    case 'PAUSED':
      return DeploymentStatus.STOPPED;
    default:
      return DeploymentStatus.CREATING;
  }
}
```

### Authentication Abstraction

Different authentication mechanisms are abstracted behind a common configuration.

```typescript
interface ProviderConfig {
  provider: ProviderType;
  region: string;
  credentials?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  };
  options?: Record<string, unknown>;
}

// AWS Provider handles AWS-specific auth
class AwsWebHostingService {
  constructor(config: AwsConfig) {
    this.client = new AppRunnerClient({
      region: config.region,
      credentials: config.credentials ?? fromEnv(), // Defaults to IAM role
    });
  }
}

// Mock Provider ignores credentials
class MockWebHostingService {
  constructor(config?: any) {
    // No authentication needed
  }
}
```

---

## Extension Points

### Adding a New Provider (e.g., Azure)

1. **Implement Service Interfaces**:
```typescript
// src/providers/azure/AzureWebHostingService.ts
import { ContainerAppsManagementClient } from '@azure/arm-appcontainers';
import type { WebHostingService } from '../../core/services/WebHostingService';

export class AzureWebHostingService implements WebHostingService {
  private client: ContainerAppsManagementClient;

  async deployApplication(params: DeployApplicationParams): Promise<Deployment> {
    // Azure Container Apps implementation
  }

  // ... implement other methods
}
```

2. **Update Factory**:
```typescript
// src/factory/WebHostingServiceFactory.ts
protected createAzureService(config: ProviderConfig): WebHostingService {
  return new AzureWebHostingService(config);
}
```

3. **Add Provider Type**:
```typescript
// src/core/types/common.ts
export enum ProviderType {
  AWS = 'aws',
  AZURE = 'azure',  // Add this
  MOCK = 'mock',
}
```

### Adding a New Service

1. **Define Types**:
```typescript
// src/core/types/cache.ts
export interface CacheEntry {
  key: string;
  value: unknown;
  ttl: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
}
```

2. **Define Interface**:
```typescript
// src/core/services/CacheService.ts
export interface CacheService {
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

3. **Implement Providers**:
```typescript
// src/providers/aws/AwsCacheService.ts
import { ElastiCacheClient } from '@aws-sdk/client-elasticache';

export class AwsCacheService implements CacheService {
  // AWS ElastiCache implementation
}

// src/providers/mock/MockCacheService.ts
export class MockCacheService implements CacheService {
  private cache = new Map<string, any>();
  // In-memory implementation
}
```

4. **Create Factory**:
```typescript
// src/factory/CacheServiceFactory.ts
export class CacheServiceFactory extends BaseProviderFactory<CacheService> {
  protected createAwsService(config: ProviderConfig): CacheService {
    return new AwsCacheService(config);
  }

  protected createMockService(config: ProviderConfig): CacheService {
    return new MockCacheService();
  }
}
```

5. **Add to LCPlatform**:
```typescript
// src/LCPlatform.ts
export class LCPlatform {
  getCache(): CacheService {
    return new CacheServiceFactory().create(this.config);
  }
}
```

---

## Build & Deployment

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,  // Enforces strict optional types
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Package Build

```json
// package.json (partial)
{
  "name": "@stainedhead/lc-platform-dev-accelerators",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "lint": "eslint src tests --ext .ts",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'"
  }
}
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun test

      - name: Build
        run: bun run build

  publish:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Publish to GitHub Packages
        run: |
          echo "@lcplatform:registry=https://npm.pkg.github.com" >> .npmrc
          echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> .npmrc
          npm publish
```

### Docker Support (for Integration Tests)

```yaml
# docker-compose.yml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3,apprunner,secretsmanager,appconfig
      - DEFAULT_REGION=us-east-1

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpassword
      - POSTGRES_DB=testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser"]
      interval: 5s
      timeout: 5s
      retries: 5
```

---

## Performance Optimization

### Connection Pooling
- **Database**: Pool size 10-100 connections
- **Reuse**: Connections recycled automatically
- **Health Checks**: Every 30 seconds

### Caching Strategy
- **LRU Cache**: Most recently used items kept
- **TTL**: Default 5 minutes for secrets/config
- **Size Limit**: Configurable max size

### Streaming
- **Threshold**: Files >5MB use streaming
- **Memory**: Constant memory usage
- **Progress**: Tracking available

### Batch Operations
- **Transactions**: Group database operations
- **Parallel**: Connection pooling enables concurrency
- **Retries**: Per-operation retry logic

---

## Security Considerations

### Authentication Best Practices
1. **Prefer IAM Roles**: Use workload identity over access keys
2. **Environment Variables**: Never hardcode credentials
3. **Least Privilege**: Grant minimum required permissions
4. **Rotation**: Support credential rotation

### SQL Injection Prevention
- **Prepared Statements**: All queries use parameterized queries
- **Validation**: Input validation before execution
- **Escaping**: Automatic by database driver

### Error Handling
- **No Leak**: Cloud errors mapped to generic errors
- **Sanitization**: Remove sensitive data from error messages
- **Logging**: Structured logging without secrets

---

## Monitoring & Observability

### Logging
- **Structured**: JSON-formatted logs
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Correlation IDs**: Track requests across services

### Metrics
- **Operation Count**: Track service usage
- **Latency**: Measure operation duration
- **Error Rate**: Track failures by type
- **Retry Count**: Monitor retry frequency

### Distributed Tracing
- **Future**: OpenTelemetry integration planned
- **Context Propagation**: Pass trace IDs across boundaries

---

## Maintenance Guidelines

### Code Review Checklist
- [ ] No cloud-specific types in `src/core/`
- [ ] All public methods have retry logic
- [ ] Error handling uses custom error types
- [ ] Tests cover happy path + error cases
- [ ] Documentation updated (this file + product-details.md)

### Breaking Change Process
1. Increment major version
2. Update all three documentation files
3. Add migration guide to changelog
4. Deprecate old API for 2 versions before removal

---

---

## CI/CD Pipeline

### GitHub Actions Workflows

Three automated workflows ensure code quality and deployment:

#### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Triggers**: Every push and pull request
- **Matrix Testing**: Ubuntu, macOS, Windows × Bun 1.0.0, latest
- **Steps**:
  - Type checking (`tsc --noEmit`)
  - Linting (`eslint`)
  - Formatting check (`prettier`)
  - Unit tests with coverage
  - Build validation

#### 2. Publish Workflow (`.github/workflows/publish.yml`)
- **Triggers**: Release creation or manual dispatch
- **Dual Publishing**:
  - NPM public registry
  - GitHub Packages registry
- **Version Management**: Automatic semantic versioning

#### 3. Integration Tests (`.github/workflows/integration-tests.yml`)
- **Schedule**: Weekly automated runs
- **AWS Integration**: Full AWS service testing
- **Requires**: AWS credentials from secrets

### Quality Gates

All merges to `main` branch must pass:
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ 95%+ test pass rate
- ✅ 80%+ code coverage
- ✅ Prettier formatting

---

## Performance Optimization

### Actual Performance Results

From `benchmarks/index.ts` (23 operations across 12 Control Plane services + 9 Data Plane clients):

| Category | Operation | Ops/Second | Performance |
|----------|-----------|------------|-------------|
| Object Creation | Direct | 16.6M | ✅ Exceeds 100K target |
| Object Creation | With types | 14.3M | ✅ Exceeds 100K target |
| Object Creation | Factory pattern | 13.4M | ✅ Exceeds 100K target |
| Storage | Upload 1KB | 5M | ✅ Exceeds 10K target |
| Storage | Download | 4M | ✅ Exceeds 10K target |
| Storage | Delete | 2M | ✅ Exceeds 10K target |
| Storage | List | 1.5M | ✅ Exceeds 10K target |
| Storage | Presigned URL | 1.8M | ✅ Exceeds 10K target |
| Database | SELECT | 2.7M | ✅ Exceeds 50K target |
| Database | Parameterized | 2.5M | ✅ Exceeds 50K target |
| Database | Transaction (3 ops) | 700K | ✅ Exceeds 50K target |
| Batch | Submit job | 25K | ✅ Good performance |
| Batch | List jobs | 35K | ✅ Good performance |
| Queue | Send message | 1.5M | ✅ Exceeds 20K target |
| Queue | Receive | 30K | ✅ Exceeds 20K target |
| Secrets | Create | 55K | ✅ Good performance |
| Config | Create | 60K | ✅ Good performance |

**Key Insights**:
- Mock provider overhead: <5% vs direct implementation
- Factory pattern adds negligible overhead
- All operations exceed conservative targets by 10-100x

### Optimization Strategies Implemented

1. **Connection Pooling**: PostgreSQL pool (10-100 connections)
2. **LRU Caching**: Secrets and configuration (5min TTL)
3. **Streaming**: Objects >5MB use streams (constant memory)
4. **Batch Operations**: Transaction grouping for database ops
5. **Async/Parallel**: Connection pooling enables concurrency

---

**Last Updated**: December 23, 2025
**Architecture Version**: 1.0.0 (Dual-Plane Hexagonal Architecture with Factory Pattern)
**Control Plane Services**: 12/12 Complete (User Stories 1-7)
**Data Plane Clients**: 9/9 Complete (Runtime Support)
**Application Dependency Management**: Complete (User Stories 1-4)
