# Configuration Versioning Strategies for Infrastructure-as-Code Platforms

## Executive Summary

This research document provides a comprehensive analysis of configuration versioning strategies for cloud-based infrastructure-as-code platforms, with specific recommendations for storing and managing versioned application configurations in S3-compatible storage systems.

**Key Finding**: A hybrid approach combining **semantic versioning (semver) with ISO 8601 timestamps** provides the best balance for infrastructure configurations, enabling semantic clarity, chronological ordering, and easy rollback capabilities.

---

## 1. Versioning Strategy Comparison

### 1.1 Semantic Versioning (SemVer)

**Format**: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`, `2.0.0-beta.1`)

#### Characteristics
```
Version Format: X.Y.Z[-prerelease][+build]
Examples:
  - 1.0.0          (initial release)
  - 1.2.3          (patch update)
  - 2.0.0          (breaking change)
  - 2.1.0-alpha.1  (pre-release)
```

#### Advantages
- **Semantic Clarity**: Immediately communicates the nature of changes (breaking, feature, bug fix)
- **Human-Readable**: Developers understand version significance without additional context
- **Dependency Management**: Clear compatibility rules (compatible with 1.x if currently at 1.2.3)
- **Change Communication**: `MAJOR.MINOR.PATCH` conveys change scope
- **Industry Standard**: Widely adopted in software versioning (npm, Maven, pip)

#### Disadvantages
- **Requires Manual Assignment**: Must decide version bump significance
- **Ordering Issues**: Requires custom comparison logic (`1.9.0` < `1.10.0` numerically, not lexicographically)
- **Not Chronological**: Version number doesn't indicate creation time
- **Effort Intensive**: Team discipline required for consistent versioning
- **Query Challenges**: Getting "all versions before date X" requires metadata lookup

#### Use Cases
- Application versioning and releases
- Public API contracts
- Internal service versions with explicit compatibility contracts
- When you want to communicate feature significance

#### Implementation Example
```typescript
// Version Comparison Utility
class SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[] | null;
  build: string | null;

  constructor(version: string) {
    // Parse semver string
    const match = version.match(
      /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
    );
    if (!match) throw new Error(`Invalid semver: ${version}`);

    this.major = parseInt(match[1]);
    this.minor = parseInt(match[2]);
    this.patch = parseInt(match[3]);
    this.prerelease = match[4] ? match[4].split('.') : null;
    this.build = match[5] || null;
  }

  compare(other: SemanticVersion): number {
    // Major.Minor.Patch comparison
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    if (this.patch !== other.patch) return this.patch - other.patch;

    // Pre-release comparison (1.0.0-alpha < 1.0.0)
    if (this.prerelease === null && other.prerelease === null) return 0;
    if (this.prerelease === null) return 1;
    if (other.prerelease === null) return -1;

    // Pre-release ordering
    for (let i = 0; i < Math.max(this.prerelease.length, other.prerelease.length); i++) {
      const a = this.prerelease[i] || '';
      const b = other.prerelease[i] || '';
      if (a === b) continue;
      // Numeric comparison if both are numbers
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    }
    return 0;
  }

  isGreaterThan(other: SemanticVersion): boolean {
    return this.compare(other) > 0;
  }

  isSatisfies(range: string): boolean {
    // Simplified: check against patterns like "^1.2.3", "~1.2.3", "1.2.*"
    if (range.startsWith('^')) {
      // Caret: compatible with version (same major)
      const constraint = new SemanticVersion(range.slice(1));
      return this.major === constraint.major && this.isGreaterThan(constraint);
    }
    if (range.startsWith('~')) {
      // Tilde: compatible patch changes
      const constraint = new SemanticVersion(range.slice(1));
      return this.major === constraint.major &&
             this.minor === constraint.minor &&
             this.isGreaterThan(constraint);
    }
    return false;
  }
}
```

---

### 1.2 Timestamp-Based Versioning

**Format**: ISO 8601 UTC timestamp (e.g., `2025-12-23T18:45:32Z`, `20251223T184532Z`)

#### Characteristics
```
Format Options:
  - Full ISO 8601: 2025-12-23T18:45:32.123Z
  - Compact:       20251223T184532Z
  - Date-only:     2025-12-23
  - Unix Epoch:    1735008332 (seconds)
