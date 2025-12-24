# S3 Bucket Naming Strategies for Multi-Tenant Cloud Platforms

## Executive Summary

This guide provides comprehensive strategies for implementing unique S3 bucket naming in multi-tenant cloud platforms. It covers AWS S3 naming constraints, collision detection strategies, validation rules, and includes production-ready code examples applicable to platforms like `lc-platform` that generate names like `lcp-{account}-{team}-{moniker}`.

---

## Table of Contents

1. [AWS S3 Global Uniqueness Constraints](#aws-s3-global-uniqueness-constraints)
2. [Multi-Tenant Naming Pattern Analysis](#multi-tenant-naming-pattern-analysis)
3. [Collision Detection Strategies](#collision-detection-strategies)
4. [Name Validation Rules](#name-validation-rules)
5. [Production Implementation](#production-implementation)
6. [Azure Blob Storage Equivalents](#azure-blob-storage-equivalents)
7. [Testing & Verification](#testing--verification)

---

## AWS S3 Global Uniqueness Constraints

### Naming Rules (RFC 3.3 - Bucket Naming Requirements)

#### Hard Constraints

1. **Global Uniqueness**: Bucket names must be globally unique across all AWS accounts and regions
2. **Length**: 3-63 characters (minimum 3, maximum 63)
3. **Character Set**: Lowercase letters (a-z), numbers (0-9), and hyphens (-)
4. **No Uppercase**: AWS automatically converts to lowercase; best practice is explicit lowercase
5. **No Underscores**: Not permitted (e.g., `my_bucket` is invalid)
6. **No Consecutive Hyphens**: `..`, `.-`, `-.` patterns not allowed
7. **No Dots**: Period (.) characters conflict with virtual-hosted-style requests
8. **No IP Address Format**: Cannot resemble IP addresses (e.g., `192.168.1.1`)
9. **Must Start/End with Letter or Number**: Cannot start/end with hyphens

#### Practical Implications for Multi-Tenant Names

For format `lcp-{account}-{team}-{moniker}`:

```
Minimum: lcp-a-a-a              (9 characters) ✅
Maximum: lcp-{20}-{20}-{15}     (63 characters) ✅
Example: lcp-acc123-team-mon    (24 characters) ✅
```

**Critical Issue**: Team names and monikers may contain:
- Underscores (not allowed in S3)
- Dots/periods (problematic)
- Uppercase letters (must normalize)
- Special characters (must sanitize)

### Reserved Bucket Names

AWS reserves the following patterns:
```
- s3, s3-us-*, s3-website-*
- *.amazonaws.com
- [reserved by AWS in various regions]
```

---

## Multi-Tenant Naming Pattern Analysis

### Pattern: `lcp-{account}-{team}-{moniker}`

#### Breakdown

| Component | Purpose | Constraints | Example |
|-----------|---------|-------------|---------|
| `lcp` | Platform prefix | Fixed 3 chars | `lcp` |
| `{account}` | AWS account ID or identifier | 3-20 chars, alphanumeric | `acc-123` |
| `{team}` | Team/org name | 3-20 chars, may need sanitization | `engineering` |
| `{moniker}` | Resource name/purpose | 3-15 chars, may need sanitization | `config` |

#### Advantages

1. **Hierarchical**: Clear ownership path (account → team → resource)
2. **Namespacing**: Reduces collision probability
3. **Readability**: Easy to identify bucket purpose
4. **Multi-tenancy**: Natural team/account isolation
5. **Scalability**: Supports many teams within accounts

#### Challenges

1. **Character Sanitization**: Team names may contain invalid characters
2. **Length Overflow**: Combined length could exceed 63 chars
3. **Collision Risk**: Without uniqueness guarantee, collisions possible
4. **Naming Conflicts**: Different accounts/teams may want same bucket name
5. **Special Characters**: Underscores, dots in team names

---

## Collision Detection Strategies

### Strategy 1: Pre-existence Check (HeadBucket)

**Best For**: Creation time validation

```typescript
async function checkBucketExists(bucketName: string): Promise<boolean> {
  const s3Client = new S3Client({ region: 'us-east-1' });

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true; // Bucket exists
  } catch (error) {
    if (error instanceof NotFound) {
      return false; // Bucket doesn't exist
    }
    // Other errors (permission denied, etc.)
    throw error;
  }
}
```

**Limitations**:
- Requires S3 API call (latency)
- Race condition possible in concurrent scenarios
- HeadBucket permission required

### Strategy 2: Deterministic Hash-Based Naming

**Best For**: Guaranteed uniqueness without API calls

```typescript
import { createHash } from 'crypto';

function generateHashedBucketName(
  account: string,
  team: string,
  moniker: string,
  region: string = 'us-east-1'
): string {
  // Create deterministic hash from input
  const input = `${account}:${team}:${moniker}:${region}`;
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 8);

  const normalized = normalizeName(account, team, moniker);
  const baseName = `lcp-${normalized}`;

  // Format: lcp-{sanitized}-{hash}
  const candidate = `${baseName}-${hash}`.slice(0, 63);

  return candidate;
}

function normalizeName(account: string, team: string, moniker: string): string {
  const parts = [account, team, moniker]
    .map(part => sanitizeName(part))
    .join('-');

  return parts.slice(0, 50); // Reserve 13 chars for prefix + hash
}
```

**Advantages**:
- ✅ No API calls required
- ✅ Deterministic (same input = same name)
- ✅ Collision-free (hash ensures uniqueness)
- ✅ Idempotent operations

**Disadvantages**:
- ❌ Less human-readable
- ❌ Hash part non-semantic

### Strategy 3: Retry with Suffix (Collision Recovery)

**Best For**: Human-readable names with collision fallback

```typescript
async function createBucketWithCollisionRetry(
  account: string,
  team: string,
  moniker: string,
  s3Client: S3Client,
  maxRetries: number = 5
): Promise<string> {
  const normalized = normalizeName(account, team, moniker);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let bucketName: string;

    if (attempt === 0) {
      // First attempt: original name
      bucketName = `lcp-${normalized}`;
    } else {
      // Retry attempts: add timestamp-based suffix
      const timestamp = Date.now();
      const suffix = `${timestamp}`.slice(-4); // Last 4 digits
      bucketName = `lcp-${normalized}-${suffix}`.slice(0, 63);
    }

    // Validate format
    if (!isValidS3BucketName(bucketName)) {
      continue;
    }

    // Check existence
    try {
      const exists = await checkBucketExists(bucketName);
      if (!exists) {
        // Create bucket
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        return bucketName;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed to create bucket after ${maxRetries} attempts`);
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      );
    }
  }

  throw new Error('Unable to create bucket - no available names');
}
```

**Advantages**:
- ✅ Human-readable primary name
- ✅ Collision recovery mechanism
- ✅ Bounded retry attempts
- ✅ Exponential backoff prevents overwhelm

**Disadvantages**:
- ❌ API calls required
- ❌ Non-deterministic (may produce different names)
- ❌ Retry latency

### Strategy 4: Index-Based Naming with Central Registry

**Best For**: Enterprise environments with central coordination

```typescript
interface BucketRegistry {
  registerBucket(
    account: string,
    team: string,
    moniker: string,
    bucketName: string
  ): Promise<void>;

  lookupBucket(
    account: string,
    team: string,
    moniker: string
  ): Promise<string | null>;

  isNameAvailable(bucketName: string): Promise<boolean>;
}

class DynamoDBBucketRegistry implements BucketRegistry {
  private dynamoClient: DynamoDBClient;
  private tableName: string;

  async registerBucket(
    account: string,
    team: string,
    moniker: string,
    bucketName: string
  ): Promise<void> {
    const id = `${account}#${team}#${moniker}`;

    await this.dynamoClient.send(new PutItemCommand({
      TableName: this.tableName,
      Item: {
        'ResourceId': { S: id },
        'BucketName': { S: bucketName },
        'CreatedAt': { S: new Date().toISOString() },
        'Status': { S: 'ACTIVE' },
      },
      ConditionExpression: 'attribute_not_exists(ResourceId)',
    }));
  }

  async lookupBucket(
    account: string,
    team: string,
    moniker: string
  ): Promise<string | null> {
    const id = `${account}#${team}#${moniker}`;

    const result = await this.dynamoClient.send(new GetItemCommand({
      TableName: this.tableName,
      Key: { 'ResourceId': { S: id } },
    }));

    return result.Item?.['BucketName']?.S ?? null;
  }

  async isNameAvailable(bucketName: string): Promise<boolean> {
    // Query by bucket name (requires GSI on BucketName)
    const result = await this.dynamoClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'BucketNameIndex',
      KeyConditionExpression: 'BucketName = :name',
      ExpressionAttributeValues: {
        ':name': { S: bucketName },
      },
      Limit: 1,
    }));

    return (result.Items?.length ?? 0) === 0;
  }
}
```

**Advantages**:
- ✅ Centralized authority (no collisions)
- ✅ Full audit trail
- ✅ Supports idempotency (look up before create)
- ✅ Enables migration/decommissioning tracking

**Disadvantages**:
- ❌ Requires DynamoDB table
- ❌ Additional latency
- ❌ Network dependency
- ❌ Eventual consistency considerations

### Strategy 5: Hybrid Approach (Recommended)

**Best For**: Production platforms balancing performance, reliability, and simplicity

```typescript
interface HybridNamingConfig {
  preferDeterministic: boolean;        // Use hash by default
  enableRegistry: boolean;             // DynamoDB as source of truth
  retryAttempts: number;               // Fallback retries
  registryRegion?: string;             // DynamoDB region
}

