<!--
SYNC IMPACT REPORT
==================
Version Change: [none] → 1.0.0
Reason: Initial constitution ratification

Modified Principles: N/A (initial version)
Added Sections:
  - Core Principles (7 principles)
  - Quality Standards
  - Development Workflow
  - Governance

Removed Sections: N/A

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md - Constitution Check section aligns with principles
  ✅ .specify/templates/spec-template.md - Requirements section aligns with FR/SC patterns
  ✅ .specify/templates/tasks-template.md - Task organization supports TDD and parallel execution
  ✅ README.md - Already documents TDD, coverage, linting, CI/CD requirements
  ✅ AGENTS.md - Already documents all quality standards and workflow requirements

Follow-up TODOs: None
-->

# lc-platform-dev-accelerators Constitution

## Core Principles

### I. Provider Independence (NON-NEGOTIABLE)

All service interfaces MUST be designed without cloud-specific concepts. No AWS, Azure, or GCP types may leak into core interface definitions. Applications depend on abstractions, never on concrete cloud SDK implementations.

**Rationale**: Enables seamless cloud provider switching through configuration alone, preventing vendor lock-in and maintaining architectural flexibility across AWS, Azure, and future GCP support.

**Enforcement**:
- Interface definitions in `src/core/` MUST NOT import cloud provider SDKs
- Return types MUST use generic TypeScript types, never cloud-specific classes
- Code reviews MUST verify abstraction layer integrity
- Example violation: `Promise<S3.PutObjectOutput>` instead of `Promise<void>`

### II. Test-Driven Development (NON-NEGOTIABLE)

TDD is mandatory for all features. Tests MUST be written before implementation, approved by stakeholders, and verified to fail before code is written. The Red-Green-Refactor cycle is strictly enforced.

**Rationale**: Ensures interface correctness, stability, and prevents regressions in provider abstraction layer. Critical for multi-cloud support where behavior must be identical across providers.

**Enforcement**:
- Pull requests without tests will be rejected
- Tests MUST fail initially (Red phase documented in PR)
- Implementation proceeds only after failing tests exist (Green phase)
- Refactoring preserves passing tests (Refactor phase)
- Code reviews verify TDD cycle was followed

### III. Code Coverage Requirements (NON-NEGOTIABLE)

Minimum 80% code coverage MUST be maintained for all public interfaces. Coverage is measured on unit tests only; integration tests do not count toward metrics. Coverage reports are generated on every test run.

**Rationale**: High coverage ensures reliability of cloud abstractions and provides confidence when adding new providers. Public interfaces are contracts with consumers and require comprehensive testing.

**Enforcement**:
- CI/CD pipeline enforces 80% threshold (build fails below)
- Coverage measured by Bun's built-in coverage tooling (`bun test --coverage`)
- Unit tests in `tests/unit/`, integration tests in `tests/integration/`
- Pull requests must maintain or improve coverage percentage
- Dashboard displays coverage trends per module

### IV. Code Quality & Linting Standards (NON-NEGOTIABLE)

Linting runs during local test phase for all changes. Critical and High severity linting errors MUST be corrected immediately. No commits are allowed with critical/high linting violations.

**Rationale**: Maintains consistent code quality across TypeScript implementation, prevents common errors, and ensures readability for contributors across multiple cloud provider implementations.

**Enforcement**:
- ESLint configured with TypeScript-specific rules in `.eslintrc.js`
- Prettier for code formatting (enforced via pre-commit hooks)
- `bun run lint` fails on critical/high severity violations
- CI/CD pipeline runs linting checks before tests
- Pre-commit hooks prevent commits with violations

### V. Workload Identity First

Prefer IAM roles (AWS) and managed identities (Azure) over access keys for authentication. Access keys should only be used for local development with mock provider.

**Rationale**: Security best practice that reduces credential exposure risk and simplifies credential rotation. Aligns with cloud-native security patterns.

**Enforcement**:
- Provider implementations default to workload identity
- Access key configuration requires explicit opt-in
- Documentation emphasizes workload identity in examples
- Security reviews verify credential handling patterns

### VI. Mock Provider Completeness

Every interface method MUST work with the mock provider. Mock provider enables local development and fast CI/CD without cloud credentials or costs.

**Rationale**: Enables rapid iteration, reduces cloud costs during development, and provides offline development capability. Essential for contributor onboarding and testing.

**Enforcement**:
- Mock provider implementation required for each core interface
- All tests MUST pass with `provider: 'mock'`
- Mock provider in `src/providers/mock/` mirrors AWS/Azure behavior
- Documentation includes mock provider examples
- LocalStack/Azurite used for integration testing only

