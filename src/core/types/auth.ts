/**
 * Authentication Types - OAuth2/OIDC
 */

export interface TokenSet {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface TokenClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  email?: string;
  name?: string;
  [claim: string]: unknown;
}

export interface UserInfo {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  [key: string]: unknown;
}

export interface AuthConfig {
  provider: 'okta' | 'auth0' | 'azure-ad';
  domain: string;
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
}
