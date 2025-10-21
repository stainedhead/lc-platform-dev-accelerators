# LCPlatform-DevAccelerator

> Cloud-agnostic service wrappers for modern application development

[![Build Status](https://github.com/YOUR_ORG/LCPlatform-DevAccelerator/workflows/CI/badge.svg)](https://github.com/YOUR_ORG/LCPlatform-DevAccelerator/actions)
[![Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen.svg)](https://github.com/YOUR_ORG/LCPlatform-DevAccelerator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

**LCPlatform-DevAccelerator** (`@lcplatform/dev-accelerator`) is a TypeScript package that provides cloud-agnostic service wrappers, enabling your applications to seamlessly work across multiple cloud providers (AWS, Azure, GCP) without vendor lock-in.

Built on **Clean/Hexagonal Architecture** principles, this package abstracts cloud services behind provider-independent interfaces, allowing you to:

- ✅ Switch cloud providers with configuration changes, not code rewrites
- ✅ Test locally without cloud credentials using mock providers
- ✅ Deploy to AWS today, Azure tomorrow, without application changes
- ✅ Avoid vendor lock-in and maintain architectural flexibility

## Key Features

### 🌐 Multi-Cloud Support

Currently supports AWS with Azure and GCP implementations planned:

| Service | AWS | Azure | Interface |
|---------|-----|-------|-----------|
| Web Hosting | App Runner | Container Apps | `WebHostingService` |
| Object Storage | S3 | Blob Storage | `ObjectStoreService` |
| Queues | SQS | Storage Queues | `QueueService` |
| Secrets | Secrets Manager | Key Vault | `SecretsService` |
| NoSQL Database | DocumentDB | Cosmos DB | `DocumentStoreService` |
| ...and 6 more services | | | |

### 🎯 Clean Architecture

- **Core Interfaces**: Cloud-agnostic service contracts
- **Provider Implementations**: Cloud-specific adapters (AWS, Azure, Mock)
- **Dependency Inversion**: Applications depend on abstractions, not concrete implementations

### 🧪 Testing Made Easy

Mock provider enables local development and testing without cloud resources:

```typescript
const platform = new LCPlatform({ provider: 'mock' });
const storage = platform.getObjectStore();
await storage.putObject('bucket', 'test.txt', Buffer.from('Hello World'));
```

## Installation

### From GitHub Packages

```bash
npm install @lcplatform/dev-accelerator
```

**Note**: Configure npm to use GitHub Packages for the `@lcplatform` scope:

```bash
echo "@lcplatform:registry=https://npm.pkg.github.com" >> .npmrc
```

## Quick Start

### Basic Usage

```typescript
import { LCPlatform } from '@lcplatform/dev-accelerator';

// Initialize with AWS provider
const platform = new LCPlatform({
  provider: 'aws',
  region: 'us-east-1'
});

// Use object storage (works with any provider)
const storage = platform.getObjectStore();
await storage.createBucket('my-bucket');
await storage.putObject('my-bucket', 'file.txt', Buffer.from('content'));

// Use queue service
const queue = platform.getQueue();
await queue.createQueue('my-queue');
await queue.sendMessage('my-queue', { body: 'Hello!' });
```

### Switching Providers

Change providers with just configuration - no code changes needed:

```typescript
// Development: Use mock provider
const devPlatform = new LCPlatform({ provider: 'mock' });

// Production: Use AWS
const prodPlatform = new LCPlatform({
  provider: 'aws',
  region: 'us-east-1'
});

// Future: Use Azure
const azurePlatform = new LCPlatform({
  provider: 'azure',
  region: 'eastus'
});
```

### Environment-Based Configuration

```typescript
const platform = new LCPlatform({
  provider: process.env.LC_PLATFORM_PROVIDER || 'mock',
  region: process.env.LC_PLATFORM_REGION || 'us-east-1'
});
```

## Core Concepts

### Provider Independence

All service interfaces are designed without cloud-specific concepts:

```typescript
// ✅ Good: Cloud-agnostic interface
interface ObjectStoreService {
  putObject(bucket: string, key: string, data: Buffer): Promise<void>;
  getObject(bucket: string, key: string): Promise<ObjectData>;
}

// ❌ Bad: AWS-specific types leaked into interface
interface ObjectStoreService {
  putObject(params: S3.PutObjectRequest): Promise<S3.PutObjectOutput>;
}
```

### Workload Identity First

Prefer IAM roles and managed identities over access keys:

```typescript
// AWS: Uses IAM role automatically when running on EC2/ECS/Lambda
const platform = new LCPlatform({ provider: 'aws' });

// Azure: Uses Managed Identity automatically when running on Azure services
const platform = new LCPlatform({ provider: 'azure' });
```

### Declarative Application Deployment

Deploy applications with JSON configuration files:

```json
{
  "apiVersion": "v1",
  "kind": "WebApplication",
  "metadata": { "name": "my-api" },
  "spec": {
    "runtime": {
      "image": "my-api:latest",
      "port": 8080
    },
    "dependencies": {
      "databases": [{ "name": "users-db", "type": "postgresql" }],
      "storage": [{ "name": "uploads", "bucket": "user-uploads" }]
    }
  }
}
```

## Available Services

The package currently provides interfaces for **11 cloud services**:

1. **WebHostingService** - Deploy containerized web applications
2. **BatchService** - Execute batch jobs and scheduled tasks
3. **SecretsService** - Securely store and retrieve sensitive data
4. **ConfigurationService** - Manage application configuration
5. **ObjectStoreService** - Store and retrieve binary objects/files
6. **QueueService** - Message queue for asynchronous processing
7. **EventBusService** - Event-driven architecture support
8. **NotificationService** - Send notifications via email/SMS/push
9. **DocumentStoreService** - NoSQL document database operations
10. **DataStoreService** - Relational database (SQL) operations
11. **AuthenticationService** - OAuth2 authentication with external providers

See [documentation/product-details.md](documentation/product-details.md) for complete API reference.

## Documentation

- **[Product Summary](documentation/product-summary.md)** - High-level overview and use cases
- **[Product Details](documentation/product-details.md)** - Complete API reference and specifications
- **[Technical Details](documentation/technical-details.md)** - Architecture and implementation guide
- **[AGENTS.md](AGENTS.md)** - Development guidelines for AI assistants and contributors

## Development

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- TypeScript 5.9.3+

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/LCPlatform-DevAccelerator.git
cd LCPlatform-DevAccelerator

# Install dependencies
npm install

# Build the project
npm run build
```

### Development Commands

```bash
npm run build          # Compile TypeScript
npm run test           # Run tests with coverage
npm run test:watch     # Run tests in watch mode
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting
npm run typecheck      # Type-check without building
```

### Running Tests

We practice **Test-Driven Development (TDD)** with strict quality standards:

- ✅ Write tests before implementation
- ✅ Maintain **80%+ code coverage** on all public interfaces
- ✅ All tests must pass before commits
- ✅ Integration tests use LocalStack (AWS) or Azurite (Azure)

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode during development
npm run test:watch

# Run only unit tests (fast feedback)
npm run test:unit
```

## Contributing

We welcome contributions! Please see our contributing guidelines:

### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Write tests first** (TDD approach)
3. **Implement the feature** to make tests pass
4. **Ensure coverage ≥ 80%** for new code
5. **Run linting and formatting** (`npm run lint:fix && npm run format`)
6. **Update documentation** in `documentation/` directory
7. **Submit a pull request** to the `develop` branch

### Code Quality Standards

- ✅ All code must pass ESLint with **zero critical/high severity errors**
- ✅ Code must be formatted with Prettier
- ✅ TypeScript strict mode enabled
- ✅ No `any` types unless absolutely necessary
- ✅ All public APIs documented with TSDoc comments

### Pull Request Process

1. Ensure all tests pass and coverage meets requirements
2. Update documentation if adding/changing features
3. Follow conventional commit messages: `feat:`, `fix:`, `docs:`, `test:`
4. Request review from maintainers
5. Address all review comments
6. Squash commits before merging

## CI/CD Pipeline

Every push and pull request triggers GitHub Actions:

1. **Build** - Compile TypeScript and validate package
2. **Test** - Run tests with coverage enforcement (≥80%)
3. **Lint** - Check code quality with ESLint
4. **Format** - Verify Prettier formatting
5. **Package** - Publish to GitHub Packages (on `main` branch only)

## Roadmap

### Current Phase: Phase 1 - Foundation (Weeks 1-2)
- [ ] TypeScript project setup
- [ ] Core interface definitions
- [ ] Provider factory pattern
- [ ] Mock provider implementation

### Phase 2 - AWS Implementation (Weeks 3-6)
- [ ] AWS provider for all 11 services
- [ ] IAM role-based authentication
- [ ] Integration tests with LocalStack

### Phase 3 - Testing & Documentation (Weeks 7-8)
- [ ] Comprehensive test coverage
- [ ] API documentation
- [ ] Usage examples and tutorials

### Phase 4 - Azure Support (Future)
- [ ] Azure provider development
- [ ] Multi-cloud orchestration
- [ ] Cost optimization features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_ORG/LCPlatform-DevAccelerator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_ORG/LCPlatform-DevAccelerator/discussions)
- **Documentation**: [Documentation Directory](documentation/)

## Acknowledgments

Built with ❤️ using:
- [TypeScript](https://www.typescriptlang.org/)
- [AWS SDK for JavaScript v3](https://github.com/aws/aws-sdk-js-v3)
- [Azure SDK for JavaScript](https://github.com/Azure/azure-sdk-for-js)
- [Jest](https://jestjs.io/) for testing

---

**Note**: This project is in active development. APIs may change before the 1.0 release.
