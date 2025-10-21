# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LCPlatform-DevAccelerator** (`@lcplatform/dev-accelerator`) is a TypeScript package that provides cloud-agnostic service wrappers using Clean/Hexagonal Architecture. The package allows applications to use cloud services (initially AWS, future: Azure, GCP) through provider-independent interfaces.

**Current Status**: Early-stage project - no source code implementation yet. The product definition (lcplatform-product-definition.md) outlines the complete architecture and service specifications.

## Architecture

### Core Design Pattern: Hexagonal Architecture

The codebase uses dependency inversion where:
- **Core interfaces** define cloud-agnostic service contracts (`WebHostingService`, `ObjectStoreService`, etc.)
- **Provider implementations** contain cloud-specific code (`providers/aws/`, `providers/azure/`, `providers/mock/`)
- **Applications depend on abstractions**, not concrete cloud SDKs

Example structure:
```
src/
├── core/               # Cloud-agnostic interfaces
│   ├── hosting/        # WebHostingService interface
│   ├── storage/        # ObjectStoreService interface
│   ├── messaging/      # QueueService, EventBusService interfaces
│   ├── configuration/  # ConfigurationService, SecretsService interfaces
│   └── authentication/ # AuthenticationService interface
├── providers/
│   ├── aws/           # AWS-specific implementations (App Runner, S3, SQS, etc.)
│   ├── azure/         # Future: Azure implementations
│   └── mock/          # Testing implementations
└── index.ts           # Main entry point
```

### Key Architectural Principles

1. **Provider Independence**: No cloud-specific types leak into core interfaces
2. **Workload Identity First**: Prefer IAM roles/managed identities over access keys
3. **Testability**: Mock provider enables testing without cloud resources
4. **Configuration Isolation**: Cloud details isolated from application code

## Service Mappings

The package abstracts 11 cloud services. Key mappings:

| Service | AWS | Azure | Interface |
|---------|-----|-------|-----------|
| Web Hosting | App Runner | Container Apps | `WebHostingService` |
| Batch Jobs | AWS Batch | Batch Service | `BatchService` |
| Secrets | Secrets Manager | Key Vault | `SecretsService` |
| Configuration | AppConfig | App Configuration | `ConfigurationService` |
| Object Storage | S3 | Blob Storage | `ObjectStoreService` |
| Queues | SQS | Storage Queues | `QueueService` |
| Events | EventBridge | Event Grid | `EventBusService` |
| Notifications | SNS | Notification Hubs | `NotificationService` |
| NoSQL DB | DocumentDB | Cosmos DB | `DocumentStoreService` |
| SQL DB | RDS PostgreSQL | Database for PostgreSQL | `DataStoreService` |
| Authentication | Cognito + Okta | Azure AD B2C | `AuthenticationService` |

See lcplatform-product-definition.md:44-373 for complete interface definitions.

## Development Workflow

This project uses **SpecKit** for feature development. Key commands are in `.claude/commands/`:

### SpecKit Workflow Commands

- `/speckit.specify` - Create/update feature specification from natural language
- `/speckit.plan` - Generate implementation plan with design artifacts
- `/speckit.tasks` - Generate dependency-ordered tasks for implementation
- `/speckit.implement` - Execute implementation from tasks.md
- `/speckit.clarify` - Ask targeted questions to refine underspecified areas
- `/speckit.analyze` - Run consistency checks across spec/plan/tasks

**Typical flow**:
1. `/speckit.specify` to create feature spec
2. `/speckit.clarify` if needed for ambiguities
3. `/speckit.plan` to design implementation
4. `/speckit.tasks` to break down into actionable items
5. `/speckit.implement` to execute

### When to Use Each Command

- Use `/speckit.specify` when starting a new feature or service implementation
- Use `/speckit.clarify` when the spec lacks critical details (auth strategy, error handling, retry logic, etc.)
- Use `/speckit.plan` before implementing to design class structure and dependencies
- Use `/speckit.tasks` to create an ordered checklist for implementation
- Use `/speckit.analyze` after task generation to verify consistency

## Application Configuration System

The platform includes a declarative configuration system for deploying applications. See lcplatform-product-definition.md:554-1148 for:

- **JSON Schema** for WebApplication and BatchJob configurations
- **Dependency declarations** (secrets, databases, queues, storage, etc.)
- **REST API** for deployment management
- **CLI commands** for local operations

Applications are deployed with config files that declare all dependencies, which the platform provisions automatically.

## Implementation Guidelines

### Adding a New Service

1. Define the cloud-agnostic interface in `src/core/{category}/`
2. Ensure interface uses generic types (no AWS/Azure-specific concepts)
3. Create AWS implementation in `src/providers/aws/`
4. Create mock implementation in `src/providers/mock/`
5. Add factory method to main `LCPlatform` class
6. Write tests using mock provider
7. Document usage examples

### Provider Implementation Rules

- **Never expose cloud SDK types** in return values from core interfaces
- **Use environment variables** for provider selection (`LC_PLATFORM_PROVIDER=aws|azure|mock`)
- **Handle authentication** via workload identity by default (IAM roles, managed identities)
- **Implement retry logic** with exponential backoff
- **Support circuit breakers** to prevent cascading failures

### Testing Strategy

- **Unit tests**: Use mock provider for all interface methods
- **Integration tests**: Use LocalStack (AWS) or Azurite (Azure) for local cloud simulation
- **Error scenarios**: Test timeout, retry, and circuit breaker behavior
- **Performance**: Benchmark connection pooling and batch operations

