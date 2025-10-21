# Quickstart Guide: LCPlatform DevAccelerator

**Package**: `@lcplatform/dev-accelerator`
**Version**: 1.0.0 (planned)
**Runtime**: Bun 1.0+

## Installation

```bash
bun add @lcplatform/dev-accelerator
```

## Quick Examples

### Example 1: Store and Retrieve Secrets

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

// Initialize with AWS provider
const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });

// Get secrets service
const secrets = platform.getSecrets();

// Store a secret
await secrets.createSecret('db/prod/password', 'super-secret-value');

// Retrieve a secret
const password = await secrets.getSecret('db/prod/password');
console.log('Password:', password);

// Update a secret
await secrets.updateSecret('db/prod/password', 'new-super-secret-value');

// List all secrets
const allSecrets = await secrets.listSecrets();
console.log('All secrets:', allSecrets.map(s => s.name));
```

### Example 2: Upload and Download Files (Object Storage)

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';
import { readFile } from 'fs/promises';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const storage = platform.getObjectStore();

// Upload a file
const fileData = await readFile('./myfile.pdf');
await storage.putObject('my-bucket', 'uploads/myfile.pdf', fileData, {
  contentType: 'application/pdf',
  metadata: { uploadedBy: 'user123' }
});

// Download a file
const obj = await storage.getObject('my-bucket', 'uploads/myfile.pdf');
console.log('File size:', obj.size);
console.log('Content type:', obj.contentType);

// Generate presigned URL (temporary download link)
const downloadUrl = await storage.generatePresignedUrl('my-bucket', 'uploads/myfile.pdf', 3600);
console.log('Download URL (expires in 1 hour):', downloadUrl);

// List all files in a prefix
const files = await storage.listObjects('my-bucket', 'uploads/');
console.log('Files:', files.map(f => f.key));
```

### Example 3: Send and Receive Queue Messages

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const queue = platform.getQueue();

// Create a queue
await queue.createQueue('email-queue', {
  visibilityTimeout: 30,
  messageRetention: 345600, // 4 days
  enableDeadLetter: true,
  deadLetterAfterRetries: 3
});

// Send a message
const messageId = await queue.sendMessage('email-queue', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    template: 'welcome-email'
  },
  attributes: { priority: 'high' }
});
console.log('Message sent:', messageId);

// Receive messages
const messages = await queue.receiveMessages('email-queue', 10);
for (const msg of messages) {
  console.log('Processing message:', msg.body);

  // Process the message...

  // Delete message after processing
  await queue.deleteMessage('email-queue', msg.receiptHandle);
}
```

### Example 4: Publish and Subscribe to Events

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const eventBus = platform.getEventBus();

// Create an event bus
await eventBus.createEventBus('user-events');

// Publish an event
const eventId = await eventBus.publishEvent({
  source: 'user.service',
  type: 'user.created',
  data: {
    userId: '12345',
    email: 'newuser@example.com',
    createdAt: new Date()
  }
});

// Create a rule to route events
await eventBus.createRule({
  name: 'user-created-notifications',
  eventPattern: {
    source: ['user.service'],
    type: ['user.created']
  },
  enabled: true
});

// Add target for the rule
await eventBus.addTarget('user-created-notifications', {
  id: 'email-notification-target',
  type: 'queue',
  endpoint: 'email-notification-queue'
});
```

### Example 5: Deploy a Web Application

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const hosting = platform.getWebHosting();

// Deploy application
const deployment = await hosting.deployApplication({
  name: 'my-api-service',
  image: 'registry.example.com/my-api:v1.2.3',
  port: 8080,
  environment: {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://...',
    LOG_LEVEL: 'info'
  },
  cpu: 1,
  memory: 2048,
  minInstances: 2,
  maxInstances: 10
});

console.log('Deployed at:', deployment.url);
console.log('Status:', deployment.status);

// Scale application
await hosting.scaleApplication(deployment.id, {
  minInstances: 5,
  maxInstances: 20
});

// Get deployment status
const status = await hosting.getDeployment(deployment.id);
console.log('Current instances:', status.currentInstances);
```

### Example 6: Submit a Batch Job

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const batch = platform.getBatch();

// Submit a batch job
const job = await batch.submitJob({
  name: 'data-processing-job',
  image: 'registry.example.com/data-processor:latest',
  command: ['python', 'process.py', '--date', '2025-01-20'],
  environment: {
    AWS_REGION: 'us-east-1',
    OUTPUT_BUCKET: 'processed-data'
  },
  cpu: 4,
  memory: 8192,
  timeout: 3600, // 1 hour
  retryCount: 3
});

console.log('Job submitted:', job.id);

// Poll for job completion
let jobStatus = await batch.getJob(job.id);
while (jobStatus.status === 'PENDING' || jobStatus.status === 'RUNNING') {
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  jobStatus = await batch.getJob(job.id);
  console.log('Job status:', jobStatus.status);
}

if (jobStatus.status === 'SUCCEEDED') {
  console.log('Job completed successfully!');
} else {
  console.error('Job failed:', jobStatus.errorMessage);
}
```

