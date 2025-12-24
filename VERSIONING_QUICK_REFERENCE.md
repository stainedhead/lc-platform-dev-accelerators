# Configuration Versioning - Quick Reference Guide

## When to Use Which Strategy

```
Need human-readable change types?
  → Use Semantic Versioning (1.2.3)

Need automatic chronological ordering?
  → Use Timestamp-Based (2025-12-23T18:45:32Z)

Need to verify content integrity?
  → Use Hash-Based (sha256:abc123...)

Need ALL THREE capabilities?
  → Use HYBRID (Recommended for IaC)
```

## Hybrid Approach (Recommended)

```typescript
{
  versionId: "20251223T184532Z",      // PRIMARY: Timestamp (ordering)
  semver: "2.1.3",                     // SECONDARY: Semantic (meaning)
  hash: "sha256:a7f3c8e2d1f4b9e6...", // TERTIARY: Hash (integrity)
}
```

## Quick Code Snippets

### Create a Version

```typescript
import { ConfigVersionFactory } from './src/core/utils/ConfigVersioning';

const metadata = ConfigVersionFactory.createVersion(configContent, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'pipeline@company.com',
  description: 'Database configuration update',
  changelog: '- Increased connection pool',
  approvedBy: 'alice@company.com',
  changeTicket: 'CHANGE-12345',
});
```

### Compare Versions

```typescript
import { VersionComparator } from './src/core/utils/ConfigVersioning';

const comparison = VersionComparator.compareVersions(oldVersion, newVersion);
console.log(`Changed: ${comparison.timeDifference.contentChanged}`);
console.log(`Days between: ${comparison.timeDifference.days}`);
```

### Sort Versions

```typescript
// By timestamp (natural order)
const byTime = VersionComparator.sortByTimestamp(versions);

// By semantic version
const bySemver = VersionComparator.sortBySemver(versions);
```

### Query Versions

```typescript
// Get specific version
const v213 = VersionComparator.findBySemver(versions, '2.1.3');

// Filter by time range
const recent = VersionComparator.filterByTimeRange(
  versions,
  new Date('2025-12-01'),
  new Date('2025-12-31')
);

// Filter by label
const stable = VersionComparator.filterByLabel(versions, 'stable');

// Filter by author
const myChanges = VersionComparator.filterByAuthor(versions, 'me@company.com');
```

## S3 Path Structure

```
lcp-config/
└── config/
    ├── {application}/
    │   ├── {environment}/
    │   │   ├── versions/
    │   │   │   ├── {TIMESTAMP}/
    │   │   │   │   ├── dependencies.json      # Configuration content
    │   │   │   │   └── metadata.json          # Version metadata
    │   │   │   └── ...
    │   │   ├── current.json                   # Active version pointer
    │   │   └── latest.json                    # Latest version pointer
    │   └── ...
    └── ...
```

### Example Paths

```
config/payment-service/prod/versions/20251223T184532Z/dependencies.json
config/payment-service/prod/versions/20251223T184532Z/metadata.json
config/payment-service/prod/current.json
config/payment-service/prod/latest.json
```

## Version Metadata (Essential Fields)

```json
{
  "versionId": "20251223T184532Z",
  "semver": "2.1.3",
  "hash": "sha256:...",
  "createdAt": "2025-12-23T18:45:32Z",
  "createdBy": "pipeline@company.com",
  "environment": "prod",
  "application": "payment-service",
  "description": "Configuration update",
  "changelog": "- Updated settings",
  "immutable": true,
  "approvedBy": "alice@company.com",
  "changeTicket": "CHANGE-12345",
  "labels": ["v2.1.3", "stable"],
  "retentionDays": 365
}
```

## Comparison Matrices

### Strategy Comparison

| Feature | Semver | Timestamp | Hash |
|---------|--------|-----------|------|
| Human Readable | ✓✓✓ | ✓✓ | ✗ |
| Auto-Ordered | ✗ | ✓✓✓ | ✗ |
| Semantic Meaning | ✓✓✓ | ✗ | ✗ |
| Integrity Check | ✗ | ✗ | ✓✓✓ |
| Audit Trail | ✗ | ✓✓✓ | ✗ |

### Use Case Comparison

| Use Case | Best Choice |
|----------|-------------|
| Infrastructure configs | Timestamp |
| API versioning | Semver |
| Content integrity | Hash |
| Compliance/Audit | Timestamp |
| Release communication | Semver |
| Time-based queries | Timestamp |

## Common Operations

### List All Versions (Newest First)

```typescript
const versions = await versionManager.listVersions('app', 'env');
// Returns: VersionMetadata[] sorted by createdAt (newest first)
```

### Get Latest Version

```typescript
const latest = await versionManager.getLatestVersion('app', 'env');
```

### Get Specific Version by Semver

```typescript
const v = await versionManager.getVersionBySemver('app', 'env', '2.1.3');
```

### Get Versions from Last 30 Days

```typescript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const recent = VersionComparator.filterByTimeRange(
  versions,
  thirtyDaysAgo,
  new Date()
);
```

### Rollback to Previous Version

```typescript
await rollbackManager.rollbackToPrevious(
  'payment-service',
  'prod',
  'Bug discovered in v2.1.3'
);
```