```

#### Advantages
- **Natural Ordering**: Lexicographic ordering matches chronological order
- **Automatic Sorting**: Can sort as strings without custom logic
- **Timeline Clarity**: Immediately know creation time
- **Query-Friendly**: Easy to query "versions after X" or "versions in range Y-Z"
- **Unique Guarantee**: System time ensures uniqueness per configuration
- **Low Overhead**: No manual version management
- **Audit Trail**: Version itself contains when it was created

#### Disadvantages
- **No Semantic Meaning**: Cannot distinguish breaking vs. patch changes
- **Time Precision**: Collision risk if multiple versions created within millisecond
- **Timezone Issues**: Must standardize on UTC
- **Human Readability**: Less intuitive than semver for non-technical users
- **Not Environment-Specific**: No correlation with business milestones (releases)
- **Can Be Verbose**: Long strings in logs and configurations

#### Use Cases
- Infrastructure configurations (Terraform, CloudFormation, IaC)
- Automatic/continuous deployment pipelines
- Audit logging and compliance requirements
- Database schema versioning
- Log aggregation with chronological ordering
- When you need automatic version generation

#### Implementation Example
```typescript
// Timestamp-Based Version Utility
class TimestampVersion {
  timestamp: Date;
  isoString: string;
  compact: string;

  constructor(dateOrString?: string | Date) {
    if (!dateOrString) {
      this.timestamp = new Date();
    } else if (typeof dateOrString === 'string') {
      this.timestamp = new Date(dateOrString);
      if (isNaN(this.timestamp.getTime())) {
        throw new Error(`Invalid timestamp: ${dateOrString}`);
      }
    } else {
      this.timestamp = dateOrString;
    }

    // Ensure UTC
    this.isoString = this.timestamp.toISOString();
    this.compact = this.isoString.replace(/[-:.Z]/g, '');
  }

  compare(other: TimestampVersion): number {
    return this.timestamp.getTime() - other.timestamp.getTime();
  }

  isOlderThan(other: TimestampVersion): boolean {
    return this.compare(other) < 0;
  }

  isNewerThan(other: TimestampVersion): boolean {
    return this.compare(other) > 0;
  }

  isInRange(startDate: Date, endDate: Date): boolean {
    return this.timestamp >= startDate && this.timestamp <= endDate;
  }