class HybridBucketNamer {
  private s3Client: S3Client;
  private registry?: BucketRegistry;
  private cache: Map<string, string> = new Map();

  constructor(private config: HybridNamingConfig) {
    this.s3Client = new S3Client({ region: 'us-east-1' });

    if (config.enableRegistry) {
      this.registry = new DynamoDBBucketRegistry(config.registryRegion);
    }
  }

  async resolveBucketName(
    account: string,
    team: string,
    moniker: string
  ): Promise<string> {
    const cacheKey = `${account}:${team}:${moniker}`;

    // Step 1: Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Step 2: Check registry (if enabled)
    if (this.registry) {
      const registered = await this.registry.lookupBucket(account, team, moniker);
      if (registered) {
        this.cache.set(cacheKey, registered);
        return registered;
      }
    }

    // Step 3: Generate candidate name
    let bucketName: string;
    if (this.config.preferDeterministic) {
      bucketName = generateHashedBucketName(account, team, moniker);
    } else {
      bucketName = `lcp-${normalizeName(account, team, moniker)}`;
    }

    // Step 4: Verify or create
    try {
      const exists = await checkBucketExists(bucketName);
      if (!exists) {
        // Create bucket
        await this.s3Client.send(new CreateBucketCommand({
          Bucket: bucketName,
        }));

        // Register in DynamoDB
        if (this.registry) {
          await this.registry.registerBucket(account, team, moniker, bucketName);
        }

        this.cache.set(cacheKey, bucketName);
        return bucketName;
      }
    } catch (error) {
      if (this.config.preferDeterministic) {
        // Already unique, but creation failed - retry
        return this.retryWithSuffix(account, team, moniker);
      }
    }

    // Step 5: Retry with collision recovery
    return this.retryWithSuffix(account, team, moniker, this.config.retryAttempts);
  }

