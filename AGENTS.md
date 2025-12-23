# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**lc-platform-dev-accelerators** (`@stainedhead/lc-platform-dev-accelerators`) is a TypeScript package that provides cloud-agnostic service wrappers using Clean/Hexagonal Architecture. The package allows applications to use cloud services (initially AWS, future: Azure, GCP) through provider-independent interfaces.

**Runtime**: Bun 1.0+ (not Node.js) - Modern JavaScript runtime with native TypeScript support and built-in test runner.

**Current Status**: MVP Complete - Full dual-plane implementation with 14 Control Plane services and 11 Data Plane clients. Both AWS and Mock providers implemented with 85%+ test coverage.

## Architecture

### Core Design Pattern: Hexagonal Architecture

The codebase uses dependency inversion where:
- **Core interfaces** define cloud-agnostic service contracts (`WebHostingService`, `ObjectStoreService`, etc.)
- **Provider implementations** contain cloud-specific code (`providers/aws/`, `providers/azure/`, `providers/mock/`)
- **Applications depend on abstractions**, not concrete cloud SDKs

### Dual-Plane Architecture Structure

The platform implements a **dual-plane architecture** separating infrastructure management from application runtime:

```
src/
├── core/                    # Cloud-agnostic interfaces
│   ├── services/           # Control Plane interfaces (14 total)
│   │   ├── WebHostingService.ts
│   │   ├── FunctionHostingService.ts
│   │   ├── BatchService.ts
│   │   ├── DataStoreService.ts
│   │   ├── DocumentStoreService.ts
│   │   ├── ObjectStoreService.ts
│   │   ├── QueueService.ts
│   │   ├── EventBusService.ts
│   │   ├── SecretsService.ts
│   │   ├── ConfigurationService.ts
│   │   ├── NotificationService.ts
│   │   ├── AuthenticationService.ts
│   │   ├── CacheService.ts
│   │   └── ContainerRepoService.ts
│   │
│   ├── clients/            # Data Plane interfaces (11 total)
│   │   ├── QueueClient.ts
│   │   ├── ObjectClient.ts
│   │   ├── SecretsClient.ts
│   │   ├── ConfigClient.ts
│   │   ├── EventPublisher.ts
│   │   ├── NotificationClient.ts
│   │   ├── DocumentClient.ts
│   │   ├── DataClient.ts
│   │   ├── AuthClient.ts
│   │   ├── CacheClient.ts
│   │   └── ContainerRepoClient.ts
│   │
│   └── types/              # Shared type definitions
│
├── providers/
│   ├── aws/               # AWS-specific implementations
│   │   ├── services/      # Control plane AWS implementations
│   │   └── clients/       # Data plane AWS implementations
│   ├── azure/             # Future: Azure implementations
│   └── mock/              # Testing implementations
│       ├── services/      # Mock control plane implementations  
│       └── clients/       # Mock data plane implementations
│
├── factory/               # Dependency injection containers
│   ├── LCPlatformFactory.ts    # Control plane factory
│   └── LCAppRuntimeFactory.ts  # Data plane factory
│
├── LCPlatform.ts          # Control plane entry point (infrastructure management)
├── LCAppRuntime.ts        # Data plane entry point (application runtime)
└── index.ts               # Public API exports
```

### Key Architectural Principles

1. **Provider Independence**: No cloud-specific types leak into core interfaces
2. **Workload Identity First**: Prefer IAM roles/managed identities over access keys
3. **Testability**: Mock provider enables testing without cloud resources
4. **Configuration Isolation**: Cloud details isolated from application code

## Service Mappings

The package implements a **dual-plane architecture** with 25 total abstractions:
- **Control Plane**: 14 services for infrastructure management (LCPlatform class)
- **Data Plane**: 11 clients for application runtime operations (LCAppRuntime class)

Key service mappings:

| Service | AWS | Azure | Interface |
|---------|-----|-------|-----------|
| Web Hosting | App Runner | Container Apps | `WebHostingService` |
| Function Hosting | Lambda | Function Apps | `FunctionHostingService` |
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
| Cache | ElastiCache Redis | Cache for Redis | `CacheService` |
| Container Repo | Elastic Container Registry | Container Registry | `ContainerRepoService` |

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

- **Test Framework**: Bun's built-in test runner (compatible with Jest-like API)
- **Unit tests**: Use mock provider for all interface methods (in `tests/unit/`)
- **Integration tests**: Use LocalStack (AWS) or Azurite (Azure) for local cloud simulation (in `tests/integration/`)
- **Contract tests**: Verify provider parity (AWS ↔ Mock) (in `tests/contract/`)
- **Error scenarios**: Test timeout, retry, and circuit breaker behavior
- **Performance**: Benchmark connection pooling and batch operations