  getDaysBefore(other: TimestampVersion): number {
    const diffMs = this.timestamp.getTime() - other.timestamp.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  toS3Path(prefix: string = 'v'): string {
    // Generate: 20251223T184532Z
    return `${prefix}${this.compact}`;
  }

  static generateVersionId(): string {
    // For S3-friendly format
    return new TimestampVersion().compact;
  }

  static parseFromS3Path(s3Key: string): TimestampVersion {
    // Extract from paths like: versions/20251223T184532Z/config.json
    const match = s3Key.match(/(\d{8}T\d{6}Z)/);
    if (!match) throw new Error(`No valid timestamp in: ${s3Key}`);

    const compact = match[1];
    const iso = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}Z`;
    return new TimestampVersion(iso);
  }
}

// Sorting versions chronologically
const versions = [
  new TimestampVersion('2025-12-23T18:45:32Z'),
  new TimestampVersion('2025-12-20T10:15:00Z'),
  new TimestampVersion('2025-12-25T08:30:15Z'),
];

// Sort by string (works perfectly for ISO timestamps!)
const sorted = versions.sort((a, b) => a.isoString.localeCompare(b.isoString));
console.log(sorted.map(v => v.isoString));
// Output: [2025-12-20T10:15:00Z, 2025-12-23T18:45:32Z, 2025-12-25T08:30:15Z]
```

---

### 1.3 Content Hash-Based Versioning

**Format**: Hash digest (e.g., `sha256:a7f3c8e2d1f4b9e6`, MD5: `5d41402abc4b2a76`)

#### Characteristics
```
Hash Algorithms:
  - SHA-256: a7f3c8e2d1f4b9e634c8d7f2e9a4b1c6d3e5f8a0b2c4d6e7f9a1b3c5d7e9f1 (64 chars)
  - SHA-1:   2aae6c35c94fcfb415dbe95f408b9ce91ee846ed (40 chars)
  - MD5:     5d41402abc4b2a76b9719d911017c592 (32 chars)

Integrity-based:
  - CRC32:   a1b2c3d4 (8 chars)
```

#### Advantages
- **Content Integrity**: Hash directly represents configuration content
- **Deduplication**: Identical configs with different timestamps have same hash
- **Change Detection**: Instantly know if configuration changed
- **Deterministic**: Same content always produces same hash
- **Distributed Trust**: No central version numbering required
- **Git-Like**: Familiar pattern from version control systems
- **Collision Resistance**: Cryptographically infeasible to find collisions (SHA-256)

#### Disadvantages
- **No Timestamp Info**: Cannot tell when version was created from hash alone
- **Lexicographic Ordering Meaningless**: Hashes don't sort chronologically
- **Not Human-Friendly**: Difficult to manually reference specific versions
- **Query Complexity**: Cannot query "versions from 2025-12" without metadata
- **Lookup Required**: Must maintain separate metadata for timestamps, authors, changelogs
- **No Semantic Meaning**: Doesn't communicate change type or significance
- **Immutable by Nature**: Great for content integrity, but inflexible for corrections

#### Use Cases
- Docker image versioning (digest-based)
- Content delivery networks (cache validation)
- Distributed systems (consensus and replication)
- Block/content-addressable storage
- When integrity verification is critical
- Git-style version control for configurations

#### Implementation Example
```typescript
// Hash-Based Version Utility
import * as crypto from 'crypto';

class HashVersion {
  algorithm: 'sha256' | 'sha1' | 'md5';
  digest: string;
  contentHash: string;

  constructor(content: Buffer | string, algorithm: 'sha256' | 'sha1' | 'md5' = 'sha256') {
    this.algorithm = algorithm;
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    this.digest = hash.digest('hex');
    this.contentHash = `${algorithm}:${this.digest}`;
  }

  equals(other: HashVersion): boolean {
    return this.digest === other.digest && this.algorithm === other.algorithm;
  }

  startsWith(prefix: string): boolean {
    return this.digest.startsWith(prefix);
  }

  toShortForm(length: number = 12): string {
    return this.digest.slice(0, length);
  }

  static verifyIntegrity(content: Buffer | string, expectedHash: string): boolean {
    const [algo, digest] = expectedHash.split(':');
    const version = new HashVersion(content, algo as any);
    return version.digest === digest;
  }

  toS3Path(prefix: string = 'h'): string {
    // Generate: h-sha256-a7f3c8e2d1f4b9e6
    return `${prefix}-${this.algorithm}-${this.digest.slice(0, 16)}`;
  }
}

// Metadata storage for hash-based versions
interface VersionMetadata {
  hash: string;
  algorithm: string;
  createdAt: Date;
  author: string;
  changelog: string;
  parentHash?: string; // For tracking chains
  tags?: string[];     // For semantic annotations
}

// Version registry for hash-based system
class HashVersionRegistry {
  private metadata: Map<string, VersionMetadata> = new Map();

  register(content: Buffer | string, metadata: Omit<VersionMetadata, 'hash' | 'algorithm'>): VersionMetadata {
    const version = new HashVersion(content);
    const full: VersionMetadata = {
      ...metadata,
      hash: version.digest,
      algorithm: version.algorithm,
    };
    this.metadata.set(version.digest, full);
    return full;
  }

  getMetadata(hash: string): VersionMetadata | undefined {
    return this.metadata.get(hash);
  }

  getAllVersionsSorted(sortBy: 'date' | 'hash' = 'date'): VersionMetadata[] {
    const versions = Array.from(this.metadata.values());
    if (sortBy === 'date') {
      return versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return versions.sort((a, b) => a.hash.localeCompare(b.hash));
  }

  findVersionsAfterDate(date: Date): VersionMetadata[] {
    return Array.from(this.metadata.values()).filter(m => m.createdAt > date);
  }
}
```

---

## 2. Detailed Comparison Matrix

| Aspect | Semantic Versioning | Timestamp-Based | Hash-Based |
|--------|-------------------|-----------------|-----------|
| **Format Example** | `2.1.3-beta.1` | `2025-12-23T18:45:32Z` | `sha256:a7f3c8e2d1f4` |
| **Human Readability** | Excellent | Good | Poor |
| **Automatic Ordering** | Requires logic | Built-in (lexicographic) | No (requires metadata) |
| **Semantic Meaning** | Excellent (breaking changes) | None | None |
| **Chronological Tracking** | Requires metadata | Built-in | Requires metadata |
| **Content Integrity** | No | No | Yes (cryptographic) |
| **Uniqueness Guarantee** | Manual enforcement | Time precision | Content-based |
| **Query by Time Range** | Metadata lookup | Direct string comparison | Metadata lookup |
| **Query Latest Version** | Custom logic | Lexicographic sort | Metadata lookup |
| **Rollback Complexity** | Simple reference | Simple reference | Simple reference |
| **Immutability Enforcement** | Manual | Manual | Automatic |
| **Storage Overhead** | Low | Low | Low |
| **Metadata Requirements** | Optional | Optional | Required |
| **Industry Adoption** | Very high (npm, Maven) | High (Terraform, logs) | High (Docker, Git) |
| **Best for IaC** | No | Yes | Complementary |
| **Change Communication** | Excellent | None | None |

---

## 3. S3 Path Structure Best Practices

### 3.1 Recommended Hybrid Structure

```
lcp-{bucket}/
├── config/
│   ├── {application}/
│   │   ├── {environment}/
│   │   │   ├── versions/
│   │   │   │   ├── 20251223T184532Z/           (timestamp as primary sort)
│   │   │   │   │   ├── dependencies.json
│   │   │   │   │   ├── metadata.json           (semver, author, changelog)
│   │   │   │   │   └── hash.sha256
│   │   │   │   ├── 20251220T101500Z/
│   │   │   │   │   ├── dependencies.json
│   │   │   │   │   └── metadata.json
│   │   │   │   └── latest -> 20251223T184532Z  (symlink or alias)
│   │   │   └── current.json                    (pointer to active version)
│   │   └── metadata.json                       (app-level config)
│   └── _schemas/                               (JSON schemas for validation)
│       ├── dependencies.schema.json
│       └── config.schema.json
├── backups/                                    (retention for quick rollback)
│   └── {application}/{environment}/
└── archive/                                    (cold storage, lifecycle rules)
```

### 3.2 Path Naming Conventions

```
Primary Version Path (timestamp-based):
  lcp-config/config/payment-service/prod/versions/20251223T184532Z/dependencies.json

With Semantic Version Tag:
  lcp-config/config/payment-service/prod/versions/20251223T184532Z/metadata.json
  {
    "semver": "2.1.3",
    "timestamp": "20251223T184532Z",
    "hash": "a7f3c8e2d1f4b9e6...",
    "tags": ["v2.1.3", "stable", "prod-2025-12"]
  }

Archive with Retention:
  lcp-config/archive/{application}/{environment}/YYYY-MM/
  lcp-config/archive/payment-service/prod/2025-12/20251223T184532Z/

Backup for Quick Rollback (keep last 10 versions):
  lcp-config/backups/{application}/{environment}/{version}/dependencies.json
```

### 3.3 S3 Lifecycle Rules

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldVersions",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "config/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "PruneBackups",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "backups/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

---

## 4. Version Metadata Schema

### 4.1 Core Metadata Schema

```typescript
interface VersionMetadata {
  // Unique Identifiers
  id: string;                        // UUID v4 for tracking
  versionId: string;                 // Primary version identifier (timestamp)

  // Versioning Information
  semver?: string;                   // Semantic version (optional)
  hash?: string;                     // Content hash with algorithm
  algorithm?: 'sha256' | 'sha1' | 'md5';

  // Temporal Information
  createdAt: string;                 // ISO 8601 UTC timestamp
  createdBy: string;                 // User or service identity
  modifiedAt?: string;               // When metadata last updated

  // Content Information
  description: string;               // Human-readable summary
  changelog: string;                 // Detailed change log (markdown)
  parentVersionId?: string;          // For tracking update chains
  contentType: 'json' | 'yaml' | 'hcl' | 'json5';
  size: number;                      // Content size in bytes

  // Deployment Information
  environment: 'dev' | 'staging' | 'prod' | 'test';
  application: string;               // Application/service name
  deploymentStatus?: 'pending' | 'active' | 'superseded' | 'rolled_back';

  // Tagging and Organization
  tags?: Record<string, string>;     // Custom metadata tags
  labels?: string[];                 // Free-form labels (e.g., 'stable', 'release-2025-12')

  // Immutability and Security
  immutable: boolean;                // Prevent accidental overwrites
  etag?: string;                     // S3 ETag for integrity
  digest?: string;                   // Blake2b or similar for integrity verification

  // Compliance and Audit
  approvedBy?: string;               // Approval chain
  approvalDate?: string;             // When approved
  changeTicket?: string;             // Reference to change management system
  complianceChecks?: {
    passed: boolean;
    checks: Array<{
      name: string;
      result: 'pass' | 'fail' | 'warning';
      details?: string;
    }>;
  };

  // Retention and Lifecycle
  retentionDays?: number;            // Custom retention policy
  expiresAt?: string;                // Planned expiration date

  // Related Versions
  relatedVersions?: {
    promoted: string[];              // Versions promoted from this one
    promotedTo: string[];            // Versions this was promoted to
    dependencies: Array<{
      application: string;
      environment: string;
      versionId: string;
    }>;
  };
}
```

### 4.2 Metadata Storage (metadata.json)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "versionId": "20251223T184532Z",
  "semver": "2.1.3",
  "hash": "sha256:a7f3c8e2d1f4b9e634c8d7f2e9a4b1c6d3e5f8a0b2c4d6e7f9a1b3c5d7e9f1",
  "createdAt": "2025-12-23T18:45:32.123Z",
  "createdBy": "deployment-service",
  "description": "Database connection pooling configuration update",
  "changelog": "- Increase max pool size from 10 to 20\n- Add connection timeout (30s)\n- Enable SSL/TLS for all connections\n- Reviewed by: platform-team",
  "parentVersionId": "20251220T101500Z",
  "contentType": "json",
  "size": 2341,
  "environment": "prod",
  "application": "payment-service",
  "deploymentStatus": "active",
  "tags": {
    "release": "2025-12-Q4",
    "squad": "platform",
    "region": "us-east-1"
  },
  "labels": ["v2.1.3", "stable", "critical-fix"],
  "immutable": true,
  "etag": "\"a1b2c3d4e5f6g7h8\"",
  "approvedBy": "alice@company.com",
  "approvalDate": "2025-12-23T17:30:00Z",
  "changeTicket": "CHANGE-12345",
  "complianceChecks": {
    "passed": true,
    "checks": [
      {
        "name": "schema-validation",
        "result": "pass"
      },
      {
        "name": "security-scan",
        "result": "pass",
        "details": "No credentials detected"
      },
      {
        "name": "performance-baseline",
        "result": "pass",
        "details": "Memory usage within thresholds"
      }
    ]
  },
  "retentionDays": 365,
  "relatedVersions": {
    "promoted": [],
    "promotedTo": [],
    "dependencies": [
      {
        "application": "auth-service",
        "environment": "prod",
        "versionId": "20251215T090000Z"
      }
    ]
  }
}
```

---

## 5. Version Management Operations

### 5.1 Version Comparison and Sorting

```typescript
// Complete version comparison utility
class ConfigVersionManager {
  private s3Client: S3Client;
  private bucket: string;