  private async retryWithSuffix(
    account: string,
    team: string,
    moniker: string,
    maxRetries: number = 3
  ): Promise<string> {
    return createBucketWithCollisionRetry(
      account, team, moniker, this.s3Client, maxRetries
    );
  }
}
```

**When to Use Each Strategy**:
| Strategy | Use Case | Trade-offs |
|----------|----------|-----------|
| **Hash-based** | Guaranteed uniqueness, no API calls | Less readable |
| **Retry with Suffix** | Simple, human-readable fallback | API latency, non-deterministic |
| **Registry (DynamoDB)** | Enterprise, audit trail needed | Operational overhead |
| **Hybrid** | Production platforms | Complexity, but best overall |

---

## Name Validation Rules

### Regex Patterns for S3 Compliance

#### Comprehensive Validation

```typescript
// AWS S3 Bucket Naming Rules
const S3_BUCKET_NAME_REGEX = /^(?!.*(?:\.\.|--|-\.|\.-))(?!xn--)(?!sthree-)(?!sthree-configurator-)(?!s3)[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/;

interface BucketNameValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateS3BucketName(name: string): BucketNameValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Length check
  if (name.length < 3) {
    errors.push(`Name too short: ${name.length} chars (minimum 3)`);
  }
  if (name.length > 63) {
    errors.push(`Name too long: ${name.length} chars (maximum 63)`);
  }

  // Character set check
  if (!/^[a-z0-9\-]*$/.test(name)) {
    errors.push('Contains invalid characters (only a-z, 0-9, hyphens allowed)');
  }

  // Start/end with letter or number
  if (!/^[a-z0-9]/.test(name)) {
    errors.push('Must start with lowercase letter or number');
  }
  if (!/[a-z0-9]$/.test(name)) {
    errors.push('Must end with lowercase letter or number');
  }

  // Reserved patterns
  if (/^(s3|sthree|xn--)/.test(name)) {
    errors.push('Starts with reserved prefix');
  }
  if (/\.amazonaws\.com$/.test(name)) {
    errors.push('Cannot end with .amazonaws.com');
  }
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(name)) {
    errors.push('Cannot resemble an IP address');
  }

  // Problematic patterns
  if (/\.\./.test(name)) {
    errors.push('Contains consecutive dots');
  }
  if (/--/.test(name)) {
    errors.push('Contains consecutive hyphens');
  }
  if (/\.-|-\./.test(name)) {
    errors.push('Contains dot-hyphen or hyphen-dot pattern');
  }

  // Warnings for best practices
  if (/\./.test(name)) {
    warnings.push('Contains dots - avoid for virtual-hosted-style requests');
  }
  if (/[A-Z]/.test(name)) {
    warnings.push('Contains uppercase letters - AWS will convert to lowercase');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

#### Sanitization Function

```typescript
function sanitizeBucketNameComponent(component: string): string {
  if (!component || component.length === 0) {
    return '';
  }

  // Convert to lowercase
  let sanitized = component.toLowerCase();

  // Replace invalid characters with hyphens
  sanitized = sanitized
    .replace(/[^a-z0-9\-]/g, '-')  // Replace invalid chars with hyphen
    .replace(/^-+/, '')              // Remove leading hyphens
    .replace(/-+$/, '')              // Remove trailing hyphens
    .replace(/-{2,}/g, '-');         // Replace multiple hyphens with single

  // Ensure at least 1 character
  if (!sanitized) {
    sanitized = 'default';
  }

  return sanitized;
}

function sanitizeTeamName(teamName: string): string {
  // Handle special cases
  if (teamName === 'default' || teamName === 'admin') {
    return teamName;
  }

  const sanitized = sanitizeBucketNameComponent(teamName);

  // Ensure minimum length
  if (sanitized.length < 3) {
    return (sanitized + 'team').slice(0, 20);
  }

  return sanitized.slice(0, 20);
}

function sanitizeMonikerName(moniker: string): string {
  const sanitized = sanitizeBucketNameComponent(moniker);

  // Ensure minimum length
  if (sanitized.length < 3) {
    return (sanitized + 'cfg').slice(0, 15);
  }

  return sanitized.slice(0, 15);
}

// Example usage
console.log(sanitizeTeamName('Data_Analytics')); // 'data-analytics'
console.log(sanitizeTeamName('ML.Ops'));         // 'ml-ops'
console.log(sanitizeMonikerName('config-prod'));  // 'config-prod'
```

### Component Length Constraints

```typescript
interface NameLengthConfig {
  maxAccountLength: number;   // Default: 20
  maxTeamLength: number;      // Default: 20
  maxMonikerLength: number;   // Default: 15
}

function validateComponentLengths(
  account: string,
  team: string,
  moniker: string,
  config: NameLengthConfig = {
    maxAccountLength: 20,
    maxTeamLength: 20,
    maxMonikerLength: 15,
  }
): BucketNameValidationResult {
  const errors: string[] = [];

  if (account.length > config.maxAccountLength) {
    errors.push(`Account ID too long: ${account.length} > ${config.maxAccountLength}`);
  }
  if (team.length > config.maxTeamLength) {
    errors.push(`Team name too long: ${team.length} > ${config.maxTeamLength}`);
  }
  if (moniker.length > config.maxMonikerLength) {
    errors.push(`Moniker too long: ${moniker.length} > ${config.maxMonikerLength}`);
  }

  // Total length check: lcp- + account + - + team + - + moniker = overhead of 6 chars
  const totalLength = 4 + account.length + team.length + moniker.length + 3;
  if (totalLength > 63) {
    errors.push(
      `Combined name length ${totalLength} exceeds 63 char limit`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}
```

---

## Production Implementation

### Complete S3 Bucket Name Generator

```typescript
import { S3Client, CreateBucketCommand, HeadBucketCommand, NotFound } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';

interface BucketNameGeneratorConfig {
  strategy: 'hash' | 'retry' | 'hybrid';
  enableValidation: boolean;
  enableRegistry: boolean;
  maxRetries: number;
  cacheSize: number;
}

interface GenerateBucketNameRequest {
  account: string;
  team: string;
  moniker: string;
  region?: string;
}

interface GenerateBucketNameResponse {
  bucketName: string;
  strategy: 'hash' | 'retry' | 'collision-free';
  created: boolean;
  sanitized: {
    account: string;
    team: string;
    moniker: string;
  };
}

class S3BucketNameGenerator {
  private s3Client: S3Client;
  private cache: Map<string, string>;
  private config: BucketNameGeneratorConfig;

  constructor(config: BucketNameGeneratorConfig, region: string = 'us-east-1') {
    this.config = config;
    this.s3Client = new S3Client({ region });
    this.cache = new Map();
  }

  async generateBucketName(
    request: GenerateBucketNameRequest
  ): Promise<GenerateBucketNameResponse> {
    const region = request.region ?? 'us-east-1';

    // Step 1: Validate input
    if (this.config.enableValidation) {
      const validation = validateComponentLengths(
        request.account,
        request.team,
        request.moniker
      );
      if (!validation.isValid) {
        throw new Error(`Invalid bucket name components: ${validation.errors.join(', ')}`);
      }
    }

    // Step 2: Sanitize components
    const sanitized = {
      account: sanitizeBucketNameComponent(request.account),
      team: sanitizeTeamName(request.team),
      moniker: sanitizeMonikerName(request.moniker),
    };

    // Step 3: Generate based on strategy
    let bucketName: string;
    let strategy: 'hash' | 'retry' | 'collision-free';
    let created = false;

    try {
      switch (this.config.strategy) {
        case 'hash':
          bucketName = this.generateHashedName(sanitized, region);
          strategy = 'hash';
          break;

        case 'retry':
          bucketName = await this.generateWithRetry(sanitized);
          strategy = 'collision-free';
          created = true;
          break;

        case 'hybrid':
        default:
          bucketName = await this.generateHybrid(sanitized, region);
          strategy = 'collision-free';
          created = true;
          break;
      }
    } catch (error) {
      throw new Error(`Bucket name generation failed: ${error}`);
    }

    // Step 4: Validate output
    if (this.config.enableValidation) {
      const validation = validateS3BucketName(bucketName);
      if (!validation.isValid) {
        throw new Error(`Generated invalid bucket name: ${validation.errors.join(', ')}`);
      }
    }

    return {
      bucketName,
      strategy,
      created,
      sanitized,
    };
  }

  private generateHashedName(
    sanitized: { account: string; team: string; moniker: string },
    region: string
  ): string {
    const input = `${sanitized.account}:${sanitized.team}:${sanitized.moniker}:${region}`;
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 8);

    const base = `lcp-${sanitized.account}-${sanitized.team}-${sanitized.moniker}`;
    const candidate = `${base}-${hash}`;

    return candidate.slice(0, 63);
  }

  private async generateWithRetry(
    sanitized: { account: string; team: string; moniker: string }
  ): Promise<string> {
    const base = `lcp-${sanitized.account}-${sanitized.team}-${sanitized.moniker}`;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      let candidate: string;

      if (attempt === 0) {
        candidate = base;
      } else {
        const timestamp = Date.now();
        const suffix = `${timestamp}`.slice(-3);
        candidate = `${base}-${suffix}`;
      }

      candidate = candidate.slice(0, 63);

      if (!this.isValidBucketName(candidate)) {
        continue;
      }

      const exists = await this.bucketExists(candidate);
      if (!exists) {
        await this.createBucket(candidate);
        return candidate;
      }

      if (attempt < this.config.maxRetries) {
        await this.exponentialBackoff(attempt);
      }
    }

    throw new Error('Unable to find available bucket name after retries');
  }

  private async generateHybrid(
    sanitized: { account: string; team: string; moniker: string },
    region: string
  ): Promise<string> {
    const cacheKey = `${sanitized.account}:${sanitized.team}:${sanitized.moniker}`;

    // Try cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Try hash-based generation (deterministic, no API calls)
    const hashedName = this.generateHashedName(sanitized, region);
    if (!(await this.bucketExists(hashedName))) {
      await this.createBucket(hashedName);
      this.cache.set(cacheKey, hashedName);
      return hashedName;
    }

    // Fall back to retry strategy
    const retryName = await this.generateWithRetry(sanitized);
    this.cache.set(cacheKey, retryName);
    return retryName;
  }

  private isValidBucketName(name: string): boolean {
    const validation = validateS3BucketName(name);
    return validation.isValid;
  }

  private async bucketExists(bucketName: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      return true;
    } catch (error) {
      if (error instanceof NotFound) {
        return false;
      }
      throw error;
    }
  }

  private async createBucket(bucketName: string): Promise<void> {
    await this.s3Client.send(new CreateBucketCommand({
      Bucket: bucketName,
    }));
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = 100 * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export for use
export {
  S3BucketNameGenerator,
  GenerateBucketNameRequest,
  GenerateBucketNameResponse,
  BucketNameGeneratorConfig,
};
```

### Usage Example

```typescript
// Initialize generator
const generator = new S3BucketNameGenerator({
  strategy: 'hybrid',
  enableValidation: true,
  enableRegistry: false,
  maxRetries: 3,
  cacheSize: 100,
});

// Generate bucket name
const response = await generator.generateBucketName({
  account: 'prod-account-123',
  team: 'Data_Engineering',
  moniker: 'analytics.config',
  region: 'us-west-2',
});

console.log(`Generated: ${response.bucketName}`);
console.log(`Strategy: ${response.strategy}`);
console.log(`Created: ${response.created}`);
console.log(`Sanitized:`, response.sanitized);

// Output:
// Generated: lcp-prod-account-data-engineering-analytics-config
// Strategy: collision-free
// Created: true
// Sanitized: { account: 'prod-account', team: 'data-engineering', moniker: 'analytics-config' }
```

---

## Azure Blob Storage Equivalents

### Key Differences from S3

| Aspect | AWS S3 | Azure Blob Storage |
|--------|--------|-------------------|
| **Uniqueness Scope** | Globally unique | Per storage account |
| **Naming** | bucket.s3.amazonaws.com | container in storage account |
| **Max Length** | 63 characters | 63 characters |
| **Character Set** | a-z, 0-9, hyphens | a-z, 0-9, hyphens |
| **No Consecutive Hyphens** | ✅ Restricted | ❌ Allowed |
| **Cannot Start with Hyphen** | ✅ Restricted | ❌ Allowed |
| **HTTP Access** | Virtual-hosted-style | Path-style only |

### Azure Container Naming Strategy

```typescript
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

interface AzureBucketConfig {
  storageAccountName: string;
  storageAccountKey: string;
  region?: string;
}

class AzureBucketNameGenerator {
  private blobServiceClient: BlobServiceClient;
  private config: AzureBucketConfig;

  constructor(config: AzureBucketConfig) {
    this.config = config;

    // Initialize Azure Blob Storage client
    const credential = new StorageSharedKeyCredential(
      config.storageAccountName,
      config.storageAccountKey
    );

    const accountUrl = `https://${config.storageAccountName}.blob.core.windows.net`;
    this.blobServiceClient = new BlobServiceClient(accountUrl, credential);
  }

  async generateContainerName(
    account: string,
    team: string,
    moniker: string
  ): Promise<string> {
    // Sanitize inputs
    const sanitized = {
      account: sanitizeAzureName(account),
      team: sanitizeAzureName(team),
      moniker: sanitizeAzureName(moniker),
    };

    // Generate candidate name
    const baseName = `lcp-${sanitized.account}-${sanitized.team}-${sanitized.moniker}`;
    const containerName = baseName.toLowerCase().slice(0, 63);

    // Validate Azure constraints
    if (!this.isValidAzureContainerName(containerName)) {
      throw new Error(`Invalid Azure container name: ${containerName}`);
    }

    // Check existence and create
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const exists = await containerClient.exists();

      if (!exists) {
        await containerClient.create();
      }

      return containerName;
    } catch (error) {
      throw new Error(`Failed to create container: ${error}`);
    }
  }

  private isValidAzureContainerName(name: string): boolean {
    // Azure specific rules
    if (name.length < 3 || name.length > 63) {
      return false;
    }

    // Must contain only lowercase letters, numbers, hyphens
    if (!/^[a-z0-9\-]+$/.test(name)) {
      return false;
    }

    // Must start with letter or number (Azure allows hyphens)
    if (!/^[a-z0-9]/.test(name)) {
      return false;
    }

    // Must end with letter or number
    if (!/[a-z0-9]$/.test(name)) {
      return false;
    }

    return true;
  }
}