### Example 7: OAuth2 Authentication

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const auth = platform.getAuthentication();

// Configure OAuth2 provider
auth.configure({
  provider: 'okta',
  domain: 'https://dev-123456.okta.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  scopes: ['openid', 'profile', 'email']
});

// Get login URL
const loginUrl = auth.getLoginUrl('https://myapp.com/callback', ['openid', 'email']);
console.log('Redirect user to:', loginUrl);

// After user logs in and redirects back with code...
const code = 'authorization-code-from-callback';
const tokens = await auth.exchangeCodeForToken(code, 'https://myapp.com/callback');
console.log('Access token:', tokens.accessToken);
console.log('Expires in:', tokens.expiresIn, 'seconds');

// Get user information
const userInfo = await auth.getUserInfo(tokens.accessToken);
console.log('User:', userInfo.email, userInfo.name);

// Refresh token before expiration
if (tokens.refreshToken) {
  const newTokens = await auth.refreshToken(tokens.refreshToken);
  console.log('New access token:', newTokens.accessToken);
}
```

## Using Mock Provider for Testing

The mock provider enables local development and testing without cloud provider credentials:

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

// Use mock provider
const platform = new LCPlatform({ provider: 'mock' });

// All services work identically
const secrets = platform.getSecrets();
await secrets.createSecret('test-secret', 'test-value');
const value = await secrets.getSecret('test-secret');
console.log(value); // 'test-value'

// Mock provider stores data in memory (lost on process exit)
// Perfect for unit tests!
```

## Switching Providers (Cloud Migration)

Switch from AWS to Azure with zero code changes:

```typescript
// Original AWS implementation
const awsPlatform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const secrets = awsPlatform.getSecrets();
await secrets.createSecret('api-key', 'my-api-key');

// Switch to Azure (future) - same code!
const azurePlatform = new LCPlatform({ provider: 'azure', region: 'eastus' });
const azureSecrets = azurePlatform.getSecrets();
await azureSecrets.createSecret('api-key', 'my-api-key');
// Identical API, different underlying provider
```

## Error Handling

All services throw provider-agnostic errors:

```typescript
import { LCPlatformError } from '@lcplatform/dev-accelerator';

try {
  const secret = await secrets.getSecret('nonexistent-secret');
} catch (error) {
  if (error instanceof LCPlatformError) {
    console.error('Error code:', error.code);
    console.error('Retryable:', error.retryable);

    if (error.retryable) {
      // Retry logic...
    }
  }
}
```

Common error codes:
- `RESOURCE_NOT_FOUND` - Resource doesn't exist (retryable: false)
- `SERVICE_UNAVAILABLE` - Temporary service issue (retryable: true)
- `QUOTA_EXCEEDED` - Rate limit or quota hit (retryable: false)
- `VALIDATION_ERROR` - Invalid input (retryable: false)
- `AUTHENTICATION_ERROR` - Auth failed (retryable: false)

## Configuration Best Practices

### Workload Identity (Recommended)

Use IAM roles (AWS) or managed identities (Azure) instead of access keys:

```typescript
// Production - uses workload identity automatically
const platform = new LCPlatform({
  provider: 'aws',
  region: 'us-east-1'
  // No credentials needed when running in AWS with IAM role
});
```

### Access Keys (Local Development Only)

```typescript
// Local development only - NOT for production
const platform = new LCPlatform({
  provider: 'aws',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
```

### Environment-Based Configuration

```typescript
const platform = new LCPlatform({
  provider: (process.env.LC_PLATFORM_PROVIDER || 'aws') as ProviderType,
  region: process.env.LC_PLATFORM_REGION || 'us-east-1'
});
```

## Testing with Mock Provider

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { LCPlatform } from '@lcplatform/dev-accelerator';

describe('My Application', () => {
  let platform: LCPlatform;
  let secrets: SecretsService;

  beforeEach(() => {
    platform = new LCPlatform({ provider: 'mock' });
    secrets = platform.getSecrets();
  });

  it('should retrieve database password', async () => {
    await secrets.createSecret('db/password', 'test-password');
    const password = await secrets.getSecret('db/password');
    expect(password).toBe('test-password');
  });
});
```

## Next Steps

- Read the [full API documentation](../documentation/lcplatform-product-definition.md)
- Review [architecture decisions](./research.md)
- Explore [data models](./data-model.md)
- Check [TypeScript contracts](./contracts/all-services.ts)
- See [implementation tasks](./tasks.md) (after `/speckit.tasks`)

## Support

- GitHub Issues: [https://github.com/your-org/lcplatform/issues](https://github.com/your-org/lcplatform/issues)
- Documentation: [https://lcplatform.io/docs](https://lcplatform.io/docs)
- Examples: [https://github.com/your-org/lcplatform-examples](https://github.com/your-org/lcplatform-examples)