  constructor(s3Client: S3Client, bucket: string) {
    this.s3Client = s3Client;
    this.bucket = bucket;
  }

  /**
   * List all versions for an application/environment
   */
  async listVersions(
    application: string,
    environment: string,
    limit: number = 100
  ): Promise<VersionMetadata[]> {
    const prefix = `config/${application}/${environment}/versions/`;

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: limit * 2, // Account for metadata.json files
    });

    const response = await this.s3Client.send(command);

    if (!response.CommonPrefixes) return [];

    const versions: VersionMetadata[] = [];

    for (const commonPrefix of response.CommonPrefixes) {
      if (!commonPrefix.Prefix) continue;

      const versionId = commonPrefix.Prefix.split('/').filter(Boolean).pop();
      if (!versionId) continue;

      try {
        const metadata = await this.getVersionMetadata(
          application,
          environment,
          versionId
        );
        versions.push(metadata);
      } catch (error) {
        console.warn(`Failed to load metadata for version ${versionId}:`, error);
      }
    }

    // Sort by timestamp (chronological order)
    return versions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get metadata for a specific version
   */
  async getVersionMetadata(
    application: string,
    environment: string,
    versionId: string
  ): Promise<VersionMetadata> {
    const key = `config/${application}/${environment}/versions/${versionId}/metadata.json`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const body = await response.Body?.transformToString() || '{}';
      return JSON.parse(body) as VersionMetadata;
    } catch (error) {
      throw new Error(
        `Failed to fetch metadata for version ${versionId}: ${error}`
      );
    }
  }

  /**
   * Get the latest version
   */
  async getLatestVersion(
    application: string,
    environment: string
  ): Promise<VersionMetadata> {
    const versions = await this.listVersions(application, environment, 1);
    if (versions.length === 0) {
      throw new Error(`No versions found for ${application}/${environment}`);
    }
    return versions[0];
  }

  /**
   * Get specific version by semantic version
   */
  async getVersionBySemver(
    application: string,
    environment: string,
    semver: string
  ): Promise<VersionMetadata | undefined> {
    const versions = await this.listVersions(application, environment, 1000);
    return versions.find(v => v.semver === semver);
  }

  /**
   * Get versions within a time range
   */
  async getVersionsInTimeRange(
    application: string,
    environment: string,
    startDate: Date,
    endDate: Date
  ): Promise<VersionMetadata[]> {
    const versions = await this.listVersions(application, environment, 10000);
    return versions.filter(v => {
      const createdAt = new Date(v.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });
  }

  /**
   * Compare two versions and show differences
   */
  async compareVersions(
    application: string,
    environment: string,
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: VersionMetadata;
    version2: VersionMetadata;
    contentDiff: string;
  }> {
    const [metadata1, metadata2] = await Promise.all([
      this.getVersionMetadata(application, environment, versionId1),
      this.getVersionMetadata(application, environment, versionId2),
    ]);

    const [content1, content2] = await Promise.all([
      this.getVersionContent(application, environment, versionId1),
      this.getVersionContent(application, environment, versionId2),
    ]);

    // Simple diff (in production, use a proper diff library)
    const diff = this.simpleDiff(content1, content2);

    return {
      version1: metadata1,
      version2: metadata2,
      contentDiff: diff,
    };
  }

  /**
   * Get all versions created by a specific user
   */
  async getVersionsByAuthor(
    application: string,
    environment: string,
    author: string
  ): Promise<VersionMetadata[]> {
    const versions = await this.listVersions(application, environment, 10000);
    return versions.filter(v => v.createdBy === author);
  }

  /**
   * Get versions with specific label/tag
   */
  async getVersionsByLabel(
    application: string,
    environment: string,
    label: string
  ): Promise<VersionMetadata[]> {
    const versions = await this.listVersions(application, environment, 10000);
    return versions.filter(v => v.labels?.includes(label));
  }

  /**
   * Get version history chain
   */
  async getVersionChain(
    application: string,
    environment: string,
    versionId: string
  ): Promise<VersionMetadata[]> {
    const chain: VersionMetadata[] = [];
    let currentId: string | undefined = versionId;

    while (currentId) {
      const metadata = await this.getVersionMetadata(
        application,
        environment,
        currentId
      );
      chain.push(metadata);
      currentId = metadata.parentVersionId;
    }

    return chain;
  }

  /**
   * Create new version with metadata
   */
  async createVersion(
    application: string,
    environment: string,
    content: string,
    metadata: Omit<VersionMetadata, 'versionId' | 'createdAt' | 'hash'>
  ): Promise<VersionMetadata> {
    const timestamp = new Date().toISOString();
    const compactTimestamp = timestamp.replace(/[-:.Z]/g, '');

    // Calculate hash for integrity
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    const fullMetadata: VersionMetadata = {
      ...metadata,
      versionId: compactTimestamp,
      createdAt: timestamp,
      hash: `sha256:${hash}`,
      algorithm: 'sha256',
      id: crypto.randomUUID(),
    };

    // Store content
    const contentKey = `config/${application}/${environment}/versions/${compactTimestamp}/dependencies.json`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: contentKey,
        Body: content,
        ContentType: 'application/json',
        Metadata: {
          'x-version-id': compactTimestamp,
          'x-application': application,
          'x-environment': environment,
        },
      })
    );

    // Store metadata
    const metadataKey = `config/${application}/${environment}/versions/${compactTimestamp}/metadata.json`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey,
        Body: JSON.stringify(fullMetadata, null, 2),
        ContentType: 'application/json',
      })
    );

    // Update 'latest' pointer
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `config/${application}/${environment}/latest.json`,
        Body: JSON.stringify({ versionId: compactTimestamp }, null, 2),
        ContentType: 'application/json',
      })
    );

    return fullMetadata;
  }

  /**
   * Get version content
   */
  private async getVersionContent(
    application: string,
    environment: string,
    versionId: string
  ): Promise<string> {
    const key = `config/${application}/${environment}/versions/${versionId}/dependencies.json`;
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    return response.Body?.transformToString() || '';
  }

  /**
   * Simple text diff (use diff-match-patch or similar in production)
   */
  private simpleDiff(text1: string, text2: string): string {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const diff: string[] = [];
    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] !== lines2[i]) {
        diff.push(`Line ${i + 1}:`);
        diff.push(`- ${lines1[i] || '(missing)'}`);
        diff.push(`+ ${lines2[i] || '(missing)'}`);
      }
    }

    return diff.join('\n');
  }
}
```

### 5.2 Rollback Operations

```typescript
class ConfigRollbackManager {
  private versionManager: ConfigVersionManager;
  private s3Client: S3Client;
  private bucket: string;