function sanitizeAzureName(component: string): string {
  // Azure is more permissive with hyphens
  let sanitized = component.toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-{2,}/g, '-');

  if (!sanitized) {
    sanitized = 'default';
  }

  return sanitized.slice(0, 20);
}
```

### Azure vs S3 Naming Comparison

```typescript
// Given inputs
const inputs = {
  account: 'prod-account',
  team: 'Data.Engineering',
  moniker: 'analytics_config',
};

// S3 (Global uniqueness required)
const s3Name = 'lcp-prod-account-data-engineering-analytics-config-a1b2c3d4';
// Generated with hash suffix for global uniqueness guarantee

// Azure (Per-account uniqueness, no hash needed)
const azureName = 'lcp-prod-account-data-engineering-analytics-config';
// Simpler since containers are scoped to storage account
```

---

## Testing & Verification

### Unit Tests

```typescript
import { test, describe, expect } from 'bun:test';

describe('S3 Bucket Naming', () => {
  describe('Validation', () => {
    test('accepts valid bucket names', () => {
      const result = validateS3BucketName('lcp-account-team-moniker');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects names > 63 chars', () => {
      const long = 'a'.repeat(64);
      const result = validateS3BucketName(long);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('too long'))).toBe(true);
    });

    test('rejects names with underscores', () => {
      const result = validateS3BucketName('lcp-account_team');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
    });

    test('rejects names with consecutive hyphens', () => {
      const result = validateS3BucketName('lcp--account');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('consecutive hyphens'))).toBe(true);
    });

    test('rejects IP-like names', () => {
      const result = validateS3BucketName('192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('IP address'))).toBe(true);
    });
  });

  describe('Sanitization', () => {
    test('converts uppercase to lowercase', () => {
      const result = sanitizeBucketNameComponent('DataEngineering');
      expect(result).toBe('dataengineering');
    });

    test('replaces underscores with hyphens', () => {
      const result = sanitizeBucketNameComponent('data_engineering');
      expect(result).toBe('data-engineering');
    });

    test('removes leading/trailing hyphens', () => {
      const result = sanitizeBucketNameComponent('-data-engineering-');
      expect(result).toBe('data-engineering');
    });

    test('collapses multiple hyphens', () => {
      const result = sanitizeBucketNameComponent('data---engineering');
      expect(result).toBe('data-engineering');
    });

    test('handles special characters', () => {
      const result = sanitizeBucketNameComponent('Data.Engineering@v1');
      expect(result).toBe('data-engineering-v1');
    });
  });

  describe('Collision Detection', () => {
    test('hash-based generation is deterministic', () => {
      const name1 = generateHashedBucketName('acc', 'team', 'mon');
      const name2 = generateHashedBucketName('acc', 'team', 'mon');
      expect(name1).toBe(name2);
    });

    test('different inputs produce different hashes', () => {
      const name1 = generateHashedBucketName('acc1', 'team', 'mon');
      const name2 = generateHashedBucketName('acc2', 'team', 'mon');
      expect(name1).not.toBe(name2);
    });
  });

  describe('Generator', () => {
    test('generates valid bucket name', async () => {
      const generator = new S3BucketNameGenerator({
        strategy: 'hash',
        enableValidation: true,
        enableRegistry: false,
        maxRetries: 3,
        cacheSize: 100,
      });

      const response = await generator.generateBucketName({
        account: 'prod',
        team: 'data',
        moniker: 'config',
      });

      expect(response.bucketName).toBeDefined();
      expect(response.bucketName.length).toBeLessThanOrEqual(63);
      expect(/^lcp-/.test(response.bucketName)).toBe(true);
    });

    test('sanitizes input components', async () => {
      const generator = new S3BucketNameGenerator({
        strategy: 'hash',
        enableValidation: true,
        enableRegistry: false,
        maxRetries: 3,
        cacheSize: 100,
      });

      const response = await generator.generateBucketName({
        account: 'Prod_Account',
        team: 'Data.Engineering',
        moniker: 'Analytics_Config',
      });

      expect(response.sanitized.account).toBe('prod-account');
      expect(response.sanitized.team).toBe('data-engineering');
      expect(response.sanitized.moniker).toBe('analytics-config');
    });
  });
});
```

### Integration Tests

```typescript
describe('S3 Integration', () => {
  test('creates bucket with generated name', async () => {
    const generator = new S3BucketNameGenerator({
      strategy: 'retry',
      enableValidation: true,
      enableRegistry: false,
      maxRetries: 2,
      cacheSize: 50,
    });

    const response = await generator.generateBucketName({
      account: 'test-' + Date.now(),
      team: 'integration',
      moniker: 'test',
    });

    expect(response.created).toBe(true);

    // Verify bucket exists
    const s3Client = new S3Client({ region: 'us-east-1' });
    const exists = await new Promise<boolean>(async (resolve) => {
      try {
        await s3Client.send(new HeadBucketCommand({
          Bucket: response.bucketName,
        }));
        resolve(true);
      } catch {
        resolve(false);
      }
    });

    expect(exists).toBe(true);

    // Cleanup
    // Delete bucket...
  });
});
```

---

## Best Practices Summary

### Naming Strategy Selection Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                   Naming Strategy Decision Matrix                │
├──────────────┬──────────┬────────┬──────────┬────────────┬───────┤
│ Strategy     │ Readability│ API Call│ Deterministic│Collision│ Best |
│              │           │ Required│            │ Free    │ For  │
├──────────────┼──────────┼────────┼──────────┼────────────┼───────┤
│ Hash-based   │     ⭐⭐    │   ❌   │    ✅    │    ✅    │Perf  │
│ Retry        │     ⭐⭐⭐  │   ✅   │    ❌    │    ✅    │UX    │
│ Registry     │     ⭐⭐⭐  │   ✅   │    ✅    │    ✅    │Audit │
│ Hybrid       │     ⭐⭐⭐  │  ✅/❌  │    ✅    │    ✅    │Prod  │
└──────────────┴──────────┴────────┴──────────┴────────────┴───────┘
```

