# Configuration Versioning Examples and Usage Guide

## Quick Start Examples

### 1. Semantic Version Comparison

```typescript
import { SemanticVersion } from './src/core/utils/ConfigVersioning';

// Create semantic versions
const v1 = new SemanticVersion('1.2.3');
const v2 = new SemanticVersion('2.0.0');
const v3 = new SemanticVersion('1.2.4');

// Compare versions
console.log(v1.isLessThan(v2));        // true
console.log(v1.isGreaterThan(v3));     // false
console.log(v1.equals(new SemanticVersion('1.2.3'))); // true

// Sort versions
const versions = [v2, v1, v3];
const sorted = versions.sort((a, b) => a.compare(b));
console.log(sorted.map(v => v.toString()));
// Output: ["1.2.3", "1.2.4", "2.0.0"]

// Pre-release handling
const beta = new SemanticVersion('2.0.0-beta.1');
const final = new SemanticVersion('2.0.0');
console.log(beta.isLessThan(final));   // true
```

### 2. Timestamp Version Ordering

```typescript
import { TimestampVersion } from './src/core/utils/ConfigVersioning';

// Create timestamp versions
const v1 = new TimestampVersion('2025-12-20T10:15:00Z');
const v2 = new TimestampVersion('2025-12-23T18:45:32Z');
const v3 = new TimestampVersion('2025-12-25T08:30:15Z');

// Natural chronological ordering (lexicographic on ISO string)
const versions = [v3, v1, v2];
const sorted = versions.sort((a, b) => a.isoString.localeCompare(b.isoString));
console.log(sorted.map(v => v.isoString));
// Output: chronologically sorted

// Generate version ID (current timestamp)
const versionId = TimestampVersion.generateVersionId();
console.log(versionId); // e.g., "20251223T184532Z"

// S3 path segment
const s3Path = `config/payment-service/prod/versions/${versionId}/dependencies.json`;
```

### 3. Content Hash Version Verification

```typescript
import { HashVersion } from './src/core/utils/ConfigVersioning';

// Create hash from content
const content = JSON.stringify({
  database: { maxConnections: 20 },
});

const hash = new HashVersion(content);
console.log(hash.contentHash);        // "sha256:a7f3c8e2d1f4b9e6..."
console.log(hash.toShortForm(8));     // "a7f3c8e2"

// Verify content integrity
const sameContent = JSON.stringify({
  database: { maxConnections: 20 },
});
const verified = HashVersion.verify(sameContent, hash.contentHash);
console.log(verified); // true

const differentContent = JSON.stringify({
  database: { maxConnections: 10 },
});
const notVerified = HashVersion.verify(differentContent, hash.contentHash);
console.log(notVerified); // false
```

### 4. Version Metadata Creation

```typescript
import { ConfigVersionFactory, VersionMetadata } from './src/core/utils/ConfigVersioning';

const content = JSON.stringify({
  database: {
    maxConnections: 20,
    sslEnabled: true,
    timeout: 30000,
  },
}, null, 2);

const metadata = ConfigVersionFactory.createVersion(content, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'deployment-pipeline@company.com',
  description: 'Database connection pooling configuration update',
  changelog: `
- Increase max pool size from 10 to 20
- Add connection timeout (30s)
- Enable SSL/TLS for all connections
- Reviewed by: platform-team
  `,
  tags: {
    release: '2025-12-Q4',
    squad: 'platform',
    region: 'us-east-1',
  },
  labels: ['v2.1.3', 'stable', 'critical-fix'],
  approvedBy: 'alice@company.com',
  changeTicket: 'CHANGE-12345',
});

console.log(JSON.stringify(metadata, null, 2));
// Output:
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "versionId": "20251223T184532Z",
//   "semver": "2.1.3",
//   "hash": "sha256:a7f3c8e2d1f4b9e634c8d7f2e9a4b1c6d3e5f8a...",
//   "createdAt": "2025-12-23T18:45:32.123Z",
//   ...
// }
```

### 5. Version Comparison and Sorting