  constructor(versionManager: ConfigVersionManager, s3Client: S3Client, bucket: string) {
    this.versionManager = versionManager;
    this.s3Client = s3Client;
    this.bucket = bucket;
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    application: string,
    environment: string,
    targetVersionId: string,
    reason: string
  ): Promise<RollbackResult> {
    const startTime = Date.now();

    try {
      // Get target version metadata
      const targetMetadata = await this.versionManager.getVersionMetadata(
        application,
        environment,
        targetVersionId
      );

      // Get current version for backup
      const currentVersion = await this.versionManager.getLatestVersion(
        application,
        environment
      );

      // Copy target content to active
      const sourceKey = `config/${application}/${environment}/versions/${targetVersionId}/dependencies.json`;
      const destKey = `config/${application}/${environment}/current.json`;

      await this.s3Client.send(
        new CopyObjectCommand({
          CopySource: `${this.bucket}/${sourceKey}`,
          Bucket: this.bucket,
          Key: destKey,
          Metadata: {
            'x-rollback-from': currentVersion.versionId,
            'x-rollback-to': targetVersionId,
            'x-rollback-reason': reason,
            'x-rollback-timestamp': new Date().toISOString(),
          },
        })
      );

      // Create rollback record
      const rollbackRecord = {
        rollbackId: crypto.randomUUID(),
        fromVersion: currentVersion.versionId,
        toVersion: targetVersionId,
        reason,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };

      // Store rollback record
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `config/${application}/${environment}/rollback-history/${rollbackRecord.rollbackId}.json`,
          Body: JSON.stringify(rollbackRecord, null, 2),
        })
      );

      return {
        success: true,
        rollbackId: rollbackRecord.rollbackId,
        fromVersion: currentVersion.versionId,
        toVersion: targetVersionId,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rollback to previous version
   */
  async rollbackToPrevious(
    application: string,
    environment: string,
    reason: string
  ): Promise<RollbackResult> {
    const versions = await this.versionManager.listVersions(application, environment, 2);
    if (versions.length < 2) {
      return {
        success: false,
        error: 'No previous version available',
      };
    }
    return this.rollbackToVersion(application, environment, versions[1].versionId, reason);
  }

  /**
   * Get rollback history
   */
  async getRollbackHistory(
    application: string,
    environment: string
  ): Promise<RollbackRecord[]> {
    const prefix = `config/${application}/${environment}/rollback-history/`;
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      })
    );

    if (!response.Contents) return [];

    const records: RollbackRecord[] = [];
    for (const object of response.Contents) {
      if (!object.Key) continue;
      const getResponse = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: object.Key,
        })
      );
      const body = await getResponse.Body?.transformToString() || '{}';
      records.push(JSON.parse(body));
    }

    return records.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

