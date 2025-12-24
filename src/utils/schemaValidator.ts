/**
 * JSON Schema Validator Utility
 *
 * Wraps Ajv for configuration validation against JSON schemas.
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import type { DependencyError } from '../core/types/dependency';
import { DependencyErrorCode } from '../core/types/dependency';

/**
 * Schema validator for dependency configurations
 */
export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    this.validators = new Map();
  }

  /**
   * Register a schema for validation
   *
   * @param schemaId - Unique identifier for the schema
   * @param schema - JSON Schema object
   */
  registerSchema(schemaId: string, schema: object): void {
    const validate = this.ajv.compile(schema);
    this.validators.set(schemaId, validate);
  }

  /**
   * Validate data against a registered schema
   *
   * @param schemaId - Schema identifier
   * @param data - Data to validate
   * @returns Validation result with errors if any
   */
  validate(schemaId: string, data: unknown): { valid: boolean; errors?: DependencyError[] } {
    const validate = this.validators.get(schemaId);

    if (validate === undefined) {
      return {
        valid: false,
        errors: [
          {
            code: DependencyErrorCode.VALIDATION_FAILED,
            message: `Schema not found: ${schemaId}`,
            details: { schemaId },
          },
        ],
      };
    }

    const valid = validate(data);

    if (valid) {
      return { valid: true };
    }

    const errors = this.formatErrors(validate.errors ?? []);
    return { valid: false, errors };
  }

  /**
   * Format Ajv errors to DependencyError format
   */
  private formatErrors(ajvErrors: ErrorObject[]): DependencyError[] {
    return ajvErrors.map((error) => ({
      code: DependencyErrorCode.INVALID_CONFIGURATION,
      message: `${error.instancePath} ${error.message}`,
      details: {
        keyword: error.keyword,
        params: error.params,
        dataPath: error.instancePath,
      },
    }));
  }
}
