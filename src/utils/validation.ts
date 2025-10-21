/**
 * Input Validation Utilities
 *
 * Provides common validation functions for user inputs, configurations, and parameters.
 * Helps prevent validation errors early in the request pipeline.
 */

import { ValidationError } from '../core/types/common';

/**
 * Validate that a value is not null or undefined
 */
export function required<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validate string is not empty
 */
export function notEmpty(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must be a non-empty string`);
  }
  return value;
}

/**
 * Validate string matches a pattern
 */
export function matchesPattern(
  value: string,
  pattern: RegExp,
  fieldName: string
): string {
  if (!pattern.test(value)) {
    throw new ValidationError(
      `${fieldName} must match pattern ${pattern.toString()}`,
      { value, pattern: pattern.toString() }
    );
  }
  return value;
}

/**
 * Validate number is within range
 */
export function inRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { value, min, max }
    );
  }
  return value;
}

/**
 * Validate value is in allowed list
 */
export function oneOf<T>(value: T, allowed: T[], fieldName: string): T {
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowed.join(', ')}`,
      { value, allowed }
    );
  }
  return value;
}

/**
 * Validate object has required keys
 */
export function hasKeys<T extends Record<string, unknown>>(
  obj: T,
  requiredKeys: (keyof T)[],
  objectName: string
): T {
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new ValidationError(
        `${objectName} must have key: ${String(key)}`,
        { missingKey: key, requiredKeys }
      );
    }
  }
  return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate cron expression (basic validation)
 */
export function isValidCron(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  // Standard cron: 5 or 6 fields (seconds optional)
  return parts.length === 5 || parts.length === 6;
}

/**
 * Sanitize string for security (remove potentially dangerous characters)
 */
export function sanitizeString(value: string): string {
  // Remove null bytes and control characters
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Validate JSON string
 */
export function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and parse JSON string
 */
export function parseJson<T = unknown>(value: string, fieldName: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new ValidationError(`${fieldName} must be valid JSON`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Validate maximum string length
 */
export function maxLength(value: string, max: number, fieldName: string): string {
  if (value.length > max) {
    throw new ValidationError(
      `${fieldName} must be at most ${max} characters`,
      { length: value.length, maxLength: max }
    );
  }
  return value;
}

/**
 * Validate minimum string length
 */
export function minLength(value: string, min: number, fieldName: string): string {
  if (value.length < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min} characters`,
      { length: value.length, minLength: min }
    );
  }
  return value;
}
