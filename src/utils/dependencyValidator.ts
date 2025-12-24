/**
 * Dependency Validator
 *
 * Validates dependency configurations against JSON schemas and business rules
 */

import { SchemaValidator } from './schemaValidator';
import type {
  ApplicationDependency,
  DependencyConfiguration,
  DependencyError,
} from '../core/types/dependency';
import { DependencyType, DependencyErrorCode } from '../core/types/dependency';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: DependencyError[];
  validatedCount?: number;
  errorCount?: number;
}

/**
 * Dependency validator class
 */
export class DependencyValidator {
  private readonly schemaValidator: SchemaValidator;

  constructor() {
    this.schemaValidator = new SchemaValidator();
    this.registerSchemas();
  }

  /**
   * Register JSON schemas for all dependency types
   */
  private registerSchemas(): void {
    // Object Store schema
    this.schemaValidator.registerSchema('object-store', {
      type: 'object',
      required: ['type', 'versioning', 'encryption', 'publicAccess'],
      properties: {
        type: { const: 'object-store' },
        bucketName: { type: 'string' },
        versioning: { type: 'boolean' },
        encryption: { type: 'string', enum: ['none', 'aes256', 'kms'] },
        publicAccess: { type: 'boolean' },
        lifecycleRules: { type: 'array' },
      },
      additionalProperties: false,
    });

    // Queue schema
    this.schemaValidator.registerSchema('queue', {
      type: 'object',
      required: ['type', 'fifo', 'visibilityTimeout', 'messageRetention', 'encryption'],
      properties: {
        type: { const: 'queue' },
        queueName: { type: 'string' },
        fifo: { type: 'boolean' },
        visibilityTimeout: { type: 'integer', minimum: 0, maximum: 43200 },
        messageRetention: { type: 'integer', minimum: 60, maximum: 1209600 },
        encryption: { type: 'boolean' },
        deadLetterQueue: { type: 'string' },
        maxReceiveCount: { type: 'integer', minimum: 1, maximum: 1000 },
      },
      additionalProperties: false,
    });

    // Secrets schema
    this.schemaValidator.registerSchema('secrets', {
      type: 'object',
      required: ['type', 'encryption'],
      properties: {
        type: { const: 'secrets' },
        secretName: { type: 'string' },
        encryption: { type: 'boolean' },
        rotationEnabled: { type: 'boolean' },
        rotationDays: { type: 'integer', minimum: 1, maximum: 365 },
      },
      additionalProperties: false,
    });

    // Cache schema
    this.schemaValidator.registerSchema('cache', {
      type: 'object',
      required: ['type', 'engine', 'nodeType'],
      properties: {
        type: { const: 'cache' },
        clusterId: { type: 'string' },
        engine: { type: 'string', enum: ['redis', 'memcached'] },
        engineVersion: { type: 'string' },
        nodeType: { type: 'string' },
        numCacheNodes: { type: 'integer', minimum: 1 },
        port: { type: 'integer', minimum: 1, maximum: 65535 },
      },
      additionalProperties: false,
    });
  }

  /**
   * Validate a dependency configuration against its schema
   *
   * @param type - Dependency type
   * @param configuration - Configuration to validate
   * @returns Validation result
   */
  validateConfiguration(
    type: DependencyType,
    configuration: DependencyConfiguration
  ): ValidationResult {
    // Get schema ID from dependency type
    const schemaId = this.getSchemaId(type);
    if (schemaId === undefined) {
      return {
        valid: false,
        errors: [
          {
            code: DependencyErrorCode.VALIDATION_FAILED,
            message: `No schema registered for dependency type: ${type}`,
            details: { type },
          },
        ],
      };
    }

    // Validate against schema
    const schemaResult = this.schemaValidator.validate(schemaId, configuration);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    // Perform cross-field validation
    const crossFieldErrors = this.validateCrossFields(type, configuration);
    if (crossFieldErrors.length > 0) {
      return {
        valid: false,
        errors: crossFieldErrors,
      };
    }

    return { valid: true };
  }

