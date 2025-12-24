/**
 * Unit tests for Dependency types
 */

import { describe, test, expect } from 'bun:test';
import { DependencyType, DependencyStatus } from '../../../../src/core/types/dependency';

describe('DependencyType enum', () => {
  test('should have all expected dependency types', () => {
    expect(DependencyType.OBJECT_STORE).toBe('object-store' as DependencyType);
    expect(DependencyType.QUEUE).toBe('queue' as DependencyType);
    expect(DependencyType.SECRETS).toBe('secrets' as DependencyType);
    expect(DependencyType.DATA_STORE).toBe('data-store' as DependencyType);
  });
});

describe('DependencyStatus enum', () => {
  test('should have all expected statuses', () => {
    expect(DependencyStatus.PENDING).toBe('pending' as DependencyStatus);
    expect(DependencyStatus.VALIDATED).toBe('validated' as DependencyStatus);
    expect(DependencyStatus.DEPLOYED).toBe('deployed' as DependencyStatus);
    expect(DependencyStatus.FAILED).toBe('failed' as DependencyStatus);
  });
});

describe.skip('ApplicationDependency class', () => {
  test('should create dependency with valid data', () => {
    // Will be implemented after ApplicationDependency exists
  });

  test('should validate required fields', () => {
    // Will test missing fields validation
  });
});

describe.skip('DependencyConfiguration validation', () => {
  test('should validate ObjectStoreConfiguration', () => {
    // Will test ObjectStore config validation
  });

  test('should validate QueueConfiguration', () => {
    // Will test Queue config validation
  });
});
