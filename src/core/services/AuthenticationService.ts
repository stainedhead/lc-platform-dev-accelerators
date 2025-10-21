/**
 * Authentication Service Interface
 * Provides cloud-agnostic OAuth2/OIDC authentication capabilities
 */

import type { TokenSet, TokenClaims, UserInfo, AuthConfig } from '../types/auth';

export interface AuthenticationService {
  /**
   * Initialize the authentication service with provider configuration
   * @param config Authentication provider configuration
   */
  configure(config: AuthConfig): Promise<void>;

  /**
   * Get the authorization URL to redirect users for login
   * @param redirectUri Callback URL after authentication
   * @param scopes Optional array of OAuth scopes to request
   * @param state Optional state parameter for CSRF protection
   * @returns Authorization URL
   */
  getAuthorizationUrl(redirectUri: string, scopes?: string[], state?: string): Promise<string>;

  /**
   * Exchange authorization code for tokens
   * @param code Authorization code from callback
   * @param redirectUri The same redirect URI used in authorization request
   * @returns Token set including access token, ID token, and refresh token
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet>;

  /**
   * Refresh an access token using a refresh token
   * @param refreshToken The refresh token
   * @returns New token set
   */
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;

  /**
   * Validate and decode an access token
   * @param accessToken The access token to validate
   * @returns Decoded token claims if valid
   */
  validateToken(accessToken: string): Promise<TokenClaims>;

  /**
   * Get user information using an access token
   * @param accessToken The access token
   * @returns User profile information
   */
  getUserInfo(accessToken: string): Promise<UserInfo>;

  /**
   * Revoke a token (logout)
   * @param token The token to revoke (access or refresh)
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Verify an ID token's signature and claims
   * @param idToken The ID token to verify
   * @returns Decoded token claims if valid
   */
  verifyIdToken(idToken: string): Promise<TokenClaims>;
}
