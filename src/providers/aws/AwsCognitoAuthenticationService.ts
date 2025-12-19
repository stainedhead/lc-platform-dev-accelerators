/**
 * AWS Cognito Authentication Service Implementation
 * Uses AWS Cognito for OAuth2/OIDC authentication
 *
 * Supports:
 * - OAuth2 authorization code flow
 * - Token exchange and refresh
 * - JWT validation using aws-jwt-verify
 * - User info retrieval
 * - Token revocation
 */

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { AuthenticationService } from '../../core/services/AuthenticationService';
import type { TokenSet, TokenClaims, UserInfo, AuthConfig } from '../../core/types/auth';
import type { ProviderConfig } from '../../core/types/common';
import { AuthenticationError, ServiceUnavailableError } from '../../core/types/common';

export interface CognitoProviderConfig extends ProviderConfig {
  options?: {
    userPoolId?: string;
    userPoolDomain?: string;
    userPoolRegion?: string;
  };
}

export class AwsCognitoAuthenticationService implements AuthenticationService {
  private config?: AuthConfig;
  private readonly userPoolId: string;
  private readonly userPoolDomain: string;
  private readonly userPoolRegion: string;
  private cognitoClient: CognitoIdentityProviderClient;
  private accessTokenVerifier?: ReturnType<typeof CognitoJwtVerifier.create>;
  private idTokenVerifier?: ReturnType<typeof CognitoJwtVerifier.create>;

  constructor(providerConfig: CognitoProviderConfig) {
    this.userPoolId = String(providerConfig.options?.userPoolId || '');
    this.userPoolDomain = String(providerConfig.options?.userPoolDomain || '');
    this.userPoolRegion = String(
      providerConfig.options?.userPoolRegion || providerConfig.region || 'us-east-1'
    );

    const clientConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = {
      region: this.userPoolRegion,
    };

    if (providerConfig.credentials?.accessKeyId && providerConfig.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: providerConfig.credentials.accessKeyId,
        secretAccessKey: providerConfig.credentials.secretAccessKey,
      };
    }

