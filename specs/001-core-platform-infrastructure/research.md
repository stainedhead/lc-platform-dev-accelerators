# Research: Cloud-Agnostic Service Layer Implementation

**Feature**: 001-core-platform-infrastructure
**Date**: 2025-10-20
**Phase**: 0 - Research & Technical Decisions

## Overview

This document captures technical research, architectural decisions, and best practices for implementing 11 cloud-agnostic service wrappers using hexagonal architecture with TypeScript and Bun runtime.

## Key Technical Decisions

### Decision 1: Provider Abstraction Pattern

**Decision**: Use Hexagonal Architecture (Ports & Adapters) with Provider Factory Pattern

**Rationale**:
- Hexagonal architecture enforces clear separation between core business logic (service interfaces) and infrastructure concerns (cloud providers)
- Provider factory pattern enables runtime provider selection via configuration
- Aligns with Constitution Principle I (Provider Independence)
- Proven pattern for multi-cloud abstractions (see Terraform, Pulumi)

**Alternatives Considered**:
- **Strategy Pattern Only**: Rejected because it doesn't enforce architectural boundaries as strictly
- **Plugin Architecture**: Rejected as over-engineered for initial AWS + Mock providers
- **Adapter Pattern Without Factory**: Rejected because it requires compile-time provider selection

**Implementation Approach**:
```typescript
// Core interface (port)
interface SecretsService {
  getSecret(name: string): Promise<string | object>;
}

// AWS adapter
class AwsSecretsService implements SecretsService {
  // AWS SDK implementation
}

// Mock adapter
class MockSecretsService implements SecretsService {
  // In-memory implementation
}

// Factory
class ProviderFactory {
  static createSecretsService(provider: 'aws' | 'mock'): SecretsService {
    // Return appropriate implementation
  }
}
```

### Decision 2: AWS SDK v3 Modular Approach

**Decision**: Use AWS SDK v3 modular packages (one package per service, not monolithic SDK)

**Rationale**:
- Reduces bundle size significantly (only import needed services)
- Faster installation and build times
- Better tree-shaking support in TypeScript/Bun
- AWS SDK v3 is promise-based (better async/await support than v2)
- AWS SDK v3 supports middleware for retry logic and observability

**Alternatives Considered**:
- **AWS SDK v2**: Rejected - callback-based, monolithic, deprecated
- **Monolithic AWS SDK v3**: Rejected - unnecessary bundle bloat

**Required Packages**:
```json
{
  "@aws-sdk/client-app-runner": "^3.x",
  "@aws-sdk/client-batch": "^3.x",
  "@aws-sdk/client-secrets-manager": "^3.x",
  "@aws-sdk/client-appconfig": "^3.x",
  "@aws-sdk/client-docdb": "^3.x",
  "@aws-sdk/client-rds": "^3.x",
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/client-sqs": "^3.x",
  "@aws-sdk/client-eventbridge": "^3.x",
  "@aws-sdk/client-sns": "^3.x"
}
```

### Decision 3: Bun Runtime Testing Framework

**Decision**: Use Bun's built-in test runner (`bun test`) instead of Jest/Vitest

**Rationale**:
- Native to Bun runtime (no additional dependencies)
- Extremely fast execution (~10x faster than Jest for TypeScript)
- Built-in TypeScript support (no ts-jest needed)
- Compatible with Jest-like API (describe, it, expect)
- Built-in code coverage support
- Bun runtime requirement already in spec

**Alternatives Considered**:
- **Jest**: Rejected - slower for TypeScript, requires ts-jest, unnecessary dependency
- **Vitest**: Rejected - adds dependency, Bun test runner sufficient
- **Mocha + Chai**: Rejected - older pattern, less TypeScript-friendly

**Example Test Structure**:
```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { MockSecretsService } from '../src/providers/mock';

describe('MockSecretsService', () => {
  let service: MockSecretsService;

  beforeEach(() => {
    service = new MockSecretsService();
  });

  it('should store and retrieve secrets', async () => {
    await service.createSecret('test', 'value');
    const result = await service.getSecret('test');
    expect(result).toBe('value');
  });
});
```

### Decision 4: Error Handling Strategy

**Decision**: Custom error hierarchy with provider-agnostic error types

**Rationale**:
- Applications shouldn't catch AWS-specific errors (violates provider independence)
- Consistent error types across providers (AWS, Mock, future Azure)
- Enables retry logic at abstraction layer, not provider layer
- Aligns with FR-062 (automatic retry with exponential backoff)

