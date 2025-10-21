# Implementation Plan: Cloud-Agnostic Service Layer Implementation

**Branch**: `001-core-platform-infrastructure` | **Date**: 2025-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-platform-infrastructure/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement 11 cloud-agnostic service wrappers (WebHosting, Batch, Secrets, Configuration, DocumentStore, DataStore, ObjectStore, Queue, EventBus, Notification, Authentication) using hexagonal architecture with TypeScript 5.9.3 and Bun runtime 1.0+. AWS SDK v3 modular packages provide AWS provider implementation, with mock provider for local testing. Package published to GitHub Packages as `@stainedhead/lc-platform-dev-accelerators`.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Bun runtime 1.0+
**Primary Dependencies**: AWS SDK v3 (modular packages per service), provider abstraction layer, openid-client (OAuth2), lru-cache (caching)
**Storage**: N/A (package provides storage abstractions, not storage itself)
**Testing**: Bun test framework, LocalStack for AWS integration tests, contract tests for provider parity
**Target Platform**: Bun runtime on Linux/macOS servers, cloud environments with workload identity
**Project Type**: Single TypeScript package (`@stainedhead/lc-platform-dev-accelerators`)
**Performance Goals**: <100ms secret retrieval (cached), 1000 msg/sec queue throughput, 99.9% operation success rate under normal conditions
**Constraints**: Provider-agnostic interfaces (no AWS/Azure types in core), TDD mandatory, 80% code coverage, zero critical linting violations
**Scale/Scope**: 11 service interfaces, 3 providers (AWS, Mock, future Azure), 66 functional requirements, ~50-60 TypeScript interface methods total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Evaluation

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Provider Independence** | ✅ PASS | Core interfaces in `src/core/` will use only generic TypeScript types. All AWS/Azure-specific types isolated in `src/providers/{aws,azure}/`. Contract tests enforce interface purity. |
| **II. Test-Driven Development** | ✅ PASS | TDD workflow embedded in task generation (`/speckit.tasks` will create test-first tasks). Tests written before implementation for all 11 services. |
| **III. Code Coverage Requirements** | ✅ PASS | Bun test with `--coverage` enforces 80% threshold. Unit tests in `tests/unit/`, integration in `tests/integration/`. CI/CD pipeline configured to fail below 80%. |
| **IV. Code Quality & Linting** | ✅ PASS | ESLint + Prettier pre-configured in repository. Pre-commit hooks prevent commits with critical/high violations. CI/CD runs linting before tests. |
| **V. Workload Identity First** | ✅ PASS | AWS provider defaults to IAM role authentication. Access keys require explicit opt-in via configuration. Documentation emphasizes workload identity in all examples (see quickstart.md). |
| **VI. Mock Provider Completeness** | ✅ PASS | Mock provider implementation required for all 11 services. All tests must pass with `provider: 'mock'`. Contract tests verify AWS ↔ Mock parity. |
| **VII. Documentation as Code** | ✅ PASS | Documentation in `documentation/` already exists. Plan includes documentation updates as part of definition of done. Breaking changes will update all three doc files. |

**Constitution Compliance**: 7/7 principles PASS ✅