Example test pattern using Bun test:
```typescript
import { describe, it, expect, beforeEach } from 'bun:test';

describe('ObjectStoreService', () => {
  let platform: LCPlatform;

  beforeEach(() => {
    platform = new LCPlatform({ provider: 'mock' });
  });

  it('should store and retrieve objects', async () => {
    const storage = platform.getObjectStore();
    await storage.putObject('bucket', 'key', Buffer.from('data'));
    const result = await storage.getObject('bucket', 'key');
    expect(result.data).toEqual(Buffer.from('data'));
  });
});
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

**CRITICAL**: There are multiple documentation files that serve different purposes:

### Main Project Documentation
- **`/README.md`** (root) - **PRIMARY project documentation displayed on GitHub** 
  - **ALWAYS update this file** when making documentation changes
  - This is what users see when visiting the GitHub repository
  - Contains architecture diagrams, service tables, and usage examples

### Generated API Documentation  
- **`/docs/README.md`** - **TypeDoc-generated documentation landing page**
  - **DO NOT manually edit** - this is auto-generated from TypeDoc
  - Contains links to auto-generated class/interface documentation
  - Updated automatically when running `bun run docs`

### Technical Documentation Directory
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

### Documentation Update Priority Order

When making documentation changes, **ALWAYS follow this order**:

1. **`/README.md`** (root) - **UPDATE FIRST** - This is the GitHub repository homepage
2. `documentation/product-summary.md` - Update for stakeholder communication
3. `documentation/product-details.md` - Update detailed specifications
4. `documentation/technical-details.md` - Update technical architecture
5. **NEVER manually edit `/docs/README.md`** - This is auto-generated by TypeDoc

**Remember**: The root `/README.md` is what users see when they visit the GitHub repository. Always prioritize keeping this file current and comprehensive.

### README Synchronization Workflow

**CRITICAL**: Keep both README files synchronized using TypeDoc as the synchronization mechanism:

- **Source of Truth**: `/README.md` (root) - Edit this file only
- **Generated Copy**: `/docs/README.md` - Never edit manually
- **Sync Command**: `bun run docs` - Regenerates docs/README.md from root README.md
- **Automation**: TypeDoc uses `"readme": "README.md"` in typedoc.json configuration

**Synchronization Steps**:
1. Make all documentation changes to `/README.md` (root)
2. Run `bun run docs` to regenerate TypeDoc documentation
3. Verify `/docs/README.md` reflects the changes from root README.md
4. Commit both files together to maintain synchronization

**Pre-commit Workflow** (recommended):
```bash
# 1. Update root README.md with your changes
# 2. Regenerate TypeDoc documentation
bun run docs
# 3. Stage both README files
git add README.md docs/README.md
# 4. Commit with descriptive message
git commit -m "docs: update README with [your changes]"
```

**Configuration Details**:
- TypeDoc configuration in `typedoc.json` specifies `"readme": "README.md"`
- Documentation output directory: `"out": "docs"`
- The generated `/docs/README.md` includes additional TypeDoc navigation elements
- Both files should be committed together to maintain synchronization

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

- **Auto-format code first** (`bun run format`) before any linting checks
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
   - Auto-format code (`bun run format`) before linting
   - Run linting (ESLint)
   - Run formatter check (Prettier)

3. **Package Stage** (on main branch only)
   - Build npm package
   - Publish to **GitHub Packages (npm registry)**
   - Tag release with semantic version
   - Generate release notes

### Local Development Commands

Development commands using Bun runtime (in `package.json`):

```bash
bun run build          # Compile TypeScript
bun test               # Run tests with coverage (Bun's built-in test runner)
bun test --watch       # Run tests in watch mode
bun test tests/unit    # Run unit tests only
bun test tests/integration # Run integration tests
bun run lint           # Run ESLint
bun run lint:fix       # Auto-fix linting issues
bun run format         # Format code with Prettier
bun run format:check   # Check formatting without changes
bun run typecheck      # Type-check without building
```

### Pre-Checkin Verification Steps

Before committing code, follow this mandatory sequence to ensure quality:

```bash
# 1. Format code first (fixes most linting issues automatically)
bun run format

# 2. Add all changes to staging
git add -A

# 3. Run linting checks (should pass after formatting)
bun run lint

# 4. Run tests to verify functionality
bun test

# 5. Commit with descriptive message
git commit -m "descriptive commit message"

# 6. Push to remote repository
git push origin main
```

**Note**: This project uses **Bun runtime**, not Node.js. Bun provides native TypeScript support and a built-in test runner that's significantly faster than Jest/Vitest.

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

### Primary Documentation (UPDATE THESE FIRST)
- **`README.md`** - **MAIN project documentation (GitHub repository homepage)**
- `documentation/product-summary.md` - High-level product overview (MUST MAINTAIN)
- `documentation/product-details.md` - Detailed specifications (MUST MAINTAIN)  
- `documentation/technical-details.md` - Technical architecture (MUST MAINTAIN)

### Generated Documentation (DO NOT EDIT MANUALLY)
- `docs/README.md` - TypeDoc-generated API documentation landing page
- `docs/classes/` - Auto-generated class documentation
- `docs/interfaces/` - Auto-generated interface documentation

### Project Configuration
- `documentation/lcplatform-product-definition.md` - Original complete product specification
- `.specify/memory/constitution.md` - Template for project principles
- `.claude/commands/speckit.*.md` - SpecKit workflow commands
- `.gitignore` - TypeScript package development exclusions

## Package Information

- **Package name**: `@stainedhead/lc-platform-dev-accelerators`
- **TypeScript version**: 5.9.3
- **Runtime**: Bun 1.0+ (not Node.js)
- **Package manager**: bun (replaces npm)
- **Registry**: GitHub Packages (npm compatible)
- **Dependencies**: AWS SDK v3 (modular packages), openid-client (OAuth2), lru-cache (caching)
- **Dev dependencies**: TypeScript, ESLint, Prettier
- **Testing**: Bun's built-in test runner (not Jest/Vitest)
