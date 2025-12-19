/**
 * AuthClient Interface - Data Plane
 *
 * Runtime interface for authentication operations in hosted applications.
 * Provides token validation and user info retrieval capabilities.
 *
 * Constitution Principle I: Provider Independence
 */

import type { TokenClaims, UserInfo } from '../types/auth';

export interface AuthClient {
  /**
   * Validate an access token and extract claims
   * @param token - Access token (JWT)
   * @returns Token claims if valid
   * @throws AuthenticationError if token is invalid
   */
  validateToken(token: string): Promise<TokenClaims>;

  /**
   * Get user information from a token
   * @param token - Access token
   * @returns User information
   */
  getUserInfo(token: string): Promise<UserInfo>;

  /**
   * Check if a token has a specific scope
   * @param token - Access token
   * @param scope - Scope to check
   * @returns True if token has the scope
   */
  hasScope(token: string, scope: string): Promise<boolean>;

  /**
   * Check if a token has a specific role
   * @param token - Access token
   * @param role - Role to check
   * @returns True if token has the role
   */
  hasRole(token: string, role: string): Promise<boolean>;
}