**Complexity Justification**: Not required (no violations)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── core/                      # Provider-agnostic interfaces (Principle I)
│   ├── services/              # Service interfaces
│   │   ├── WebHostingService.ts
│   │   ├── BatchService.ts
│   │   ├── SecretsService.ts
│   │   ├── ConfigurationService.ts
│   │   ├── DocumentStoreService.ts
│   │   ├── DataStoreService.ts
│   │   ├── ObjectStoreService.ts
│   │   ├── QueueService.ts
│   │   ├── EventBusService.ts
│   │   ├── NotificationService.ts
│   │   └── AuthenticationService.ts
│   ├── types/                 # Shared TypeScript types
│   │   ├── common.ts          # LCPlatformError, ProviderConfig, etc.
│   │   ├── deployment.ts      # Deployment, DeploymentStatus
│   │   ├── job.ts             # Job, JobStatus, ScheduledJob
│   │   ├── secret.ts          # Secret, SecretValue
│   │   ├── configuration.ts   # Configuration, ValidationResult
│   │   ├── document.ts        # Document, Query, Collection
│   │   ├── database.ts        # Transaction, Migration, ExecuteResult
│   │   ├── object.ts          # ObjectData, ObjectMetadata
│   │   ├── queue.ts           # Message, ReceivedMessage, Queue
│   │   ├── event.ts           # Event, EventPattern, Rule
│   │   ├── notification.ts    # NotificationMessage, Topic, Protocol
│   │   └── auth.ts            # TokenSet, TokenClaims, UserInfo
│   └── index.ts               # Public API exports
│
├── providers/
│   ├── aws/                   # AWS SDK v3 implementations
│   │   ├── AwsWebHostingService.ts      (App Runner)
│   │   ├── AwsBatchService.ts            (AWS Batch)
│   │   ├── AwsSecretsService.ts          (Secrets Manager)
│   │   ├── AwsConfigurationService.ts    (AppConfig)
│   │   ├── AwsDocumentStoreService.ts    (DocumentDB)
│   │   ├── AwsDataStoreService.ts        (RDS)
│   │   ├── AwsObjectStoreService.ts      (S3)
│   │   ├── AwsQueueService.ts            (SQS)
│   │   ├── AwsEventBusService.ts         (EventBridge)
│   │   ├── AwsNotificationService.ts     (SNS)
│   │   └── AwsAuthenticationService.ts   (Cognito/OAuth2)
│   │
│   └── mock/                  # In-memory implementations (Principle VI)
│       ├── MockWebHostingService.ts
│       ├── MockBatchService.ts
│       ├── MockSecretsService.ts
│       ├── MockConfigurationService.ts
│       ├── MockDocumentStoreService.ts
│       ├── MockDataStoreService.ts
│       ├── MockObjectStoreService.ts
│       ├── MockQueueService.ts
│       ├── MockEventBusService.ts
│       ├── MockNotificationService.ts
│       └── MockAuthenticationService.ts
│
├── factory/
│   └── ProviderFactory.ts     # Factory pattern for provider selection
│
├── utils/
│   ├── retry.ts               # Exponential backoff retry logic (FR-062)
│   ├── cache.ts               # LRU cache wrapper (SC-004, SC-005)
│   └── validation.ts          # Input validation utilities
│
└── LCPlatform.ts              # Main entry point class

tests/
├── unit/                      # Unit tests (count toward 80% coverage)
│   ├── core/                  # Core type/interface tests
│   ├── providers/
│   │   └── mock/              # Mock provider tests
│   └── utils/                 # Utility function tests
│
├── integration/               # Integration tests (LocalStack, do not count toward coverage)
│   └── providers/
│       └── aws/               # AWS provider integration tests
│
└── contract/                  # Contract tests (verify provider parity)
    ├── secrets.contract.test.ts
    ├── configuration.contract.test.ts
    ├── objectstore.contract.test.ts
    ├── queue.contract.test.ts
    ├── eventbus.contract.test.ts
    ├── notification.contract.test.ts
    └── auth.contract.test.ts

