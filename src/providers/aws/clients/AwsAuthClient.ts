/**
 * AWS Auth Client Implementation
 * Uses Amazon Cognito for authentication
 *
 * Constitution Principle I: Provider Independence
 */

import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { AuthClient } from '../../../core/clients/AuthClient';
import type { TokenClaims, UserInfo } from '../../../core/types/auth';
import type { ProviderConfig } from '../../../core/types/common';
import {
  AuthenticationError,
  ServiceUnavailableError,
  ValidationError,
} from '../../../core/types/common';

export class AwsAuthClient implements AuthClient {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;

  /** Get the configured User Pool ID (for future JWT verification) */
  public getUserPoolId(): string {
    return this.userPoolId;
  }

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
      endpoint?: string;
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.cognitoClient = new CognitoIdentityProviderClient(clientConfig);
    this.userPoolId = (config.options?.userPoolId as string) ?? '';
  }

  async validateToken(token: string): Promise<TokenClaims> {
    if (!token) {
      throw new ValidationError('Token is required');
    }

    try {
      // Decode JWT to get claims (without verification - for verification use AWS Cognito's verify)
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new AuthenticationError('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as Record<
        string,
        unknown
      >;

      // Check expiration
      const exp = payload.exp as number;
      if (exp && Date.now() / 1000 > exp) {
        throw new AuthenticationError('Token has expired');
      }

      // Use Cognito to validate by fetching user info
      // This will fail if the token is invalid or revoked
      const command = new GetUserCommand({
        AccessToken: token,
      });

      const response = await this.cognitoClient.send(command);

      if (!response.Username) {
        throw new AuthenticationError('Invalid token');
      }

      // Extract attributes
      const attributes: Record<string, string> = {};
      for (const attr of response.UserAttributes ?? []) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      }

      // Build claims object with only defined values
      const claims: TokenClaims = {
        sub: attributes.sub ?? response.Username,
        iss: payload.iss as string,
        aud: (payload.aud as string) ?? (payload.client_id as string),
        exp: payload.exp as number,
        iat: payload.iat as number,
        emailVerified: attributes.email_verified === 'true',
      };
      if (attributes.email) {
        claims.email = attributes.email;
      }
      if (attributes.name) {
        claims.name = attributes.name;
      }
      return claims;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      if ((error as Error).name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid or expired token');
      }
      throw new ServiceUnavailableError(`Failed to validate token: ${(error as Error).message}`);
    }
  }

  async getUserInfo(token: string): Promise<UserInfo> {
    if (!token) {
      throw new ValidationError('Token is required');
    }

    try {
      const command = new GetUserCommand({
        AccessToken: token,
      });

      const response = await this.cognitoClient.send(command);

      if (!response.Username) {
        throw new AuthenticationError('Invalid token');
      }

      // Extract attributes
      const attributes: Record<string, string> = {};
      for (const attr of response.UserAttributes ?? []) {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      }

      // Build user info object with only defined values
      const userInfo: UserInfo = {
        sub: attributes.sub ?? response.Username,
        emailVerified: attributes.email_verified === 'true',
        phoneNumberVerified: attributes.phone_number_verified === 'true',
      };
      if (attributes.email) {
        userInfo.email = attributes.email;
      }
      if (attributes.name) {
        userInfo.name = attributes.name;
      }
      if (attributes.picture) {
        userInfo.picture = attributes.picture;
      }
      if (attributes.phone_number) {
        userInfo.phoneNumber = attributes.phone_number;
      }
      return userInfo;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      if ((error as Error).name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid or expired token');
      }
      throw new ServiceUnavailableError(`Failed to get user info: ${(error as Error).message}`);
    }
  }

  async hasScope(token: string, scope: string): Promise<boolean> {
    if (!token) {
      throw new ValidationError('Token is required');
    }
    if (!scope) {
      throw new ValidationError('Scope is required');
    }

    try {
      // Decode JWT to get scopes
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new AuthenticationError('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as Record<
        string,
        unknown
      >;

      // Cognito stores scopes in the 'scope' claim as space-separated string
      const tokenScopes = (payload.scope as string)?.split(' ') ?? [];

      return tokenScopes.includes(scope);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to check scope: ${(error as Error).message}`);
    }
  }

  async hasRole(token: string, role: string): Promise<boolean> {
    if (!token) {
      throw new ValidationError('Token is required');
    }
    if (!role) {
      throw new ValidationError('Role is required');
    }

    try {
      // Decode JWT to get groups/roles
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        throw new AuthenticationError('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as Record<
        string,
        unknown
      >;

      // Cognito stores groups in 'cognito:groups' claim
      const groups = (payload['cognito:groups'] as string[]) ?? [];

      return groups.includes(role);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to check role: ${(error as Error).message}`);
    }
  }
}
