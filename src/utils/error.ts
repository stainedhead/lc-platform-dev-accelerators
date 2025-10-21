/**
 * Error utility functions for type-safe error handling
 */

/**
 * Type guard to check if an error has a name property
 */
export function isErrorWithName(error: unknown): error is { name: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as { name: unknown }).name === 'string'
  );
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Get error name from unknown error
 */
export function getErrorName(error: unknown): string | undefined {
  if (isErrorWithName(error)) {
    return error.name;
  }
  return undefined;
}