documentation/                 # Documentation as code (Principle VII)
├── product-summary.md
├── product-details.md
└── technical-details.md
```

**Structure Decision**: Single TypeScript package structure (Option 1) selected. Hexagonal architecture enforces separation between core interfaces (`src/core/`) and provider implementations (`src/providers/`). Factory pattern in `src/factory/` enables runtime provider selection. Testing hierarchy supports TDD (Principle II) and coverage requirements (Principle III).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

No constitution violations detected. Complexity justification not required.

## Phase 0: Research (Completed)

✅ **research.md** - 10 technical decisions documented:
1. Provider Abstraction Pattern (Hexagonal Architecture + Factory)
2. AWS SDK v3 Modular Approach
3. Bun Runtime Testing Framework
4. Error Handling Strategy (custom error hierarchy)
5. Retry Logic Implementation (exponential backoff)
6. Connection Pooling Strategy
7. Mock Provider Implementation (in-memory with latency simulation)
8. Caching Strategy (LRU with TTL)
9. OAuth2 Authentication Library (openid-client)
10. LocalStack for Integration Testing

**Key Outcomes**:
- Hexagonal architecture selected for provider independence
- AWS SDK v3 modular packages (11 services: App Runner, Batch, Secrets Manager, AppConfig, DocumentDB, RDS, S3, SQS, EventBridge, SNS, Cognito)
- Bun test framework for native TypeScript testing
- Custom error hierarchy with provider-agnostic types
- LocalStack Community Edition for AWS integration tests
- Implementation phased over 7 weeks (Core → Mock → AWS Critical → Messaging → Compute → Auth → Contracts)

## Phase 1: Design (Completed)

✅ **data-model.md** - 11 entity types with validation rules and state transitions:
1. Deployment (WebHostingService) - 6 states
2. Job & ScheduledJob (BatchService) - 6 states
3. Secret (SecretsService) - versioning, rotation
4. Configuration (ConfigurationService) - immutable versions
5. Document & Collection (DocumentStoreService) - flexible schema
6. Transaction & Migration (DataStoreService) - 4 isolation levels
7. ObjectData & ObjectMetadata (ObjectStoreService) - streaming support
8. Message & Queue (QueueService) - FIFO & standard queues
9. Event & EventBus (EventBusService) - event pattern matching
10. NotificationMessage & Topic (NotificationService) - 5 protocols
11. TokenSet & UserInfo (AuthenticationService) - OAuth2/OIDC

✅ **contracts/all-services.ts** - TypeScript interfaces:
- 662 lines of provider-agnostic TypeScript contracts
- 11 service interfaces with 50+ methods total
- Common types: LCPlatformError, ProviderConfig, ProviderType
- Zero cloud-specific types in core interfaces (Principle I compliance)

✅ **quickstart.md** - Developer guide:
- 7 complete code examples (secrets, storage, queue, events, deployment, batch, auth)
- Mock provider usage for testing
- Error handling patterns
- Configuration best practices (workload identity vs access keys)

## Post-Design Re-evaluation

### Constitution Check - Post-Design

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Provider Independence** | ✅ VERIFIED | All interfaces in `contracts/all-services.ts` use only TypeScript primitives. No AWS/Azure types leaked. Return types are generic (Promise<void>, Promise<string>, etc.). |
| **II. Test-Driven Development** | ✅ VERIFIED | Project structure includes `tests/unit/`, `tests/integration/`, `tests/contract/`. Mock provider enables TDD workflow. Research documents Bun test framework setup. |
| **III. Code Coverage Requirements** | ✅ VERIFIED | Research specifies Bun test with `--coverage` flag. CI/CD pipeline configured to enforce 80% threshold. Unit tests separated from integration tests. |
| **IV. Code Quality & Linting** | ✅ VERIFIED | ESLint + Prettier already configured in repository root. Pre-commit hooks prevent violations. CI/CD includes linting stage. |
| **V. Workload Identity First** | ✅ VERIFIED | Quickstart.md examples demonstrate workload identity as primary auth method. Access keys explicitly documented as "local development only". |
| **VI. Mock Provider Completeness** | ✅ VERIFIED | 11 mock provider implementations planned in `src/providers/mock/`. Contract tests verify parity with AWS provider. Research documents in-memory implementation strategy. |
| **VII. Documentation as Code** | ✅ VERIFIED | Quickstart.md, research.md, data-model.md, and contracts all created. Documentation updates planned for implementation phase. |

**Final Compliance**: 7/7 principles PASS ✅

### Design Quality Assessment

**Strengths**:
- Clear separation of concerns (core/providers/factory)
- Comprehensive research with 10 documented decisions
- Well-defined data model with validation rules
- Provider-agnostic contracts enforce portability
- Mock provider enables offline development
- LocalStack integration reduces cloud costs

**Risks Addressed**:
- AWS SDK v3 API changes → Pinned major versions, changelog monitoring
- Bun runtime maturity → Extensive testing, Node.js fallback if critical bugs
- Provider parity drift → Contract tests enforce behavioral parity
- Performance goals → Early testing, caching layer for secrets/config
- LocalStack limitations → Documented differences vs real AWS

**Open Questions**: None (all technical decisions resolved)

## Planning Complete

✅ **Technical Context** - Defined (TypeScript 5.9.3, Bun 1.0+, AWS SDK v3, 80% coverage)
✅ **Constitution Check** - PASSED (7/7 principles)
✅ **Phase 0: Research** - COMPLETED (research.md with 10 decisions)
✅ **Phase 1: Design** - COMPLETED (data-model.md, contracts/, quickstart.md)
✅ **Post-Design Re-evaluation** - VERIFIED (7/7 principles)

**Next Step**: Run `/speckit.tasks` to generate dependency-ordered implementation tasks from this plan.

**Estimated Implementation Effort**: 7-8 weeks (based on phased approach in research.md)

**Implementation Sequence** (from research.md):
1. Week 1: Core Foundation (interfaces, types, factory, LCPlatform class)
2. Week 2: Mock Provider (all 11 services, unit tests, 80% coverage baseline)
3. Weeks 3-4: AWS Critical Services (Secrets, Configuration, ObjectStore, DataStore)
4. Week 5: AWS Messaging (Queue, EventBus, Notification)
5. Week 6: AWS Compute (WebHosting, Batch)
6. Week 7: Authentication (OAuth2/OIDC integration)
7. Week 8: Contract Tests & Documentation finalization