```typescript
import { VersionComparator, VersionMetadata } from './src/core/utils/ConfigVersioning';

const versions: VersionMetadata[] = [
  {
    versionId: '20251223T184532Z',
    semver: '2.1.3',
    createdAt: '2025-12-23T18:45:32Z',
    createdBy: 'user1@company.com',
    // ... other fields
  },
  {
    versionId: '20251220T101500Z',
    semver: '2.1.2',
    createdAt: '2025-12-20T10:15:00Z',
    createdBy: 'user2@company.com',
    // ... other fields
  },
];

// Sort by timestamp (newest first)
const byTime = VersionComparator.sortByTimestamp(versions);
console.log(byTime.map(v => v.versionId));
// Output: ["20251223T184532Z", "20251220T101500Z"]

// Sort by semver
const bySemver = VersionComparator.sortBySemver(versions);
console.log(bySemver.map(v => v.semver));
// Output: ["2.1.3", "2.1.2"]

// Find specific version
const v213 = VersionComparator.findBySemver(versions, '2.1.3');
console.log(v213?.versionId);
// Output: "20251223T184532Z"

// Filter by time range
const december = VersionComparator.filterByTimeRange(
  versions,
  new Date('2025-12-01'),
  new Date('2025-12-31')
);
console.log(december.length); // 2

// Filter by label
const stableVersions = VersionComparator.filterByLabel(versions, 'stable');
console.log(stableVersions.length);

// Get version history chain
const chain = VersionComparator.getVersionChain(versions[0], versions);
console.log(chain.map(v => v.versionId));
```

### 6. S3 Path Generation

```typescript
import { S3PathGenerator } from './src/core/utils/ConfigVersioning';

const pathGen = new S3PathGenerator('lcp-config');

// Generate version content path
const versionPath = pathGen.getVersionPath(
  'payment-service',
  'prod',
  '20251223T184532Z',
  'dependencies.json'
);
console.log(versionPath);
// Output: "config/payment-service/prod/versions/20251223T184532Z/dependencies.json"

// Generate metadata path
const metadataPath = pathGen.getMetadataPath(
  'payment-service',
  'prod',
  '20251223T184532Z'
);
console.log(metadataPath);
// Output: "config/payment-service/prod/versions/20251223T184532Z/metadata.json"

// Generate archive path
const archivePath = pathGen.getArchivePath(
  'payment-service',
  'prod',
  '20251223T184532Z'
);
console.log(archivePath);
// Output: "archive/payment-service/prod/202512/20251223T184532Z/"

// Get listing prefix
const prefix = pathGen.getVersionsPrefix('payment-service', 'prod');
console.log(prefix);
// Output: "config/payment-service/prod/versions/"
```

### 7. Complete Version Lifecycle

```typescript
import {
  TimestampVersion,
  ConfigVersionFactory,
  VersionComparator,
  S3PathGenerator,
  HashVersion,
} from './src/core/utils/ConfigVersioning';

// Step 1: Create a new configuration
const configContent = JSON.stringify({
  database: {
    host: 'db.example.com',
    port: 5432,
    maxConnections: 20,
  },
  cache: {
    ttl: 3600,
  },
}, null, 2);

// Step 2: Create version metadata
const versionMetadata = ConfigVersionFactory.createVersion(configContent, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'ci-pipeline@company.com',
  description: 'Enhanced database pooling',
  changelog: '- Increased max connections to 20\n- Added cache TTL configuration',
  approvedBy: 'alice@company.com',
  changeTicket: 'CHANGE-12345',
});

// Step 3: Generate S3 paths
const pathGen = new S3PathGenerator('lcp-config');
const contentPath = pathGen.getVersionPath(
  versionMetadata.application,
  versionMetadata.environment,
  versionMetadata.versionId,
  'dependencies.json'
);
const metadataPath = pathGen.getMetadataPath(
  versionMetadata.application,
  versionMetadata.environment,
  versionMetadata.versionId
);

console.log('S3 Content Path:', contentPath);
console.log('S3 Metadata Path:', metadataPath);

// Step 4: Prepare for S3 storage
console.log('Version Metadata:');
console.log(JSON.stringify(versionMetadata, null, 2));

// Step 5: Later - retrieve and compare versions
const storedMetadata = versionMetadata;
const previousVersion = {
  ...versionMetadata,
  versionId: '20251220T101500Z',
  semver: '2.1.2',
};

const comparison = VersionComparator.compareVersions(previousVersion, storedMetadata);
console.log('Comparison Result:');
console.log(`Version ${previousVersion.semver} -> ${storedMetadata.semver}`);
console.log(`Time difference: ${comparison.timeDifference.days} days`);
console.log(`Content changed: ${comparison.timeDifference.contentChanged}`);

// Step 6: Verify integrity
const hash = new HashVersion(configContent);
console.log('Content Hash:', hash.toShortForm(12));
console.log('Hash matches metadata:', hash.contentHash === storedMetadata.hash);
```