Example test pattern (see lcplatform-product-definition.md:456-475):
```typescript
const platform = new LCPlatform({ provider: 'mock' });
const storage = platform.getObjectStore();
await storage.putObject('bucket', 'key', Buffer.from('data'));
const result = await storage.getObject('bucket', 'key');
```

## Key Design Decisions

### Why Hexagonal Architecture?

Allows switching cloud providers by changing configuration, not application code. Critical for avoiding vendor lock-in.

### Why Mock Provider?

Enables local development and fast CI/CD without cloud credentials or costs. Every interface method must work with mock provider.

### Why Configuration Files?

Declarative configs enable infrastructure-as-code, validation before deployment, and cost estimation. See JSON schema at lcplatform-product-definition.md:562-622.

### Authentication Strategy

Prefer workload identity (IAM roles in AWS, Managed Identity in Azure) over access keys. Keys should only be used for local development with mock provider.

## Project Phases (from Product Definition)

**Phase 1** (Weeks 1-2): TypeScript setup, core interfaces, factory pattern, mock provider
**Phase 2** (Weeks 3-6): AWS implementations with IAM auth, integration tests
**Phase 3** (Weeks 7-8): Testing, documentation, usage examples
**Phase 4** (Future): Azure provider development

## Documentation Structure

The `documentation/` directory contains three main files that **MUST be kept updated** as architecture or code design changes:

### Required Documentation Files

1. **`product-summary.md`** - High-level overview for stakeholders and new developers
   - Product vision and goals
   - Key features and capabilities
   - Target audience and use cases
   - Quick start guide

2. **`product-details.md`** - Detailed product specifications
   - Complete service interface definitions
   - Configuration schemas and examples
   - API reference and usage patterns
   - Deployment and operational guides

3. **`technical-details.md`** - Technical architecture and implementation
   - Hexagonal architecture implementation details
   - Provider abstraction layer design
   - Code organization and module structure
   - Extension points and customization guides

### Documentation Maintenance

- **Update documentation immediately** when making architectural changes
- **Keep examples current** with actual code implementations
- **Document breaking changes** in all three files
- Documentation updates are **part of the definition of done** for any feature

## Quality Standards

### Test-Driven Development (TDD)

This project **strictly follows TDD practices**:

- **Write tests first** before implementing features
- **All new features require test cases** focusing on:
  - Code correctness
  - Interface stability
  - Edge cases and error handling
  - Provider abstraction integrity

### Code Coverage Requirements

- **Minimum 80% code coverage** for all public interfaces
- Coverage measured on unit tests only
- Integration tests do not count toward coverage metrics
- Coverage reports generated on every test run

### Code Quality & Linting

- **Linting runs during local test phase** for all changes
- **Critical and High severity linting errors** must be corrected immediately
- **No commits allowed** with critical/high linting violations
- Use ESLint with TypeScript-specific rules
- Prettier for code formatting (enforced in pre-commit hooks)

## Development Workflow & CI/CD

### Source Control Management

- **Platform**: GitHub
- **Branch Strategy**: Standard Git Flow
  - `main` - production-ready code
  - `develop` - integration branch
  - `feature/*` - feature branches
  - `hotfix/*` - emergency fixes

### GitHub Actions CI/CD Pipeline

The CI/CD pipeline runs on every push and pull request:

1. **Build Stage**
   - Compile TypeScript (`tsc --noEmit` for type checking)
   - Build distributable package
   - Validate package.json and dependencies

2. **Test Stage**
   - Run unit tests with coverage
   - Enforce 80% coverage threshold
   - Run linting (ESLint)
   - Run formatter check (Prettier)

3. **Package Stage** (on main branch only)
   - Build npm package
   - Publish to **GitHub Packages (npm registry)**
   - Tag release with semantic version
   - Generate release notes

### Local Development Commands

Development commands will be available in `package.json`:

```bash
npm run build          # Compile TypeScript
npm run test           # Run tests with coverage
npm run test:watch     # Run tests in watch mode
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without changes
npm run typecheck      # Type-check without building
```

## Repository Configuration

### .gitignore

Configured for TypeScript package development:
- `node_modules/`
- `dist/` and `build/` directories
- Test coverage reports (`coverage/`)
- IDE-specific files (`.vscode/`, `.idea/`)
- Environment files (`.env`, `.env.local`)
- Log files (`*.log`)
- OS-specific files (`.DS_Store`, `Thumbs.db`)

### README.md

Professional README maintained for:
- **New users** - Quick adoption and usage examples
- **Contributors** - How to contribute, coding standards, PR process
- **Stakeholders** - Project status, roadmap, and vision

README sections:
- Installation and quick start
- Core concepts and architecture overview
- Usage examples for each service
- Contributing guidelines
- License information
- Links to full documentation

## Important Files

- `documentation/product-summary.md` - High-level product overview (MUST MAINTAIN)
- `documentation/product-details.md` - Detailed specifications (MUST MAINTAIN)
- `documentation/technical-details.md` - Technical architecture (MUST MAINTAIN)
- `documentation/lcplatform-product-definition.md` - Original complete product specification
- `.specify/memory/constitution.md` - Template for project principles
- `.claude/commands/speckit.*.md` - SpecKit workflow commands
- `README.md` - Professional project documentation
- `.gitignore` - TypeScript package development exclusions

## Package Information

- **Package name**: `@lcplatform/dev-accelerator`
- **TypeScript version**: 5.9.3
- **Package manager**: npm (standard for TypeScript packages)
- **Registry**: GitHub Packages (npm)
- **Dependencies**: AWS SDK v3, Azure SDK, Jest/Vitest for testing
- **Dev dependencies**: TypeScript, ESLint, Prettier, testing frameworks