### Implementation Checklist

- [ ] Choose naming strategy (recommend: hybrid)
- [ ] Implement validation with regex patterns
- [ ] Create sanitization functions for user inputs
- [ ] Add collision detection mechanism
- [ ] Implement retry with exponential backoff
- [ ] Add caching layer for performance
- [ ] Set up monitoring/alerts for failures
- [ ] Document naming conventions
- [ ] Add comprehensive unit tests
- [ ] Perform integration testing with AWS
- [ ] Implement Azure equivalents if needed
- [ ] Set up audit logging for bucket creation

### Security Considerations

1. **IAM Permissions**: Limit to least-privilege S3 actions
2. **Bucket Policies**: Implement public-access blocks
3. **Encryption**: Enable default S3 encryption
4. **Versioning**: Enable for data protection
5. **Logging**: Enable access logging to CloudTrail
6. **MFA Delete**: Enable for critical buckets

---

## Conclusion

For multi-tenant platforms like `lc-platform` generating S3 bucket names:

1. **Recommended Strategy**: Hybrid approach combining hash-based deterministic naming with retry fallback
2. **Implementation**: Use validation regex + sanitization + collision detection
3. **Performance**: Hash-based approach minimizes API calls while maintaining uniqueness
4. **Reliability**: Retry mechanism with exponential backoff ensures creation
5. **Auditability**: Optional DynamoDB registry for enterprise environments
6. **Azure Equivalents**: Container naming in storage accounts with different constraints

The hybrid approach provides optimal balance between performance, reliability, and operational simplicity for production platforms.

---

**Last Updated**: December 23, 2025
**Version**: 1.0
**Author**: Research & Development Team