### 8. Version Querying Patterns

```typescript
import { VersionComparator } from './src/core/utils/ConfigVersioning';

const allVersions = [
  // ... array of VersionMetadata
];

// Query: Get all stable releases
const stableVersions = VersionComparator.filterByLabel(allVersions, 'stable');

// Query: Get all changes made by Alice
const aliceChanges = VersionComparator.filterByAuthor(allVersions, 'alice@company.com');

// Query: Get versions from last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const recentVersions = VersionComparator.filterByTimeRange(
  allVersions,
  thirtyDaysAgo,
  new Date()
);

// Query: Get latest stable release
const latestStable = VersionComparator.sortByTimestamp(
  VersionComparator.filterByLabel(allVersions, 'stable')
)[0];

// Query: Get all patch versions for major.minor
const patchVersions = allVersions.filter(v =>
  v.semver?.startsWith('2.1.') // All 2.1.x versions
);

// Query: Get version history for specific version
const targetVersion = allVersions[0];
const history = VersionComparator.getVersionChain(targetVersion, allVersions);
console.log('Version history:', history.map(v => v.semver).join(' <- '));
// Output: "2.1.3 <- 2.1.2 <- 2.1.1 <- 2.1.0"
```

### 9. Batch Operations

```typescript
import {
  VersionComparator,
  S3PathGenerator,
  TimestampVersion,
} from './src/core/utils/ConfigVersioning';

// Prepare batch S3 upload
const pathGen = new S3PathGenerator('lcp-config');
const application = 'payment-service';
const environment = 'prod';

const batchOperations = [
  {
    metadata: createVersionMetadata('2.1.3', '...'),
    content: configContent1,
  },
  {
    metadata: createVersionMetadata('2.1.2', '...'),
    content: configContent2,
  },
];

// Generate S3 operations
const s3Operations = batchOperations.map(item => {
  const contentPath = pathGen.getVersionPath(
    application,
    environment,
    item.metadata.versionId,
    'dependencies.json'
  );
  const metadataPath = pathGen.getMetadataPath(
    application,
    environment,
    item.metadata.versionId
  );

  return {
    contentPath,
    metadataPath,
    content: item.content,
    metadata: item.metadata,
  };
});

console.log('Batch S3 operations:', s3Operations.length);
```

### 10. Error Handling

```typescript
import {
  SemanticVersion,
  TimestampVersion,
  HashVersion,
} from './src/core/utils/ConfigVersioning';

// Invalid semantic version
try {
  const invalid = new SemanticVersion('1.2');
} catch (error) {
  console.error('Invalid semver format:', error.message);
}

// Invalid timestamp
try {
  const invalid = new TimestampVersion('not-a-date');
} catch (error) {
  console.error('Invalid timestamp:', error.message);
}

// Extract timestamp from S3 path
try {
  const ts = TimestampVersion.parseFromS3Path(
    'config/app/env/versions/20251223T184532Z/config.json'
  );
  console.log('Extracted timestamp:', ts.isoString);
} catch (error) {
  console.error('Failed to parse S3 path:', error.message);
}

// Hash verification failure
const originalContent = 'config content';
const hash = new HashVersion(originalContent);

const modifiedContent = 'modified config content';
const verified = HashVersion.verify(modifiedContent, hash.contentHash);
if (!verified) {
  console.warn('WARNING: Configuration content has been modified!');
  console.log('Expected hash:', hash.contentHash);
}
```

## Best Practices

### 1. Always Include Metadata

```typescript
// Bad: Version ID only
const version = '20251223T184532Z';

// Good: Full metadata
const metadata = ConfigVersionFactory.createVersion(content, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'pipeline@company.com',
  description: 'Configuration update',
  changelog: '- Updated settings',
  approvedBy: 'reviewer@company.com',
  changeTicket: 'TICKET-123',
});
```

### 2. Use Semantic Versioning for Communication