**Error Hierarchy**:
```typescript
class LCPlatformError extends Error {
  constructor(message: string, public code: string, public retryable: boolean) {
    super(message);
  }
}

class SecretNotFoundError extends LCPlatformError {
  constructor(name: string) {
    super(`Secret '${name}' not found`, 'SECRET_NOT_FOUND', false);
  }
}

class ServiceUnavailableError extends LCPlatformError {
  constructor(service: string) {
    super(`${service} temporarily unavailable`, 'SERVICE_UNAVAILABLE', true);
  }
}

class QuotaExceededError extends LCPlatformError {
  constructor(resource: string) {
    super(`Quota exceeded for ${resource}`, 'QUOTA_EXCEEDED', false);
  }
}
```

**Mapping Strategy**:
- AWS `ResourceNotFoundException` → `SecretNotFoundError`
- AWS `ServiceUnavailableException` → `ServiceUnavailableError`
- AWS `ThrottlingException` → `QuotaExceededError`

### Decision 5: Retry Logic Implementation

**Decision**: Implement retry logic with exponential backoff at provider adapter level using AWS SDK v3 middleware

**Rationale**:
- AWS SDK v3 provides configurable retry middleware
- Retryable errors identified by custom error types (see Decision 4)
- Constitution aligns with AWS best practices (exponential backoff)
- Prevents cascade failures during cloud provider degradation

**Configuration**:
```typescript
import { RetryStrategy } from '@aws-sdk/middleware-retry';

const retryStrategy = new RetryStrategy({
  maxAttempts: 3,
  delayMs: (attempt) => Math.min(1000 * (2 ** attempt), 10000), // exponential with 10s cap
  retryableErrorCodes: ['SERVICE_UNAVAILABLE', 'QUOTA_EXCEEDED']
});
```

**Alternatives Considered**:
- **Application-level retry**: Rejected - duplicates effort across consumers
- **No retry logic**: Rejected - violates FR-062 requirement

### Decision 6: Connection Pooling Strategy

**Decision**: Use provider SDK connection pooling where available, expose pool configuration in service constructors

**Rationale**:
- Database services (DataStoreService, DocumentStoreService) benefit significantly from pooling
- AWS SDKs handle HTTP connection pooling automatically
- Pool configuration exposed for tuning (see FR-063)
- Aligns with SC-008 (100 concurrent connections)

**Implementation**:
```typescript
interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeoutMs?: number;
  acquireTimeoutMs?: number;
}

class AwsDataStoreService implements DataStoreService {
  constructor(
    private config: { poolConfig?: ConnectionPoolConfig }
  ) {
    // Use poolConfig for RDS connection pool
  }
}
```

### Decision 7: Mock Provider Implementation Strategy

**Decision**: In-memory data structures with realistic latency simulation

**Rationale**:
- Enables offline development (Constitution Principle VI)
- Fast test execution for unit tests (no network I/O)
- Realistic latency simulation helps identify performance issues early
- Supports SC-013 (95% behavioral parity with cloud providers)

**Implementation Pattern**:
```typescript
class MockSecretsService implements SecretsService {
  private secrets = new Map<string, { value: string | object; version: string }>();

  async createSecret(name: string, value: string | object): Promise<Secret> {
    await this.simulateLatency(10); // 10ms simulated latency
    const version = crypto.randomUUID();
    this.secrets.set(name, { value, version });
    return { name, version, created: new Date(), lastModified: new Date() };
  }

  private async simulateLatency(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Decision 8: Caching Strategy for Secrets and Configuration

**Decision**: Implement in-memory TTL-based cache with LRU eviction at service level

**Rationale**:
- SC-004 requires <100ms secret retrieval (cache hit)
- SC-005 requires configuration refresh within 5 minutes (TTL)
- LRU prevents unbounded memory growth
- Cache at abstraction layer (not provider layer) for consistency

**Implementation**:
```typescript
class CachedSecretsService implements SecretsService {
  private cache = new LRUCache<string, CachedValue>({ max: 1000, ttl: 60000 });

  constructor(private underlying: SecretsService) {}

  async getSecret(name: string): Promise<string | object> {
    const cached = this.cache.get(name);
    if (cached) return cached.value;

    const value = await this.underlying.getSecret(name);
    this.cache.set(name, { value, fetchedAt: Date.now() });
    return value;
  }
}
```

**Library**: Use `lru-cache` npm package (minimal, well-tested)

### Decision 9: OAuth2 Authentication Library

**Decision**: Use `openid-client` library for OAuth2/OIDC flows

**Rationale**:
- Supports Okta, Auth0, Azure AD (FR-053 requirements)
- Well-maintained, certified by OpenID Foundation
- Handles token refresh, PKCE, discovery automatically
- Reduces implementation complexity vs. manual OAuth2

**Alternatives Considered**:
- **Manual OAuth2 implementation**: Rejected - error-prone, security risks
- **Passport.js**: Rejected - designed for Express.js server-side, not client SDK

**Integration**:
```typescript
import { Issuer, generators } from 'openid-client';

