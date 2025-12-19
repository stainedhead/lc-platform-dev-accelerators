/**
 * Mock AuthClient Implementation
 *
 * In-memory auth client for testing without cloud resources.
 * Simulates token validation and user info operations.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { AuthClient } from '../../../core/clients/AuthClient';
import type { TokenClaims, UserInfo } from '../../../core/types/auth';
import { AuthenticationError, ValidationError } from '../../../core/types/common';

interface StoredToken {
  claims: TokenClaims;
  userInfo: UserInfo;
  scopes: string[];
  roles: string[];
  valid: boolean;
}

export class MockAuthClient implements AuthClient {
  private tokens = new Map<string, StoredToken>();

  /**
   * Reset all mock data
   */
  reset(): void {
    this.tokens.clear();
  }

  /**
   * Register a token for testing
   */
  registerToken(
    token: string,
    claims: TokenClaims,
    userInfo: UserInfo,
    options?: { scopes?: string[]; roles?: string[]; valid?: boolean }
  ): void {
    this.tokens.set(token, {
      claims,
      userInfo,
      scopes: options?.scopes ?? [],
      roles: options?.roles ?? [],
      valid: options?.valid ?? true,
    });
  }

  /**
   * Register an invalid token for testing error scenarios
   */
  registerInvalidToken(token: string): void {
    this.tokens.set(token, {
      claims: {} as TokenClaims,
      userInfo: {} as UserInfo,
      scopes: [],
      roles: [],
      valid: false,
    });
  }

  async validateToken(token: string): Promise<TokenClaims> {
    if (!token) {
      throw new ValidationError('Token is required');
    }

    const storedToken = this.tokens.get(token);
    if (!storedToken) {
      throw new AuthenticationError('Token not found or invalid');
    }

    if (!storedToken.valid) {
      throw new AuthenticationError('Token is invalid or expired');
    }

    // Check expiration
    if (storedToken.claims.exp && storedToken.claims.exp < Date.now() / 1000) {
      throw new AuthenticationError('Token has expired');
    }

    return { ...storedToken.claims };
  }

  async getUserInfo(token: string): Promise<UserInfo> {
    if (!token) {
      throw new ValidationError('Token is required');
    }

    const storedToken = this.tokens.get(token);
    if (!storedToken) {
      throw new AuthenticationError('Token not found or invalid');
    }

    if (!storedToken.valid) {
      throw new AuthenticationError('Token is invalid or expired');
    }

    return { ...storedToken.userInfo };
  }

  async hasScope(token: string, scope: string): Promise<boolean> {
    if (!token) {
      throw new ValidationError('Token is required');
    }
    if (!scope) {
      throw new ValidationError('Scope is required');
    }

    const storedToken = this.tokens.get(token);
    if (!storedToken) {
      throw new AuthenticationError('Token not found or invalid');
    }

    if (!storedToken.valid) {
      throw new AuthenticationError('Token is invalid or expired');
    }

    return storedToken.scopes.includes(scope);
  }

  async hasRole(token: string, role: string): Promise<boolean> {
    if (!token) {
      throw new ValidationError('Token is required');
    }
    if (!role) {
      throw new ValidationError('Role is required');
    }

    const storedToken = this.tokens.get(token);
    if (!storedToken) {
      throw new AuthenticationError('Token not found or invalid');
    }

    if (!storedToken.valid) {
      throw new AuthenticationError('Token is invalid or expired');
    }

    return storedToken.roles.includes(role);
  }
}
