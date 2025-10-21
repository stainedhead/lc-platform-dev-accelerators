/**
 * Mock Authentication Service Implementation
 * In-memory OAuth2/OIDC authentication for testing
 */

import type { AuthenticationService } from '../../core/services/AuthenticationService';
import type { TokenSet, TokenClaims, UserInfo, AuthConfig } from '../../core/types/auth';
import { AuthenticationError } from '../../core/types/common';
import { randomBytes } from 'crypto';

interface StoredUser {
  sub: string;
  email: string;
  name: string;
  password: string;
}

export class MockAuthenticationService implements AuthenticationService {
  private config?: AuthConfig;
  private users = new Map<string, StoredUser>();
  private tokens = new Map<string, TokenClaims>();
  private refreshTokens = new Map<string, string>(); // refresh -> access mapping
  private authCodes = new Map<string, string>(); // code -> sub mapping

  constructor() {
    // Pre-populate with test user
    this.users.set('test@example.com', {
      sub: 'mock-user-1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    });
  }

  async configure(config: AuthConfig): Promise<void> {
    this.config = config;
  }

  async getAuthorizationUrl(
    redirectUri: string,
    scopes?: string[],
    state?: string
  ): Promise<string> {
    this.ensureConfigured();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config!.clientId,
      redirect_uri: redirectUri,
      scope: (scopes ?? this.config!.scopes ?? ['openid', 'email', 'profile']).join(' '),
      ...(state && { state }),
    });

    return `https://${this.config!.domain}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, _redirectUri: string): Promise<TokenSet> {
    this.ensureConfigured();

    const sub = this.authCodes.get(code);
    if (!sub) {
      throw new AuthenticationError('Invalid authorization code');
    }

    this.authCodes.delete(code);

    const user = Array.from(this.users.values()).find((u) => u.sub === sub);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const accessToken = this.generateToken();
    const idToken = this.generateToken();
    const refreshToken = this.generateToken();

    const now = Math.floor(Date.now() / 1000);
    const claims: TokenClaims = {
      sub: user.sub,
      iss: `https://${this.config!.domain}`,
      aud: this.config!.clientId,
      exp: now + 3600, // 1 hour
      iat: now,
      email: user.email,
      name: user.name,
    };

    this.tokens.set(accessToken, claims);
    this.tokens.set(idToken, claims);
    this.refreshTokens.set(refreshToken, accessToken);

    return {
      accessToken,
      idToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      scope: 'openid email profile',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    this.ensureConfigured();

    const oldAccessToken = this.refreshTokens.get(refreshToken);
    if (!oldAccessToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const oldClaims = this.tokens.get(oldAccessToken);
    if (!oldClaims) {
      throw new AuthenticationError('Token claims not found');
    }

    // Generate new tokens
    const newAccessToken = this.generateToken();
    const newIdToken = this.generateToken();

    const now = Math.floor(Date.now() / 1000);
    const newClaims: TokenClaims = {
      ...oldClaims,
      exp: now + 3600,
      iat: now,
    };

    this.tokens.set(newAccessToken, newClaims);
    this.tokens.set(newIdToken, newClaims);
    this.refreshTokens.set(refreshToken, newAccessToken);

    // Clean up old access token
    this.tokens.delete(oldAccessToken);

    return {
      accessToken: newAccessToken,
      idToken: newIdToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer',
      scope: 'openid email profile',
    };
  }

  async validateToken(accessToken: string): Promise<TokenClaims> {
    const claims = this.tokens.get(accessToken);
    if (!claims) {
      throw new AuthenticationError('Invalid access token');
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      throw new AuthenticationError('Token expired');
    }

    return claims;
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const claims = await this.validateToken(accessToken);

    const user = Array.from(this.users.values()).find((u) => u.sub === claims.sub);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const nameParts = user.name.split(' ');
    const userInfo: UserInfo = {
      sub: user.sub,
      email: user.email,
      emailVerified: true,
      name: user.name,
    };

    if (nameParts[0]) {
      userInfo.givenName = nameParts[0];
    }
    if (nameParts[1]) {
      userInfo.familyName = nameParts[1];
    }

    return userInfo;
  }

  async revokeToken(token: string): Promise<void> {
    // Remove from tokens map
    this.tokens.delete(token);

    // Remove from refresh tokens if it's a refresh token
    this.refreshTokens.delete(token);

    // Remove if it's an access token being referenced by a refresh token
    for (const [refreshToken, accessToken] of this.refreshTokens.entries()) {
      if (accessToken === token) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  async verifyIdToken(idToken: string): Promise<TokenClaims> {
    // For mock, verification is the same as validation
    return this.validateToken(idToken);
  }

  // Helper methods
  private ensureConfigured(): void {
    if (!this.config) {
      throw new Error('Authentication service not configured');
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  // Test helper: create an auth code for testing
  public createAuthCode(email: string): string {
    const user = this.users.get(email);
    if (!user) {
      throw new Error(`User ${email} not found`);
    }

    const code = randomBytes(16).toString('hex');
    this.authCodes.set(code, user.sub);
    return code;
  }

  // Test helper: add a test user
  public addTestUser(email: string, name: string, password: string): string {
    const sub = `mock-user-${this.users.size + 1}`;
    this.users.set(email, {
      sub,
      email,
      name,
      password,
    });
    return sub;
  }
}
