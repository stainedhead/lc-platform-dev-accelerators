# Service Contracts

This directory contains TypeScript interface definitions for all 11 cloud-agnostic services.

## Contract Files

1. **web-hosting.ts** - Web Hosting Service (FR-001 to FR-005)
2. **batch.ts** - Batch Processing Service (FR-006 to FR-010)
3. **secrets.ts** - Secrets Management Service (FR-011 to FR-015)
4. **configuration.ts** - Configuration Service (FR-016 to FR-020)
5. **document-store.ts** - Document Store Service (FR-021 to FR-025)
6. **data-store.ts** - Relational Database Service (FR-026 to FR-030)
7. **object-store.ts** - Object Storage Service (FR-031 to FR-036)
8. **queue.ts** - Queue Service (FR-037 to FR-042)
9. **event-bus.ts** - Event Bus Service (FR-043 to FR-047)
10. **notification.ts** - Notification Service (FR-048 to FR-052)
11. **authentication.ts** - Authentication Service (FR-053 to FR-058)

## Provider-Agnostic Guarantee

All contracts use only:
- TypeScript primitive types (string, number, boolean, Date)
- Generic TypeScript types (Record, Promise, Array)
- Custom types defined in this contracts directory

**No cloud provider SDK types are allowed** (AWS SDK, Azure SDK, etc.) per Constitution Principle I.

## Usage in Implementation

These contracts will be implemented by:
- `src/core/` - Abstract interfaces (ports)
- `src/providers/aws/` - AWS adapter implementations
- `src/providers/mock/` - Mock provider implementations
- `src/providers/azure/` - Azure adapter implementations (future)

## Contract Testing

Contract tests in `tests/contract/` verify that all provider implementations (AWS, Mock, Azure) exhibit identical behavior for the same inputs.