class AwsAuthenticationService implements AuthenticationService {
  async configure(config: AuthConfig): Promise<void> {
    const issuer = await Issuer.discover(config.domain);
    this.client = new issuer.Client({
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
  }
}
```

### Decision 10: LocalStack for Integration Testing

**Decision**: Use LocalStack Community Edition for AWS integration tests

**Rationale**:
- Provides local AWS service emulation (S3, SQS, SNS, EventBridge, Secrets Manager)
- Free community edition supports all required services
- Docker-based, easy CI/CD integration
- Aligns with constitution documentation requirement (Principle VI)

**Alternatives Considered**:
- **Real AWS account for testing**: Rejected - costs, slower, requires credentials management
- **Moto (Python-based)**: Rejected - less complete service coverage than LocalStack

**CI/CD Integration**:
```yaml
# GitHub Actions example
services:
  localstack:
    image: localstack/localstack:latest
    env:
      SERVICES: s3,sqs,sns,secretsmanager,appconfig,eventbridge,batch
```

## Best Practices Research

### TypeScript Best Practices for Library Packages

1. **Strict Type Checking**:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitOverride": true,
       "exactOptionalPropertyTypes": true
     }
   }
   ```

2. **Declaration Maps for Debugging**:
   ```json
   {
     "compilerOptions": {
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true
     }
   }
   ```

3. **Exports Configuration**:
   ```json
   {
     "exports": {
       ".": "./dist/index.js",
       "./core": "./dist/core/index.js",
       "./providers/aws": "./dist/providers/aws/index.js",
       "./providers/mock": "./dist/providers/mock/index.js"
     }
   }
   ```

### Hexagonal Architecture Best Practices

1. **Dependency Direction**: Core interfaces depend on nothing, providers depend on core
2. **No Leaky Abstractions**: Return types must not expose provider-specific types
3. **Interface Segregation**: Small, focused interfaces per service (not monolithic)
4. **Dependency Injection**: Providers injected via factory, not imported directly

### Multi-Cloud Abstraction Patterns

1. **Capability-Based Design**: Abstract common capabilities, not specific provider features
2. **Feature Flags**: Use configuration to enable provider-specific advanced features
3. **Documentation**: Document provider-specific limitations (e.g., AWS vs Azure differences)

### Performance Optimization Strategies

1. **Batch Operations**: Implement batch APIs where underlying provider supports them
2. **Connection Reuse**: HTTP clients and database pools shared across instances
3. **Lazy Initialization**: Defer provider SDK initialization until first use
4. **Streaming**: Use streams for large object storage operations

## Implementation Phases

Based on research, recommend this implementation sequence:

### Phase 1: Core Foundation (Week 1)
- Project structure and build configuration
- Core interfaces for all 11 services
- Provider factory pattern
- Error hierarchy and common types
- LCPlatform main class

### Phase 2: Mock Provider (Week 2)
- Mock implementations for all 11 services
- Unit tests for mock provider
- Achieve 80% coverage baseline

### Phase 3: AWS Provider - Critical Services (Week 3-4)
- SecretsService (AWS Secrets Manager)
- ConfigurationService (AWS AppConfig)
- ObjectStoreService (S3)
- DataStoreService (RDS PostgreSQL)
- Integration tests with LocalStack

### Phase 4: AWS Provider - Messaging (Week 5)
- QueueService (SQS)
- EventBusService (EventBridge)
- NotificationService (SNS)
- Integration tests

### Phase 5: AWS Provider - Compute (Week 6)
- WebHostingService (App Runner)
- BatchService (AWS Batch)
- Integration tests

### Phase 6: Authentication (Week 7)
- AuthenticationService with Okta/Auth0/Azure AD
- OAuth2 flow testing
- Token management

### Phase 7: Contract Tests & Documentation (Week 8)
- Contract tests verifying AWS ↔ Mock parity
- Documentation updates
- Quickstart guide
- Performance benchmarking

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| AWS SDK v3 API changes | High | Low | Pin major versions, monitor changelogs |
| Bun runtime maturity issues | High | Medium | Extensive testing, fallback to Node.js if critical bugs |
| Provider parity drift (AWS ≠ Mock) | Medium | High | Contract tests enforce behavioral parity |
| Performance goals unmet | Medium | Low | Early performance testing, caching layer |
| LocalStack limitations | Low | Medium | Document LocalStack vs real AWS differences |

## Open Questions

*All technical questions resolved. No NEEDS CLARIFICATION items remaining.*

## References

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Bun Documentation](https://bun.sh/docs)
- [Hexagonal Architecture (Alistair Cockburn)](https://alistair.cockburn.us/hexagonal-architecture/)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [LRU Cache npm package](https://www.npmjs.com/package/lru-cache)
- [TypeScript Handbook - Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
