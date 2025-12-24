/**
 * Unit tests for Dependency Validator
 *
 * Following TDD: These tests are written FIRST and should FAIL before implementation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  DependencyType,
  EncryptionType,
  DependencyStatus,
} from '../../../src/core/types/dependency';
import type {
  ApplicationDependency,
  DependencyConfiguration,
} from '../../../src/core/types/dependency';
import type { DependencyValidator } from '../../../src/utils/dependencyValidator';

describe.skip('DependencyValidator', () => {
  let validator: DependencyValidator;

  beforeEach(async () => {
    const { DependencyValidator: ValidatorClass } = await import(
      '../../../src/utils/dependencyValidator'
    );
    validator = new ValidatorClass();
  });

  describe('T071: schema validation - valid configs', () => {
    test('should validate valid object store configuration', () => {
      const config = {
        type: 'object-store' as const,
        versioning: true,
        encryption: EncryptionType.KMS,
        publicAccess: false,
      };

      const result = validator.validateConfiguration(DependencyType.OBJECT_STORE, config);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    test('should validate valid queue configuration', () => {
      const config = {
        type: 'queue' as const,
        fifo: true,
        visibilityTimeout: 30,
        messageRetention: 3600,
        encryption: true,
      };

      const result = validator.validateConfiguration(DependencyType.QUEUE, config);
      expect(result.valid).toBe(true);
    });

    test('should validate valid secrets configuration', () => {
      const config = {
        type: 'secrets' as const,
        secretName: 'test-secret',
        description: 'Test secret',
      };

      const result = validator.validateConfiguration(DependencyType.SECRETS, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('T072: schema validation - invalid configs', () => {
    test('should reject object store config with wrong type', () => {
      const config = {
        type: 'wrong-type',
        versioning: true,
        encryption: EncryptionType.KMS,
        publicAccess: false,
      };

      const result = validator.validateConfiguration(
        DependencyType.OBJECT_STORE,
        config as unknown as DependencyConfiguration
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should reject queue config with invalid timeout', () => {
      const config = {
        type: 'queue' as const,
        fifo: true,
        visibilityTimeout: -1, // Invalid
        messageRetention: 3600,
        encryption: true,
      };

      const result = validator.validateConfiguration(DependencyType.QUEUE, config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject config with extra unknown fields', () => {
      const config = {
        type: 'secrets',
        secretName: 'test-secret',
        unknownField: 'should not be here',
      };

      const result = validator.validateConfiguration(
        DependencyType.SECRETS,
        config as unknown as DependencyConfiguration
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('T073: missing required fields detection', () => {
    test('should reject object store config missing required fields', () => {
      const config = {
        type: 'object-store',
        // Missing: versioning, encryption, publicAccess
      };

      const result = validator.validateConfiguration(
        DependencyType.OBJECT_STORE,
        config as unknown as DependencyConfiguration
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.message.includes('required'))).toBe(true);
    });

    test('should reject queue config missing required fields', () => {
      const config = {
        type: 'queue',
        // Missing: fifo, visibilityTimeout, messageRetention, encryption
      };

      const result = validator.validateConfiguration(
        DependencyType.QUEUE,
        config as unknown as DependencyConfiguration
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('T074: name collision detection', () => {
    test('should detect duplicate dependency names', () => {
      const dependencies: ApplicationDependency[] = [
        {
          id: 'dep-1',
          name: 'uploads',
          type: DependencyType.OBJECT_STORE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'object-store',
            versioning: true,
            encryption: EncryptionType.KMS,
            publicAccess: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dep-2',
          name: 'uploads', // Duplicate!
          type: DependencyType.QUEUE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'queue',
            fifo: false,
            visibilityTimeout: 30,
            messageRetention: 3600,
            encryption: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = validator.checkNameCollisions(dependencies);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).not.toBeUndefined();
      if (result.errors !== undefined && result.errors.length > 0) {
        expect(result.errors[0]?.message).toContain('uploads');
        expect(result.errors[0]?.message).toContain('duplicate');
      }
    });

    test('should pass when all names are unique', () => {
      const dependencies: ApplicationDependency[] = [
        {
          id: 'dep-1',
          name: 'uploads',
          type: DependencyType.OBJECT_STORE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'object-store',
            versioning: true,
            encryption: EncryptionType.KMS,
            publicAccess: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dep-2',
          name: 'tasks',
          type: DependencyType.QUEUE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'queue',
            fifo: false,
            visibilityTimeout: 30,
            messageRetention: 3600,
            encryption: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = validator.checkNameCollisions(dependencies);
      expect(result.valid).toBe(true);
    });
  });

  describe('T075: cross-field validation', () => {
    test('should validate deadLetterQueue requires maxReceiveCount', () => {
      const config = {
        type: 'queue' as const,
        fifo: false,
        visibilityTimeout: 30,
        messageRetention: 3600,
        encryption: true,
        deadLetterQueue: 'dlq-name', // Has DLQ
        // Missing: maxReceiveCount
      };

      const result = validator.validateConfiguration(DependencyType.QUEUE, config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.message.includes('maxReceiveCount'))).toBe(true);
    });

    test('should validate deadLetterQueue with maxReceiveCount', () => {
      const config = {
        type: 'queue' as const,
        fifo: false,
        visibilityTimeout: 30,
        messageRetention: 3600,
        encryption: true,
        deadLetterQueue: 'dlq-name',
        maxReceiveCount: 3, // Properly specified
      };

      const result = validator.validateConfiguration(DependencyType.QUEUE, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDependency', () => {
    test('should validate complete dependency object', () => {
      const dependency: ApplicationDependency = {
        id: 'dep-1',
        name: 'uploads',
        type: DependencyType.OBJECT_STORE,
        status: DependencyStatus.PENDING,
        configuration: {
          type: 'object-store',
          versioning: true,
          encryption: EncryptionType.KMS,
          publicAccess: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateDependency(dependency);
      expect(result.valid).toBe(true);
    });

    test('should reject dependency with invalid configuration', () => {
      const dependency: ApplicationDependency = {
        id: 'dep-1',
        name: 'uploads',
        type: DependencyType.OBJECT_STORE,
        status: DependencyStatus.PENDING,
        configuration: {
          type: 'object-store',
          // Missing required fields
        } as unknown as DependencyConfiguration,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateDependency(dependency);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateApplication', () => {
    test('should validate application with multiple dependencies', () => {
      const dependencies: ApplicationDependency[] = [
        {
          id: 'dep-1',
          name: 'uploads',
          type: DependencyType.OBJECT_STORE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'object-store',
            versioning: true,
            encryption: EncryptionType.KMS,
            publicAccess: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dep-2',
          name: 'tasks',
          type: DependencyType.QUEUE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'queue',
            fifo: false,
            visibilityTimeout: 30,
            messageRetention: 3600,
            encryption: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = validator.validateApplication(dependencies);
      expect(result.valid).toBe(true);
      expect(result.validatedCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    test('should report summary with mixed valid/invalid dependencies', () => {
      const dependencies: ApplicationDependency[] = [
        {
          id: 'dep-1',
          name: 'uploads',
          type: DependencyType.OBJECT_STORE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'object-store',
            versioning: true,
            encryption: EncryptionType.KMS,
            publicAccess: false,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'dep-2',
          name: 'bad-queue',
          type: DependencyType.QUEUE,
          status: DependencyStatus.PENDING,
          configuration: {
            type: 'queue',
            // Missing required fields
          } as unknown as DependencyConfiguration,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = validator.validateApplication(dependencies);
      expect(result.valid).toBe(false);
      expect(result.validatedCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toBeDefined();
    });
  });
});
