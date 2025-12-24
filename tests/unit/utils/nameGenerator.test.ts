/**
 * Unit tests for Name Generator
 */

import { describe, test, expect } from 'bun:test';
import {
  generateResourceName,
  generateDependencyResourceName,
} from '../../../src/utils/nameGenerator';
import { DependencyType } from '../../../src/core/types/dependency';

describe('generateResourceName', () => {
  test('should generate name with pattern lcp-account-team-moniker', () => {
    const name = generateResourceName('123456', 'platform', 'myapp');
    expect(name).toBe('lcp-123456-platform-myapp');
  });

  test('should include service type when provided', () => {
    const name = generateResourceName('123456', 'platform', 'myapp', 'storage');
    expect(name).toBe('lcp-123456-platform-myapp-storage');
  });

  test('should convert to lowercase', () => {
    const name = generateResourceName('ABC', 'Team', 'MyApp');
    expect(name).toBe('lcp-abc-team-myapp');
  });
});

describe('generateDependencyResourceName', () => {
  test('should generate unique name for object store', () => {
    const name = generateDependencyResourceName(
      '123456',
      'platform',
      'myapp',
      DependencyType.OBJECT_STORE,
      'uploads'
    );
    expect(name).toMatch(/^lcp-123456-platform-myapp-store-uploads$/);
  });

  test('should generate unique name for queue', () => {
    const name = generateDependencyResourceName(
      '123456',
      'platform',
      'myapp',
      DependencyType.QUEUE,
      'tasks'
    );
    expect(name).toMatch(/^lcp-123456-platform-myapp-queue-tasks$/);
  });
});
