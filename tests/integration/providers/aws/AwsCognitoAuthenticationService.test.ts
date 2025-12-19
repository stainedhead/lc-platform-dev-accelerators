/**
 * Integration Test: AwsCognitoAuthenticationService with Real AWS Cognito
 *
 * Tests AWS Cognito implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates a test User Pool during setup
 * - Creates a test user for authentication testing
 * - Cleans up all created resources in afterAll
 *
 * Note: Some OAuth flows (authorization code exchange) require browser
 * interaction and cannot be fully tested programmatically. These tests
 * focus on what can be automated: JWT validation, user info, admin operations.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsCognitoAuthenticationService } from '../../../../src/providers/aws/AwsCognitoAuthenticationService';
import { ProviderType } from '../../../../src/core/types/common';
import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  CreateUserPoolClientCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminDeleteUserCommand,
  CreateUserPoolDomainCommand,
  DeleteUserPoolDomainCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

describe('AwsCognitoAuthenticationService Integration (AWS)', () => {
  let service: AwsCognitoAuthenticationService;
  let cognitoClient: CognitoIdentityProviderClient;

  // Infrastructure IDs for cleanup
  let userPoolId: string | undefined;
  let userPoolClientId: string | undefined;
  let userPoolDomain: string | undefined;
  const testUsername = `testuser-${Date.now()}`;
  const testPassword = 'TestP@ssword123!';
  const testEmail = `test-${Date.now()}@example.com`;

  // Tokens obtained from admin auth
  let accessToken: string | undefined;
  let idToken: string | undefined;
  let refreshToken: string | undefined;

  beforeAll(async () => {
    cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

    console.log('Creating test User Pool...');

    // 1. Create User Pool
    const createPoolResponse = await cognitoClient.send(
      new CreateUserPoolCommand({
        PoolName: `${TEST_PREFIX}-pool`,
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireUppercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
          },
        },
        AutoVerifiedAttributes: ['email'],
        UsernameAttributes: ['email'],
        Schema: [
          {
            Name: 'email',
            AttributeDataType: 'String',
            Required: true,
            Mutable: true,
          },
          {
            Name: 'name',
            AttributeDataType: 'String',
            Required: false,
            Mutable: true,
          },
        ],
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      })
    );

    userPoolId = createPoolResponse.UserPool?.Id;
    if (!userPoolId) {
      throw new Error('Failed to create User Pool');
    }
    console.log(`Created User Pool: ${userPoolId}`);

    // 2. Create User Pool Domain (required for OAuth endpoints)
    userPoolDomain = `${TEST_PREFIX}-domain`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      await cognitoClient.send(
        new CreateUserPoolDomainCommand({
          UserPoolId: userPoolId,
          Domain: userPoolDomain,
        })
      );
      console.log(`Created User Pool Domain: ${userPoolDomain}`);
    } catch (error) {
      console.warn(`Warning: Could not create domain: ${(error as Error).message}`);
      userPoolDomain = undefined;
    }

    // 3. Create User Pool Client
    const createClientResponse = await cognitoClient.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: `${TEST_PREFIX}-client`,
        GenerateSecret: false, // No secret for public client
        ExplicitAuthFlows: [
          'ADMIN_NO_SRP_AUTH',
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ],
        SupportedIdentityProviders: ['COGNITO'],
        CallbackURLs: ['https://example.com/callback'],
        LogoutURLs: ['https://example.com/logout'],
        AllowedOAuthFlows: ['code'],
        AllowedOAuthScopes: ['openid', 'email', 'profile'],
        AllowedOAuthFlowsUserPoolClient: true,
      })
    );

    userPoolClientId = createClientResponse.UserPoolClient?.ClientId;
    if (!userPoolClientId) {
      throw new Error('Failed to create User Pool Client');
    }
    console.log(`Created User Pool Client: ${userPoolClientId}`);

    // 4. Create test user
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: testUsername,
        UserAttributes: [
          { Name: 'email', Value: testEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: 'Test User' },
        ],
        TemporaryPassword: testPassword,
        MessageAction: 'SUPPRESS', // Don't send email
      })
    );

    // Set permanent password
    await cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: testUsername,
        Password: testPassword,
        Permanent: true,
      })
    );
    console.log(`Created test user: ${testUsername}`);

    // 5. Get tokens using admin auth
    const authResponse = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: testUsername,
          PASSWORD: testPassword,
        },
      })
    );

    accessToken = authResponse.AuthenticationResult?.AccessToken;
    idToken = authResponse.AuthenticationResult?.IdToken;
    refreshToken = authResponse.AuthenticationResult?.RefreshToken;

    if (!accessToken || !idToken) {
      throw new Error('Failed to obtain tokens');
    }
    console.log('Obtained test tokens');

    // 6. Initialize service
    const serviceOptions: {
      userPoolId?: string;
      userPoolDomain?: string;
      userPoolRegion?: string;
    } = {
      userPoolId: userPoolId,
      userPoolRegion: AWS_REGION,
    };
    if (userPoolDomain) {
      serviceOptions.userPoolDomain = userPoolDomain;
    }
    service = new AwsCognitoAuthenticationService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      options: serviceOptions,
    });

    // Configure service
    await service.configure({
      provider: 'okta', // This is ignored, just satisfies the interface
      domain: userPoolDomain ? `${userPoolDomain}.auth.${AWS_REGION}.amazoncognito.com` : '',
      clientId: userPoolClientId,
      scopes: ['openid', 'email', 'profile'],
    });

    console.log('Service configured');
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    console.log('Cleaning up Cognito resources...');

    if (userPoolId) {
      // Delete test user
      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: testUsername,
          })
        );
        console.log('Deleted test user');
      } catch (error) {
        console.warn(`Warning: Could not delete user: ${(error as Error).message}`);
      }

      // Delete User Pool Domain
      if (userPoolDomain) {
        try {
          await cognitoClient.send(
            new DeleteUserPoolDomainCommand({
              UserPoolId: userPoolId,
              Domain: userPoolDomain,
            })
          );
          console.log('Deleted User Pool Domain');
        } catch (error) {
          console.warn(`Warning: Could not delete domain: ${(error as Error).message}`);
        }
      }

      // Delete User Pool (this also deletes the client)
      try {
        await cognitoClient.send(
          new DeleteUserPoolCommand({
            UserPoolId: userPoolId,
          })
        );
        console.log('Deleted User Pool');
      } catch (error) {
        console.warn(`Warning: Could not delete User Pool: ${(error as Error).message}`);
      }
    }
  }, 60000);

  test('configure - should configure service without error', async () => {
    const testOptions: { userPoolId?: string; userPoolDomain?: string } = {
      userPoolId: userPoolId!,
    };
    if (userPoolDomain) {
      testOptions.userPoolDomain = userPoolDomain;
    }

    const newService = new AwsCognitoAuthenticationService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      options: testOptions,
    });

    await expect(
      newService.configure({
        provider: 'okta',
        domain: userPoolDomain
          ? `${userPoolDomain}.auth.${AWS_REGION}.amazoncognito.com`
          : 'test.auth.us-east-1.amazoncognito.com',
        clientId: userPoolClientId!,
      })
    ).resolves.not.toThrow();
  });

  test('getAuthorizationUrl - should generate valid authorization URL', async () => {
    const redirectUri = 'https://example.com/callback';
    const state = 'test-state-123';

    const url = await service.getAuthorizationUrl(redirectUri, ['openid', 'email'], state);

    expect(url).toBeDefined();
    expect(url).toContain('/oauth2/authorize');
    expect(url).toContain(`client_id=${userPoolClientId}`);
    expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email');
    expect(url).toContain(`state=${state}`);
  });

  test('getAuthorizationUrl - should use default scopes if not provided', async () => {
    const redirectUri = 'https://example.com/callback';

    const url = await service.getAuthorizationUrl(redirectUri);

    expect(url).toContain('scope=openid');
    expect(url).toContain('email');
    expect(url).toContain('profile');
  });

  test('validateToken - should validate access token', async () => {
    expect(accessToken).toBeDefined();

    const claims = await service.validateToken(accessToken!);

    expect(claims.sub).toBeDefined();
    expect(claims.iss).toContain(userPoolId!);
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
    expect(claims.iat).toBeLessThan(Date.now() / 1000);
    expect(claims.token_use).toBe('access');
  });

  test('validateToken - should reject invalid token', async () => {
    const invalidToken = 'invalid.token.here';

    await expect(service.validateToken(invalidToken)).rejects.toThrow();
  });

  test('validateToken - should reject expired token', async () => {
    // This is a well-formed but expired JWT
    const expiredToken =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.fake';

    await expect(service.validateToken(expiredToken)).rejects.toThrow();
  });

  test('verifyIdToken - should verify ID token', async () => {
    expect(idToken).toBeDefined();

    const claims = await service.verifyIdToken(idToken!);

    expect(claims.sub).toBeDefined();
    expect(claims.iss).toContain(userPoolId!);
    expect(claims.aud).toBe(userPoolClientId!);
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
    expect(claims.token_use).toBe('id');
    expect(claims.email).toBe(testEmail);
  });

  test('verifyIdToken - should reject invalid ID token', async () => {
    const invalidToken = 'invalid.id.token';

    await expect(service.verifyIdToken(invalidToken)).rejects.toThrow();
  });

  test('getUserInfo - should retrieve user info with access token', async () => {
    // Note: This requires the userPoolDomain to be set up correctly
    if (!userPoolDomain) {
      console.log('Skipping getUserInfo test - no domain configured');
      return;
    }

    expect(accessToken).toBeDefined();

    const userInfo = await service.getUserInfo(accessToken!);

    expect(userInfo.sub).toBeDefined();
    expect(userInfo.email).toBe(testEmail);
  });

  test('getUserInfo - should fail with invalid token', async () => {
    if (!userPoolDomain) {
      console.log('Skipping getUserInfo error test - no domain configured');
      return;
    }

    await expect(service.getUserInfo('invalid-token')).rejects.toThrow();
  });

  test('adminGetUser - should retrieve user details', async () => {
    const userInfo = await service.adminGetUser(testUsername);

    expect(userInfo.sub).toBeDefined();
    expect(userInfo.email).toBe(testEmail);
    expect(userInfo.name).toBe('Test User');
  });

  test('adminGetUser - should fail for non-existent user', async () => {
    await expect(service.adminGetUser('nonexistent-user-12345')).rejects.toThrow();
  });

  test('refreshAccessToken - should refresh tokens', async () => {
    // Note: This requires the userPoolDomain to be set up correctly
    if (!userPoolDomain || !refreshToken) {
      console.log('Skipping refreshAccessToken test - missing domain or refresh token');
      return;
    }

    const newTokens = await service.refreshAccessToken(refreshToken);

    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.tokenType).toBe('Bearer');
    expect(newTokens.expiresIn).toBeGreaterThan(0);
    // Cognito returns the same refresh token
    expect(newTokens.refreshToken).toBe(refreshToken);
  });

  test('revokeToken - should revoke refresh token', async () => {
    // Note: This requires the userPoolDomain to be set up correctly
    if (!userPoolDomain || !refreshToken) {
      console.log('Skipping revokeToken test - missing domain or refresh token');
      return;
    }

    // Get a new refresh token first (so we don't invalidate our main one)
    const authResponse = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: userPoolId!,
        ClientId: userPoolClientId!,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: testUsername,
          PASSWORD: testPassword,
        },
      })
    );

    const tokenToRevoke = authResponse.AuthenticationResult?.RefreshToken;
    if (!tokenToRevoke) {
      console.log('Skipping revokeToken test - could not get new refresh token');
      return;
    }

    // Revoke should succeed without error
    await expect(service.revokeToken(tokenToRevoke)).resolves.not.toThrow();
  });

  test('Error handling - should throw when not configured', async () => {
    const unconfiguredService = new AwsCognitoAuthenticationService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      options: {
        userPoolId: userPoolId!,
      },
    });

    await expect(
      unconfiguredService.getAuthorizationUrl('https://example.com/callback')
    ).rejects.toThrow('not configured');
  });

  test('Multiple token validations - should handle concurrent validations', async () => {
    expect(accessToken).toBeDefined();

    const validations = await Promise.all([
      service.validateToken(accessToken!),
      service.validateToken(accessToken!),
      service.validateToken(accessToken!),
    ]);

    expect(validations).toHaveLength(3);
    validations.forEach((claims) => {
      expect(claims.sub).toBeDefined();
      expect(claims.token_use).toBe('access');
    });
  });

  test('Token claims - should include expected claims', async () => {
    expect(accessToken).toBeDefined();
    expect(idToken).toBeDefined();

    const accessClaims = await service.validateToken(accessToken!);
    const idClaims = await service.verifyIdToken(idToken!);

    // Access token claims
    expect(accessClaims.sub).toBeDefined();
    expect(accessClaims.iss).toBeDefined();
    expect(accessClaims.exp).toBeDefined();
    expect(accessClaims.iat).toBeDefined();

    // ID token claims
    expect(idClaims.sub).toBeDefined();
    expect(idClaims.aud).toBeDefined();
    expect(idClaims.email).toBe(testEmail);
  });
});