    this.cognitoClient = new CognitoIdentityProviderClient(clientConfig);
  }

  async configure(config: AuthConfig): Promise<void> {
    this.config = config;

    // Initialize JWT verifiers if userPoolId is set
    if (this.userPoolId && config.clientId) {
      this.accessTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: this.userPoolId,
        tokenUse: 'access',
        clientId: config.clientId,
      });

      this.idTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: this.userPoolId,
        tokenUse: 'id',
        clientId: config.clientId,
      });
    }
  }

  async getAuthorizationUrl(
    redirectUri: string,
    scopes?: string[],
    state?: string
  ): Promise<string> {
    this.ensureConfigured();

    const scopeList = scopes ?? this.config!.scopes ?? ['openid', 'email', 'profile'];
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config!.clientId,
      redirect_uri: redirectUri,
      scope: scopeList.join(' '),
      ...(state && { state }),
    });

    const domain = this.getCognitoDomain();
    return `${domain}/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenSet> {
    this.ensureConfigured();

    const domain = this.getCognitoDomain();
    const tokenEndpoint = `${domain}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config!.clientId,
      code,
      redirect_uri: redirectUri,
    });

    // Add client secret if provided (for confidential clients)
    if (this.config!.clientSecret) {
      params.append('client_secret', this.config!.clientSecret);
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new AuthenticationError(`Token exchange failed: ${response.status} - ${errorData}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        id_token?: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      const tokenSet: TokenSet = {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
      if (data.id_token) {
        tokenSet.idToken = data.id_token;
      }
      if (data.refresh_token) {
        tokenSet.refreshToken = data.refresh_token;
      }
      if (data.scope) {
        tokenSet.scope = data.scope;
      }
      return tokenSet;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to exchange code for tokens: ${(error as Error).message}`
      );
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    this.ensureConfigured();

    const domain = this.getCognitoDomain();
    const tokenEndpoint = `${domain}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config!.clientId,
      refresh_token: refreshToken,
    });

    // Add client secret if provided
    if (this.config!.clientSecret) {
      params.append('client_secret', this.config!.clientSecret);
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new AuthenticationError(`Token refresh failed: ${response.status} - ${errorData}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        id_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      const tokenSet: TokenSet = {
        accessToken: data.access_token,
        // Cognito doesn't return a new refresh token on refresh
        refreshToken: refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
      if (data.id_token) {
        tokenSet.idToken = data.id_token;
      }
      if (data.scope) {
        tokenSet.scope = data.scope;
      }
      return tokenSet;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(
        `Failed to refresh access token: ${(error as Error).message}`
      );
    }
  }

  async validateToken(accessToken: string): Promise<TokenClaims> {
    this.ensureConfigured();

    if (!this.accessTokenVerifier) {
      throw new AuthenticationError(
        'Token validation not configured. Ensure userPoolId and clientId are set.'
      );
    }

    try {
      const payload = await this.accessTokenVerifier.verify(accessToken);

      const claims: TokenClaims = {
        sub: payload.sub,
        iss: payload.iss,
        aud: (payload.client_id as string) || (payload.aud as string) || '',
        exp: payload.exp,
        iat: payload.iat,
      };

      // Add optional claims if present
      if (payload.email) {
        claims.email = payload.email as string;
      }
      if (payload.username) {
        claims.name = payload.username as string;
      }
      if (payload.scope) {
        claims.scope = payload.scope as string;
      }
      if (payload.token_use) {
        claims.token_use = payload.token_use;
      }

      return claims;
    } catch (error) {
      throw new AuthenticationError(`Token validation failed: ${(error as Error).message}`);
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    this.ensureConfigured();

    const domain = this.getCognitoDomain();
    const userInfoEndpoint = `${domain}/oauth2/userInfo`;

    try {
      const response = await fetch(userInfoEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new AuthenticationError(`Failed to get user info: ${response.status} - ${errorData}`);
      }

      const data = (await response.json()) as {
        sub: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
        locale?: string;
        [key: string]: unknown;
      };

      const userInfo: UserInfo = {
        sub: data.sub,
      };

      if (data.email) {
        userInfo.email = data.email;
      }
      userInfo.emailVerified = data.email_verified === 'true' || data.email_verified === true;
      if (data.name) {
        userInfo.name = data.name;
      }
      if (data.given_name) {
        userInfo.givenName = data.given_name;
      }
      if (data.family_name) {
        userInfo.familyName = data.family_name;
      }
      if (data.picture) {
        userInfo.picture = data.picture;
      }
      if (data.locale) {
        userInfo.locale = data.locale;
      }

      return userInfo;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to get user info: ${(error as Error).message}`);
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.ensureConfigured();

    const domain = this.getCognitoDomain();
    const revokeEndpoint = `${domain}/oauth2/revoke`;

    const params = new URLSearchParams({
      token,
      client_id: this.config!.clientId,
    });

    // Add client secret if provided
    if (this.config!.clientSecret) {
      params.append('client_secret', this.config!.clientSecret);
    }

    try {
      const response = await fetch(revokeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new AuthenticationError(`Token revocation failed: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to revoke token: ${(error as Error).message}`);
    }
  }

  async verifyIdToken(idToken: string): Promise<TokenClaims> {
    this.ensureConfigured();

    if (!this.idTokenVerifier) {
      throw new AuthenticationError(
        'ID token verification not configured. Ensure userPoolId and clientId are set.'
      );
    }

    try {
      const payload = await this.idTokenVerifier.verify(idToken);

      const claims: TokenClaims = {
        sub: payload.sub,
        iss: payload.iss,
        aud: payload.aud as string,
        exp: payload.exp,
        iat: payload.iat,
      };

      // Add optional claims if present
      if (payload.email) {
        claims.email = payload.email as string;
      }
      if (payload.name) {
        claims.name = payload.name as string;
      }
      if (payload.email_verified !== undefined) {
        claims.email_verified = payload.email_verified as boolean;
      }
      if (payload.token_use) {
        claims.token_use = payload.token_use;
      }

      return claims;
    } catch (error) {
      throw new AuthenticationError(`ID token verification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get user details from Cognito using the SDK (requires admin access)
   * This is an additional method not in the base interface
   */
  async adminGetUser(username: string): Promise<UserInfo> {
    if (!this.userPoolId) {
      throw new AuthenticationError('userPoolId is required for adminGetUser');
    }

    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      const response = await this.cognitoClient.send(command);

      const attributes: Record<string, string> = {};
      for (const attr of response.UserAttributes || []) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      }

      const userInfo: UserInfo = {
        sub: attributes['sub'] || username,
        emailVerified: attributes['email_verified'] === 'true',
      };

      if (attributes['email']) {
        userInfo.email = attributes['email'];
      }
      if (attributes['name']) {
        userInfo.name = attributes['name'];
      }
      if (attributes['given_name']) {
        userInfo.givenName = attributes['given_name'];
      }
      if (attributes['family_name']) {
        userInfo.familyName = attributes['family_name'];
      }
      if (attributes['picture']) {
        userInfo.picture = attributes['picture'];
      }
      if (attributes['locale']) {
        userInfo.locale = attributes['locale'];
      }

      return userInfo;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to get user: ${(error as Error).message}`);
    }
  }

  private ensureConfigured(): void {
    if (!this.config) {
      throw new AuthenticationError(
        'Authentication service not configured. Call configure() first.'
      );
    }
  }

  private getCognitoDomain(): string {
    // Use the configured domain or build from userPoolDomain
    if (this.config?.domain) {
      // If domain already includes protocol, use as-is
      if (this.config.domain.startsWith('http')) {
        return this.config.domain;
      }
      // If domain is just the subdomain, build full URL
      if (this.config.domain.includes('.')) {
        return `https://${this.config.domain}`;
      }
    }

    if (this.userPoolDomain) {
      // Cognito hosted UI domain format
      // Custom domain: https://{domain}
      // Cognito domain: https://{domain}.auth.{region}.amazoncognito.com
      if (this.userPoolDomain.includes('.')) {
        return `https://${this.userPoolDomain}`;
      }
      return `https://${this.userPoolDomain}.auth.${this.userPoolRegion}.amazoncognito.com`;
    }

    throw new AuthenticationError(
      'Cognito domain not configured. Set either domain in config or userPoolDomain in provider config.'
    );
  }
}