interface RollbackResult {
  success: boolean;
  rollbackId?: string;
  fromVersion?: string;
  toVersion?: string;
  durationMs?: number;
  error?: string;
}

interface RollbackRecord {
  rollbackId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  timestamp: string;
  durationMs: number;
}
```

---

## 6. Immutable Version Enforcement

### 6.1 Implementation Strategy

```typescript
class ImmutableVersionEnforcer {
  private s3Client: S3Client;
  private bucket: string;

  constructor(s3Client: S3Client, bucket: string) {
    this.s3Client = s3Client;
    this.bucket = bucket;
  }

  /**
   * Enable versioning on S3 bucket (prerequisite)
   */
  async enableBucketVersioning(): Promise<void> {
    await this.s3Client.send(
      new PutBucketVersioningCommand({
        Bucket: this.bucket,
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      })
    );
  }

  /**
   * Mark a version as immutable (lock metadata)
   */
  async makeVersionImmutable(
    application: string,
    environment: string,
    versionId: string
  ): Promise<void> {
    const metadataKey = `config/${application}/${environment}/versions/${versionId}/metadata.json`;

    // Get current metadata
    const getResponse = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey,
      })
    );

    const metadata = JSON.parse(await getResponse.Body!.transformToString());
    metadata.immutable = true;
    metadata.immutableDate = new Date().toISOString();

    // Re-upload with immutable flag
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: 'application/json',
        VersionId: getResponse.VersionId, // Preserve version ID
      })
    );
  }

  /**
   * Prevent deletion of critical versions using S3 Object Lock
   * (Requires bucket created with Object Lock enabled)
   */
  async applyObjectLock(
    application: string,
    environment: string,
    versionId: string,
    retentionDays: number = 365
  ): Promise<void> {
    const contentKey = `config/${application}/${environment}/versions/${versionId}/dependencies.json`;

    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

    // Apply GOVERNANCE mode retention
    await this.s3Client.send(
      new PutObjectRetentionCommand({
        Bucket: this.bucket,
        Key: contentKey,
        Retention: {
          Mode: ObjectLockRetentionMode.GOVERNANCE,
          RetainUntilDate: retentionUntil,
        },
      })
    );

    // Optionally apply legal hold
    await this.s3Client.send(
      new PutObjectLegalHoldCommand({
        Bucket: this.bucket,
        Key: contentKey,
        LegalHold: {
          Status: ObjectLockLegalHoldStatus.ON,
        },
      })
    );
  }

  /**
   * Validate that a version hasn't been modified
   */
  async validateVersionImmutability(
    application: string,
    environment: string,
    versionId: string,
    expectedHash: string
  ): Promise<ValidationResult> {
    const contentKey = `config/${application}/${environment}/versions/${versionId}/dependencies.json`;

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: contentKey,
      })
    );

    const content = await response.Body!.transformToString();
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      isValid: actualHash === expectedHash,
      expectedHash,
      actualHash,
      message: actualHash === expectedHash ?
        'Version integrity verified' :
        'WARNING: Version content has been modified!',
    };
  }

  /**
   * Create audit log entry for version access
   */
  async logVersionAccess(
    application: string,
    environment: string,
    versionId: string,
    accessType: 'read' | 'write' | 'delete',
    accessor: string,
    reason?: string
  ): Promise<void> {
    const auditLog = {
      timestamp: new Date().toISOString(),
      application,
      environment,
      versionId,
      accessType,
      accessor,
      reason,
      source: 'ConfigVersionManager',
    };

    const logKey = `audit/config-access/${new Date().toISOString().split('T')[0]}/${crypto.randomUUID()}.json`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: logKey,
        Body: JSON.stringify(auditLog, null, 2),
        ServerSideEncryption: 'AES256',
      })
    );
  }
}