## Version Lifecycle

```
┌─────────────┐
│   Created   │ versionId = 20251223T184532Z
└──────┬──────┘
       │ (immutable=false)
       ▼
┌─────────────┐
│  Reviewed   │ approvedBy, changeTicket set
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Approved   │ deploymentStatus = pending
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Deployed   │ deploymentStatus = active
└──────┬──────┘
       │ (immutable=true)
       ▼
┌─────────────┐
│  Superseded │ deploymentStatus = superseded
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Archived  │ moved to archive/ prefix
└─────────────┘
```

## Best Practices Checklist

- [x] Always include semantic version for human communication
- [x] Always include timestamp for chronological ordering
- [x] Always calculate content hash for integrity verification
- [x] Always track author and approval chain
- [x] Always include changelog for understanding changes
- [x] Mark versions as immutable once deployed
- [x] Link versions to change tickets for traceability
- [x] Set retention policies based on compliance needs
- [x] Archive old versions to cold storage
- [x] Maintain rollback history
- [x] Tag important versions (e.g., "stable", "critical")
- [x] Verify integrity before rollback

## Error Handling Patterns

```typescript
// Invalid semver
try {
  new SemanticVersion('invalid');
} catch (e) {
  console.error('Invalid version format');
}

// Invalid timestamp
try {
  new TimestampVersion('not-a-date');
} catch (e) {
  console.error('Invalid timestamp');
}

// Hash verification failure
const verified = HashVersion.verify(content, hash);
if (!verified) {
  console.warn('Content integrity check failed!');
}

// Version not found
const version = await versionManager.getVersionBySemver(app, env, '99.0.0');
if (!version) {
  console.warn('Version not found');
}
```

## Performance Tips

1. **Cache version lists** if querying frequently
2. **Use prefix filters** for S3 ListObjectsV2 operations
3. **Batch metadata reads** when comparing multiple versions
4. **Index by label** for fast queries by tag
5. **Store parent pointers** for efficient chain traversal

## CLI-Style Operations

```bash
# List versions (newest first)
versionManager.listVersions('app', 'prod')

# Get latest
versionManager.getLatestVersion('app', 'prod')

# Get by semver
versionManager.getVersionBySemver('app', 'prod', '2.1.3')

# Compare versions
versionManager.compareVersions('app', 'prod', v1, v2)

# Rollback
rollbackManager.rollbackToVersion('app', 'prod', versionId, 'reason')

# Rollback to previous
rollbackManager.rollbackToPrevious('app', 'prod', 'reason')

# Enforce immutability
enforcer.makeVersionImmutable('app', 'prod', versionId)

# Verify integrity
enforcer.validateVersionImmutability('app', 'prod', versionId, hash)
```

## Real-World Example

```typescript
// Step 1: Create config
const config = { database: { maxConnections: 20 } };
const content = JSON.stringify(config, null, 2);

// Step 2: Create version
const metadata = ConfigVersionFactory.createVersion(content, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'ci@company.com',
  description: 'Pool size increase',
  changelog: '- Increased from 10 to 20',
  approvedBy: 'alice@company.com',
  changeTicket: 'CHANGE-12345',
});

// Step 3: Store in S3
const pathGen = new S3PathGenerator('lcp-config');
const contentPath = pathGen.getVersionPath(
  'payment-service', 'prod',
  metadata.versionId
);
const metadataPath = pathGen.getMetadataPath(
  'payment-service', 'prod',
  metadata.versionId
);

// contentPath: config/payment-service/prod/versions/20251223T184532Z/dependencies.json
// metadataPath: config/payment-service/prod/versions/20251223T184532Z/metadata.json

// Step 4: Query version
const v213 = await versionManager.getVersionBySemver(
  'payment-service', 'prod', '2.1.3'
);
console.log(`Version 2.1.3 created at: ${v213.createdAt}`);

// Step 5: Rollback if needed
await rollbackManager.rollbackToPrevious(
  'payment-service', 'prod',
  'Connection pool issues detected'
);
```

## File Locations

| File | Purpose |
|------|---------|
| `CONFIG_VERSIONING_RESEARCH.md` | Complete analysis and deep dive |
| `VERSIONING_EXAMPLES.md` | 10+ working code examples |
| `CONFIG_VERSIONING_SUMMARY.md` | Executive summary and checklist |
| `VERSIONING_QUICK_REFERENCE.md` | This file - quick lookup |
| `src/core/utils/ConfigVersioning.ts` | Production TypeScript implementation |

## Key Metrics

```
Typical version retention: 365 days
Archive after: 30+ days
Rollback depth: 10-20 versions
Metadata size per version: <10KB
Average config size: 5-50KB
Total storage per app/env: 100MB-1GB
```

## External References

- Semantic Versioning: https://semver.org
- ISO 8601 Dates: https://en.wikipedia.org/wiki/ISO_8601
- SHA-256: https://en.wikipedia.org/wiki/SHA-2
- S3 Versioning: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ObjectVersioning.html

---

**Last Updated**: 2025-12-23
**Format**: Quick Reference
**Intended Audience**: Developers and DevOps engineers
