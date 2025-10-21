# LCPlatform-DevAccelerator - Product Details

## Table of Contents
1. [Service Specifications](#service-specifications)
2. [API Reference](#api-reference)
3. [Configuration Guide](#configuration-guide)
4. [Provider Implementations](#provider-implementations)
5. [Error Handling](#error-handling)
6. [Testing Guide](#testing-guide)

---

## Service Specifications

### 1. WebHostingService

Deploy and manage containerized web applications with auto-scaling capabilities.

#### Interface Definition

```typescript
interface WebHostingService {
  /**
   * Deploy a containerized application
   * @returns Deployment metadata including URL and status
   */
  deployApplication(params: DeployApplicationParams): Promise<Deployment>;

  /**
   * Get deployment details and current status
   */
  getDeployment(id: string): Promise<Deployment>;

  /**
   * Update an existing deployment (rolling update)
   */
  updateApplication(id: string, params: UpdateApplicationParams): Promise<Deployment>;

  /**
   * Delete a deployment
   */
  deleteApplication(id: string): Promise<void>;

  /**
   * Get the public URL for an application
   */
  getApplicationUrl(id: string): Promise<string>;

  /**
   * Scale application instances
   */
  scaleApplication(id: string, params: ScaleParams): Promise<void>;
}
```

#### Type Definitions

```typescript
interface DeployApplicationParams {
  name: string;                      // Deployment name
  image: string;                     // Docker image (e.g., "myorg/app:v1.0.0")
  port?: number;                     // Container port (default: 80)
  environment?: Record<string, string>; // Environment variables
  cpu?: number;                      // CPU units (1, 2, 4)
  memory?: number;                   // Memory in MB (2048, 4096, 8192)
  minInstances?: number;             // Minimum instance count
  maxInstances?: number;             // Maximum instance count
}

interface Deployment {
  id: string;
  name: string;
  url: string;
  status: DeploymentStatus;
  image: string;
  cpu: number;
  memory: number;
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  created: Date;
  lastUpdated: Date;
  environment: Record<string, string>;
}

enum DeploymentStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  UPDATING = 'updating',
  DELETING = 'deleting',
  FAILED = 'failed',
  STOPPED = 'stopped',
}
```

#### Usage Example

```typescript
const hosting = platform.getWebHosting();

// Deploy application
const deployment = await hosting.deployApplication({
  name: 'my-web-app',
  image: 'myorg/app:v1.0.0',
  port: 3000,
  environment: {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://...',
  },
  cpu: 2,
  memory: 4096,
  minInstances: 2,
  maxInstances: 10,
});

console.log(`Deployed at: ${deployment.url}`);

// Update to new version
await hosting.updateApplication(deployment.id, {
  image: 'myorg/app:v1.1.0',
});

// Scale up
await hosting.scaleApplication(deployment.id, {
  minInstances: 5,
  maxInstances: 20,
});
```

---

### 2. DataStoreService

Relational database operations with transaction support and connection pooling.

#### Interface Definition

```typescript
interface DataStoreService {
  /**
   * Connect to the database
   */
  connect(connectionString?: string): Promise<void>;

  /**
   * Execute a SELECT query
   * @returns Array of result rows
   */
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute an INSERT/UPDATE/DELETE statement
   * @returns Execution result with affected rows
   */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;

  /**
   * Execute operations within a transaction
   */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;

  /**
   * Apply database migrations
   */
  migrate(migrations: Migration[]): Promise<void>;

  /**
   * Get a connection from the pool
   */
  getConnection(): Connection;
}
```

#### Type Definitions

```typescript
interface ExecuteResult {
  rowsAffected: number;
  insertId?: number | string;
}

interface Transaction {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
}

interface Migration {
  version: string;
  description: string;
  up: string;    // SQL to apply migration
  down: string;  // SQL to rollback migration
}

interface Connection {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  close(): Promise<void>;
}
```

#### Usage Example

```typescript
const db = platform.getDataStore();

// Connect
await db.connect();

// Create table
await db.execute(`
  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert with prepared statement (SQL injection safe)
await db.execute(
  'INSERT INTO products (name, price) VALUES ($1, $2)',
  ['Widget', 19.99]
);

// Query data
const products = await db.query<{ id: number; name: string; price: number }>(
  'SELECT id, name, price FROM products WHERE price < $1',
  [50]
);

// Transaction example
await db.transaction(async (tx) => {
  await tx.execute('UPDATE products SET price = price * 0.9 WHERE id = $1', [1]);
  await tx.execute('INSERT INTO price_history (product_id, old_price, new_price) VALUES ($1, $2, $3)', [1, 19.99, 17.99]);
  // Both operations committed together or rolled back on error
});

// Apply migrations
await db.migrate([
  {
    version: '001',
    description: 'Add inventory tracking',
    up: 'ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0',
    down: 'ALTER TABLE products DROP COLUMN stock',
  },
]);
```

---

### 3. ObjectStoreService

Binary object storage with presigned URLs and streaming support.

#### Interface Definition

```typescript
interface ObjectStoreService {
  /**
   * Create a storage bucket
   */
  createBucket(name: string, options?: BucketOptions): Promise<void>;

  /**
   * Upload an object to storage
   */
  putObject(
    bucket: string,
    key: string,
    data: Buffer | ReadableStream,
    metadata?: ObjectMetadata
  ): Promise<void>;

  /**
   * Download an object from storage
   */
  getObject(bucket: string, key: string): Promise<ObjectData>;

  /**
   * Delete an object from storage
   */
  deleteObject(bucket: string, key: string): Promise<void>;

  /**
   * List objects in a bucket
   */
  listObjects(bucket: string, prefix?: string): Promise<ObjectInfo[]>;

  /**
   * Generate a presigned URL for temporary access
   */
  generatePresignedUrl(
    bucket: string,
    key: string,
    expires?: number
  ): Promise<string>;

  /**
   * Copy an object between locations
   */
  copyObject(source: ObjectLocation, destination: ObjectLocation): Promise<void>;
}
```

#### Type Definitions

```typescript
interface ObjectData {
  bucket: string;
  key: string;
  data: Buffer | ReadableStream;
  size: number;
  contentType?: string;
  metadata?: ObjectMetadata;
  etag: string;
  lastModified: Date;
}

interface ObjectMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
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
  versioning?: boolean;
  encryption?: boolean;
  publicRead?: boolean;
  lifecycle?: LifecycleRule[];
}
```

#### Usage Example

```typescript
const storage = platform.getObjectStore();

// Create bucket
await storage.createBucket('user-uploads', {
  versioning: true,
  encryption: true,
});

// Upload file
await storage.putObject(
  'user-uploads',
  'documents/report.pdf',
  pdfBuffer,
  {
    contentType: 'application/pdf',
    metadata: {
      'uploaded-by': 'user123',
      'document-type': 'report',
    },
  }
);

// Download file
const file = await storage.getObject('user-uploads', 'documents/report.pdf');
console.log(`File size: ${file.size} bytes`);

// Generate presigned URL (expires in 1 hour)
const url = await storage.generatePresignedUrl(
  'user-uploads',
  'documents/report.pdf',
  3600
);
console.log(`Share this URL: ${url}`);

// List files in folder
const files = await storage.listObjects('user-uploads', 'documents/');
files.forEach(file => {
  console.log(`${file.key} - ${file.size} bytes`);
});

// Copy file
await storage.copyObject(
  { bucket: 'user-uploads', key: 'documents/report.pdf' },
  { bucket: 'archive', key: '2025/report.pdf' }
);
```

---

## Configuration Guide

### Platform Initialization

```typescript
import { LCPlatform, ProviderType } from '@lcplatform/dev-accelerator';

// Mock Provider (for development/testing)
const mockPlatform = new LCPlatform({
  provider: ProviderType.MOCK,
  region: 'us-east-1',
});

// AWS Provider (for production)
const awsPlatform = new LCPlatform({
  provider: ProviderType.AWS,
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  options: {
    // DataStore-specific configuration
    dbHost: process.env.DB_HOST,
    dbPort: parseInt(process.env.DB_PORT || '5432'),
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,

    // ObjectStore-specific configuration
    endpoint: process.env.S3_ENDPOINT, // Optional: for LocalStack
  },
});
```

### Environment Variables

Recommended environment variable setup:

```bash
# Provider Selection
LC_PLATFORM_PROVIDER=aws  # or 'mock' for development

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Database Configuration (for DataStoreService)
DB_HOST=your-rds-instance.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=myapp
DB_USER=dbuser
DB_PASSWORD=dbpassword

# LocalStack Configuration (for integration testing)
S3_ENDPOINT=http://localhost:4566
```

---

## Provider Implementations

### AWS Provider

#### WebHostingService → AWS App Runner
- Automatic HTTPS endpoints
- Built-in load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments
- VPC integration support

**Limitations**:
- Only supports x86_64 architecture
- Maximum 4 vCPU, 12GB RAM per instance
- Cold start latency for first request

#### DataStoreService → PostgreSQL (via node-postgres)
- Connection pooling (max 100 connections)
- Prepared statement caching
- Full PostgreSQL feature support
- Compatible with AWS RDS PostgreSQL

**Configuration**:
```typescript
const platform = new LCPlatform({
  provider: ProviderType.AWS,
  region: 'us-east-1',
  options: {
    dbHost: 'mydb.abc123.us-east-1.rds.amazonaws.com',
    dbPort: 5432,
    dbName: 'production',
    dbUser: 'admin',
    dbPassword: process.env.DB_PASSWORD,
  },
});
```

#### ObjectStoreService → AWS S3
- Server-side encryption (AES-256)
- Versioning support
- Lifecycle policies
- Cross-region replication ready

**Features**:
- Presigned URLs with custom expiration
- Streaming for large files (>5MB)
- Metadata and tagging
- Cross-bucket copy

### Mock Provider

The Mock provider runs entirely in-memory with no external dependencies.

**Use Cases**:
- Local development without cloud credentials
- Unit testing
- CI/CD pipelines
- Offline development

**Limitations**:
- Data lost on process restart
- No persistence
- Simplified SQL parsing (use `SELECT *` for complex queries)
- Mock URLs (not real HTTP endpoints)

**Example**:
```typescript
const platform = new LCPlatform({ provider: ProviderType.MOCK });

// All services work identically to AWS provider
const hosting = platform.getWebHosting();
const deployment = await hosting.deployApplication({...});
// deployment.url will be a mock URL like "http://mock-app-12345.example.com"
```

---

## Error Handling

### Error Hierarchy

```typescript
class LCPlatformError extends Error {
  code: string;
  statusCode: number;
}

class ResourceNotFoundError extends LCPlatformError {
  // Thrown when resource doesn't exist (404)
}

class ServiceUnavailableError extends LCPlatformError {
  // Thrown when cloud service is down (503)
}

class ValidationError extends LCPlatformError {
  // Thrown when input validation fails (400)
}

class QuotaExceededError extends LCPlatformError {
  // Thrown when cloud quota exceeded (429)
}

class AuthenticationError extends LCPlatformError {
  // Thrown when credentials are invalid (401)
}
```

### Error Handling Example

```typescript
import { ResourceNotFoundError, ServiceUnavailableError } from '@lcplatform/dev-accelerator';

try {
  const deployment = await hosting.getDeployment('non-existent-id');
} catch (error) {
  if (error instanceof ResourceNotFoundError) {
    console.log('Deployment not found');
  } else if (error instanceof ServiceUnavailableError) {
    console.log('Cloud service is temporarily unavailable, retrying...');
    // Automatic retry logic is built-in with exponential backoff
  } else {
    throw error; // Unexpected error
  }
}
```

### Retry Logic

All operations have built-in retry logic with exponential backoff:

- **Default**: 3 retry attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Retryable Errors**: ServiceUnavailableError, network timeouts
- **Non-Retryable**: ValidationError, AuthenticationError, ResourceNotFoundError

---

## Testing Guide

### Unit Testing with Mock Provider

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { LCPlatform, ProviderType } from '@lcplatform/dev-accelerator';

describe('My Application', () => {
  let platform: LCPlatform;

  beforeEach(() => {
    platform = new LCPlatform({ provider: ProviderType.MOCK });
  });

  it('should deploy application with database', async () => {
    // Setup database
    const db = platform.getDataStore();
    await db.connect();
    await db.execute('CREATE TABLE users (id SERIAL, name VARCHAR(100))');

    // Deploy app
    const hosting = platform.getWebHosting();
    const deployment = await hosting.deployApplication({
      name: 'test-app',
      image: 'nginx:latest',
      port: 80,
    });

    expect(deployment.status).toBe('running');
    expect(deployment.url).toBeDefined();
  });
});
```

### Integration Testing with LocalStack

See `tests/integration/README.md` for complete setup guide.

```bash
# Start LocalStack + PostgreSQL
docker-compose up -d

# Run integration tests
bun test tests/integration/

# Cleanup
docker-compose down -v
```

### Contract Testing

Contract tests verify that AWS and Mock providers implement identical interfaces:

```typescript
import { describe, it, expect } from 'bun:test';
import { AwsWebHostingService } from './providers/aws/AwsWebHostingService';
import { MockWebHostingService } from './providers/mock/MockWebHostingService';

function testWebHostingContract(name: string, createService: () => WebHostingService) {
  describe(`WebHostingService Contract: ${name}`, () => {
    it('should deploy application', async () => {
      const service = createService();
      const deployment = await service.deployApplication({
        name: 'test',
        image: 'nginx:latest',
      });
      expect(deployment.name).toBe('test');
    });
  });
}

// Run contract tests against both providers
testWebHostingContract('AWS', () => new AwsWebHostingService());
testWebHostingContract('Mock', () => new MockWebHostingService());
```

---

## Performance Considerations

### Connection Pooling (DataStoreService)
- Default pool size: 10-100 connections
- Automatic connection recycling
- Health checks every 30 seconds

### Caching
- LRU cache for secrets and configuration
- Default TTL: 5 minutes
- Configurable cache size

### Streaming
- Objects >5MB automatically use streaming
- Reduces memory footprint
- Progress tracking available

### Batch Operations
- Use transactions for multiple database operations
- Batch uploads for multiple objects
- Connection pooling for concurrent requests

---

## API Versioning

Current Version: **1.0.0** (MVP)

Breaking changes will result in major version bump. Semantic versioning (semver) strictly followed.

---

## Support

- **Documentation**: See `/documentation/` directory
- **Examples**: See `tests/e2e/mvp-demo.test.ts`
- **Integration Setup**: See `tests/integration/README.md`
- **Specifications**: See `/specs/001-core-platform-infrastructure/`

---

**Last Updated**: October 20, 2025
**Status**: Production Ready (User Story 1)