interface ValidationResult {
  isValid: boolean;
  expectedHash: string;
  actualHash: string;
  message: string;
}
```

---

## 7. Recommendation for Infrastructure Configurations

### 7.1 Recommended Strategy: Hybrid Timestamp + Semantic Versioning

**Primary Identifier**: ISO 8601 Timestamp (immutable, naturally ordered)
**Secondary Identifier**: Semantic Version (for semantic clarity)
**Tertiary**: Content Hash (for integrity verification)

### 7.2 Why This Hybrid Approach

1. **Chronological Clarity**: Timestamp ensures natural ordering and audit trail
2. **Semantic Meaning**: Semver enables communication of change scope
3. **Content Integrity**: Hash provides cryptographic verification
4. **Query Flexibility**: Can query by time range, semver, or hash
5. **Immutability**: Timestamp + hash combination prevents accidental overwrites
6. **Audit Compliance**: Complete trace of when/who/what changed

### 7.3 Implementation Pattern

```typescript
// Example: Create a new configuration version
const versionManager = new ConfigVersionManager(s3Client, 'lcp-config');

const content = JSON.stringify({
  database: {
    maxConnections: 20,
    sslEnabled: true,
    timeout: 30000,
  },
}, null, 2);

const metadata = await versionManager.createVersion(
  'payment-service',      // application
  'prod',                 // environment
  content,                // configuration content
  {
    description: 'Database connection pooling configuration update',
    changelog: `- Increase max pool size from 10 to 20
- Add connection timeout (30s)
- Enable SSL/TLS for all connections`,
    createdBy: 'deployment-pipeline@company.com',
    semver: '2.1.3',
    environment: 'prod',
    application: 'payment-service',
    approvedBy: 'alice@company.com',
    changeTicket: 'CHANGE-12345',
    immutable: true,
  }
);