  /**
   * Validate cross-field dependencies
   *
   * @param type - Dependency type
   * @param configuration - Configuration to validate
   * @returns Array of errors
   */
  private validateCrossFields(
    type: DependencyType,
    configuration: DependencyConfiguration
  ): DependencyError[] {
    const errors: DependencyError[] = [];

    // Queue-specific validations
    if (type === DependencyType.QUEUE && configuration.type === 'queue') {
      const queueConfig = configuration;
      if (
        queueConfig.deadLetterQueue !== undefined &&
        queueConfig.deadLetterQueue.length > 0 &&
        queueConfig.maxReceiveCount === undefined
      ) {
        errors.push({
          code: DependencyErrorCode.INVALID_CONFIGURATION,
          message: 'deadLetterQueue requires maxReceiveCount to be specified',
          details: { field: 'maxReceiveCount' },
        });
      }
    }

    return errors;
  }

  /**
   * Get schema ID for dependency type
   *
   * @param type - Dependency type
   * @returns Schema ID
   */
  private getSchemaId(type: DependencyType): string | undefined {
    const schemaMap: Record<string, string> = {
      [DependencyType.OBJECT_STORE]: 'object-store',
      [DependencyType.QUEUE]: 'queue',
      [DependencyType.SECRETS]: 'secrets',
      [DependencyType.CACHE]: 'cache',
    };

    return schemaMap[type];
  }

  /**
   * Validate a complete dependency object
   *
   * @param dependency - Dependency to validate
   * @returns Validation result
   */
  validateDependency(dependency: ApplicationDependency): ValidationResult {
    return this.validateConfiguration(dependency.type, dependency.configuration);
  }

  /**
   * Check for duplicate dependency names
   *
   * @param dependencies - Array of dependencies
   * @returns Validation result
   */
  checkNameCollisions(dependencies: ApplicationDependency[]): ValidationResult {
    const names = new Set<string>();
    const duplicates: string[] = [];

    for (const dep of dependencies) {
      if (names.has(dep.name)) {
        duplicates.push(dep.name);
      }
      names.add(dep.name);
    }

    if (duplicates.length > 0) {
      return {
        valid: false,
        errors: duplicates.map((name) => ({
          code: DependencyErrorCode.DUPLICATE_NAME,
          message: `Duplicate dependency name: ${name}`,
          details: { name },
        })),
      };
    }

    return { valid: true };
  }

  /**
   * Check for duplicate generated resource names
   *
   * @param dependencies - Array of dependencies
   * @returns Validation result
   */
  checkResourceCollisions(dependencies: ApplicationDependency[]): ValidationResult {
    const resourceNames = new Set<string>();
    const duplicates: string[] = [];

    for (const dep of dependencies) {
      if (dep.generatedName !== undefined && dep.generatedName.length > 0) {
        if (resourceNames.has(dep.generatedName)) {
          duplicates.push(dep.generatedName);
        }
        resourceNames.add(dep.generatedName);
      }
    }

    if (duplicates.length > 0) {
      return {
        valid: false,
        errors: duplicates.map((name) => ({
          code: DependencyErrorCode.DUPLICATE_RESOURCE_NAME,
          message: `Duplicate generated resource name: ${name}`,
          details: { generatedName: name },
        })),
      };
    }

    return { valid: true };
  }

  /**
   * Validate all dependencies in an application
   *
   * @param dependencies - Array of dependencies to validate
   * @returns Validation summary
   */
  validateApplication(dependencies: ApplicationDependency[]): ValidationResult {
    const errors: DependencyError[] = [];
    let validatedCount = 0;
    let errorCount = 0;

    // Check for name collisions
    const nameCheck = this.checkNameCollisions(dependencies);
    if (!nameCheck.valid && nameCheck.errors !== undefined) {
      errors.push(...nameCheck.errors);
      errorCount += nameCheck.errors.length;
    }

    // Check for resource collisions
    const resourceCheck = this.checkResourceCollisions(dependencies);
    if (!resourceCheck.valid && resourceCheck.errors !== undefined) {
      errors.push(...resourceCheck.errors);
      errorCount += resourceCheck.errors.length;
    }

    // Validate each dependency
    for (const dep of dependencies) {
      const result = this.validateDependency(dep);
      if (result.valid) {
        validatedCount++;
      } else {
        errorCount++;
        if (result.errors !== undefined) {
          errors.push(...result.errors);
        }
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      validatedCount,
      errorCount,
    };

    if (errors.length > 0) {
      return { ...result, errors };
    }

    return result;
  }
}