### VII. Documentation as Code

The `documentation/` directory contains three files (product-summary.md, product-details.md, technical-details.md) that MUST be kept updated as architecture or code design changes. Documentation updates are part of the definition of done for any feature.

**Rationale**: Ensures context for AI agents, facilitates onboarding for new developers and stakeholders, maintains accurate reference material as multi-cloud support evolves.

**Enforcement**:
- Documentation updates required in same PR as code changes
- Pull request checklist includes documentation verification
- Breaking changes MUST be documented in all three files
- Code reviews verify documentation accuracy
- Examples must reflect actual code implementation

## Quality Standards

### Testing Hierarchy

1. **Unit Tests** (count toward coverage):
   - Test individual functions/classes in isolation
   - Use mock provider for cloud services
   - Fast execution (<100ms per test)
   - Location: `tests/unit/`

2. **Integration Tests** (do not count toward coverage):
   - Test provider implementations with LocalStack/Azurite
   - Verify cloud service interaction patterns
   - Slower execution (seconds per test)
   - Location: `tests/integration/`

3. **Contract Tests**:
   - Verify interface contracts across providers
   - Ensure AWS, Azure, Mock behave identically
   - Critical for multi-cloud abstraction
   - Location: `tests/contract/`

### Versioning & Breaking Changes

Follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to public interfaces (incompatible API changes)
- **MINOR**: New features added (backward compatible)
- **PATCH**: Bug fixes and internal improvements (backward compatible)

Breaking changes require:
- Deprecation notice in prior MINOR version (when possible)
- Migration guide in documentation
- Update to all three documentation files
- Version bump announcement in release notes

## Development Workflow

### Branch Strategy

Standard Git Flow:
- `main` - Production-ready code, published to GitHub Packages
- `develop` - Integration branch for feature merging
- `feature/*` - Feature development branches
- `hotfix/*` - Emergency production fixes

### Commit Standards

Follow Conventional Commits specification:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/modifications
- `refactor:` - Code refactoring without behavior change
- `chore:` - Build process, dependency updates

### Pull Request Requirements

1. All tests pass (unit + integration + contract)
2. Code coverage ≥ 80% maintained
3. Linting passes with zero critical/high violations
4. Prettier formatting applied
5. Documentation updated (if applicable)
6. Conventional commit messages used
7. Code review approval from maintainer
8. All review comments addressed

### CI/CD Pipeline (GitHub Actions)

**Build Stage**:
- Compile TypeScript (`tsc --noEmit`)
- Build distributable package
- Validate package.json dependencies

**Test Stage**:
- Run unit tests with coverage
- Enforce 80% coverage threshold
- Run linting (ESLint)
- Run formatter check (Prettier)
- Run integration tests (LocalStack/Azurite)

**Package Stage** (main branch only):
- Build package using Bun
- Publish to GitHub Packages (npm-compatible registry)
- Tag release with semantic version
- Generate release notes

## Governance

### Constitution Supremacy

This constitution supersedes all other development practices and guidelines. When conflicts arise between this document and other project documentation, this constitution takes precedence.

### Amendment Procedure

Constitution amendments require:

1. **Proposal**: Document proposed change with rationale
2. **Discussion**: Review with maintainers and stakeholders
3. **Approval**: Consensus from project maintainers
4. **Documentation**: Update constitution with version bump
5. **Propagation**: Update affected templates and documentation
6. **Migration**: Provide migration plan if existing code affected

### Version Increments

- **MAJOR**: Backward incompatible principle removal or redefinition
- **MINOR**: New principle added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes

### Compliance Verification

All pull requests and code reviews MUST verify compliance with:
- Provider Independence (Principle I)
- TDD Requirements (Principle II)
- Coverage Thresholds (Principle III)
- Linting Standards (Principle IV)
- Documentation Updates (Principle VII)

Violations must be justified in PR description or rejected.

### Complexity Justification

Architectural complexity must be justified when introducing:
- New abstraction layers beyond core/providers pattern
- Additional provider implementations
- New service interfaces
- Cross-cutting concerns (retry logic, circuit breakers)

Justification format:
| Complexity Added | Why Needed | Simpler Alternative Rejected Because |
|------------------|------------|-------------------------------------|
| [Description] | [Rationale] | [Why simpler approach insufficient] |

### Reference Documentation

For runtime development guidance, consult:
- **AGENTS.md** - AI assistant and contributor development guidelines
- **README.md** - Project overview, setup, contributing process
- **documentation/technical-details.md** - Architecture implementation details
- **documentation/product-details.md** - API reference and specifications

**Version**: 1.0.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2025-01-20