// Access patterns
const latest = await versionManager.getLatestVersion('payment-service', 'prod');
const versionsInDecember = await versionManager.getVersionsInTimeRange(
  'payment-service',
  'prod',
  new Date('2025-12-01'),
  new Date('2025-12-31')
);
const version213 = await versionManager.getVersionBySemver(
  'payment-service',
  'prod',
  '2.1.3'
);

// Rollback if needed
const rollbackMgr = new ConfigRollbackManager(versionManager, s3Client, 'lcp-config');
await rollbackMgr.rollbackToPrevious(
  'payment-service',
  'prod',
  'Critical bug in database connection handling'
);
```

---

## 8. Complete S3 Configuration System

### 8.1 Full Implementation

See the code examples provided in sections 5.1, 5.2, and 6.1 for complete, production-ready implementations.

### 8.2 Key Design Patterns

**Separation of Concerns**:
- `ConfigVersionManager`: List, query, compare versions
- `ConfigRollbackManager`: Manage rollbacks and history
- `ImmutableVersionEnforcer`: Enforce immutability and audit

**Path Structure**: `lcp-{bucket}/config/{app}/{env}/versions/{timestamp}/`

**Metadata Storage**: Separate `metadata.json` file with rich information

**Immutability**: Combination of S3 Object Lock, version ID tracking, and hash verification

**Audit Trail**: Comprehensive logging of all access and modifications

---

## 9. Summary Table: When to Use Each Strategy

| Strategy | Best For | Avoid For |
|----------|----------|-----------|
| **Semantic Versioning** | Public APIs, clear breaking changes, release communication | IaC configurations, auto-generated versions, time-based queries |
| **Timestamp-Based** | IaC (Terraform, CloudFormation), audit logs, continuous deployment | When semantic meaning is critical, dependency resolution |
| **Hash-Based** | Content integrity, deduplication, distributed systems | Human-readable identification, time-based queries |
| **Hybrid (Recommended)** | Infrastructure configurations requiring both semantics and audit trail | Simple use cases, low-volume configuration changes |

---

## 10. Implementation Checklist

- [ ] Choose versioning strategy (recommend: hybrid timestamp + semver)
- [ ] Design S3 bucket structure (prefix: `lcp-config/`)
- [ ] Define metadata schema (include all fields from Section 4.1)
- [ ] Implement ConfigVersionManager for listing/querying
- [ ] Implement ConfigRollbackManager for rollback operations
- [ ] Implement ImmutableVersionEnforcer for immutability
- [ ] Set up S3 lifecycle policies (Section 3.3)
- [ ] Enable S3 versioning on bucket
- [ ] Configure bucket encryption and access policies
- [ ] Set up audit logging for compliance
- [ ] Create initial metadata.json files for existing configs
- [ ] Test rollback procedures
- [ ] Document version management procedures for team
- [ ] Set up monitoring/alerting for version operations

---

## References & Further Reading

1. **Semantic Versioning**: https://semver.org/
2. **RFC 3339 (ISO 8601)**: https://tools.ietf.org/html/rfc3339
3. **AWS S3 Versioning**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ObjectVersioning.html
4. **AWS S3 Object Lock**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
5. **Terraform State Versioning**: https://www.terraform.io/language/settings/backends/s3
6. **Infrastructure as Code Best Practices**: https://www.hashicorp.com/blog/infrastructure-as-code-best-practices
7. **Git Content Addressability**: https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain
