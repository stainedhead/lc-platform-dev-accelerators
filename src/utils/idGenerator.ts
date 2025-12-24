/**
 * ID Generator Utility
 *
 * Generates unique identifiers for applications and dependencies.
 */

/**
 * Generate a unique application ID
 * Format: app-{8 hex chars}
 */
export function generateAppId(): string {
  const randomHex = Math.random().toString(16).substring(2, 10);
  return `app-${randomHex}`;
}

/**
 * Generate a unique dependency ID
 * Format: dep-{8 hex chars}
 */
export function generateDependencyId(): string {
  const randomHex = Math.random().toString(16).substring(2, 10);
  return `dep-${randomHex}`;
}