```typescript
// Bad: No indication of change significance
const versions = ['20251223T184532Z', '20251220T101500Z'];

// Good: Clear semantics
const versions = ['2.1.3', '2.1.2'];
// 2.1.3 = patch fix (backward compatible)
// 2.1.2 = previous patch
// If it were 3.0.0, that would indicate breaking changes
```

### 3. Implement Version Approval Workflow

```typescript
const metadata = ConfigVersionFactory.createVersion(content, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.3',
  createdBy: 'pipeline@company.com',
  description: 'Configuration update',
  changelog: '...',
  // Only set when approved
  approvedBy: 'alice@company.com', // Required for prod
  approvalDate: new Date().toISOString(),
  changeTicket: 'CHANGE-12345', // Traceability
});
```

### 4. Maintain Version Chains

```typescript
// When creating a new version, reference the previous one
const newMetadata = ConfigVersionFactory.createVersion(content, {
  application: 'payment-service',
  environment: 'prod',
  semver: '2.1.4',
  createdBy: 'pipeline@company.com',
  description: '...',
  changelog: '...',
  parentVersionId: '20251223T184532Z', // Link to parent
});
```

### 5. Use Labels for Release Management

```typescript
const metadata = ConfigVersionFactory.createVersion(content, {
  // ... other fields
  labels: [
    'v2.1.3',          // Semantic version tag
    'stable',          // Release status
    'prod-2025-12',    // Release cycle
    'critical-fix',    // Change category
  ],
});

// Query releases
const stableVersions = VersionComparator.filterByLabel(versions, 'stable');
const prodReleases = VersionComparator.filterByLabel(versions, 'prod-2025-12');
```

### 6. Implement Retention Policies

```typescript
const metadata = ConfigVersionFactory.createVersion(content, {
  // ... other fields
  retentionDays: 365, // Keep for 1 year
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
});

// S3 Lifecycle rule will archive/delete based on these values
```

## Real-World Scenario

### Payment Service Configuration Release

```typescript
// 1. Development: Create new configuration
const devConfig = {
  database: { host: 'dev-db.local', maxConnections: 5 },
  cache: { ttl: 300 },
};

const devMetadata = ConfigVersionFactory.createVersion(
  JSON.stringify(devConfig, null, 2),
  {
    application: 'payment-service',
    environment: 'dev',
    semver: '2.2.0-alpha.1',
    createdBy: 'developer@company.com',
    description: 'New feature: Advanced transaction logging',
    changelog: '- Add transaction audit trail\n- Improve error logging',
    labels: ['feature/advanced-logging', 'dev'],
  }
);

// 2. Testing: Promote to staging with approval
const stagingMetadata = {
  ...devMetadata,
  environment: 'staging',
  semver: '2.2.0-rc.1',
  parentVersionId: devMetadata.versionId,
  approvedBy: 'qa-lead@company.com',
  labels: ['release-candidate', 'v2.2.0-rc.1'],
};

// 3. Production: Release with full approval
const prodMetadata = {
  ...stagingMetadata,
  environment: 'prod',
  semver: '2.2.0',
  approvedBy: 'platform-lead@company.com',
  approvalDate: new Date().toISOString(),
  changeTicket: 'RELEASE-2025-12',
  labels: ['v2.2.0', 'stable', 'production', 'critical'],
};

// 4. Track the chain
const releaseChain = VersionComparator.getVersionChain(prodMetadata, [
  devMetadata,
  stagingMetadata,
  prodMetadata,
]);
console.log('Release path:');
releaseChain.forEach(v => {
  console.log(`  ${v.semver} (${v.environment}) - ${v.createdAt}`);
});
```

## Performance Considerations

```typescript
// Sorting large version lists
const largeVersionList = []; // 10,000+ versions
const sorted = VersionComparator.sortByTimestamp(largeVersionList);
// O(n log n) complexity - acceptable for reasonable sizes

// Querying by label (for many labels)
const withLabels = allVersions.filter(v =>
  v.labels?.some(label => ['stable', 'prod', 'critical'].includes(label))
);
// Could use index/cache for frequent queries

// Version chain traversal
const chain = VersionComparator.getVersionChain(version, allVersions);
// O(depth) - typically small (< 100 versions deep)
// Could be optimized with parent pointers

// Hash verification for large configs
const largeConfig = Buffer.from(largeContent);
const hash = new HashVersion(largeConfig);
// SHA-256 is O(n) but highly optimized in Node.js
```
