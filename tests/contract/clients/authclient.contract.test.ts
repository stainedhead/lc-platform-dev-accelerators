/**
 * Contract Test: AuthClient
 *
 * Verifies that both AWS and Mock providers implement the AuthClient interface
 * with identical behavior. This ensures cloud-agnostic portability for Data Plane operations.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { AuthClient } from '../../../src/core/clients/AuthClient';
import { MockAuthClient } from '../../../src/providers/mock/clients/MockAuthClient';
import { AuthenticationError, ValidationError } from '../../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the AuthClient contract.
 */
function testAuthClientContract(
  name: string,
  createClient: () => MockAuthClient | AuthClient,
  setup?: (client: MockAuthClient) => void
) {
  describe(`AuthClient Contract: ${name}`, () => {
    let client: AuthClient;
    const validToken = 'valid-test-token';
    const invalidToken = 'invalid-test-token';
    const expiredToken = 'expired-test-token';

    beforeEach(() => {
      const c = createClient();
      client = c;
      if (setup && c instanceof MockAuthClient) {
        setup(c);
      }
    });

    describe('validateToken', () => {
      test('should validate a valid token and return claims', async () => {
        const claims = await client.validateToken(validToken);

        expect(claims).toBeDefined();
        expect(claims.sub).toBeDefined();
        expect(typeof claims.sub).toBe('string');
      });

      test('should return token claims with expected fields', async () => {
        const claims = await client.validateToken(validToken);

        expect(claims.sub).toBe('user-123');
        expect(claims.iss).toBeDefined();
      });

      test('should throw AuthenticationError for invalid token', async () => {
        await expect(client.validateToken(invalidToken)).rejects.toThrow(AuthenticationError);
      });

      test('should throw AuthenticationError for expired token', async () => {
        await expect(client.validateToken(expiredToken)).rejects.toThrow(AuthenticationError);
      });

      test('should throw ValidationError for empty token', async () => {
        await expect(client.validateToken('')).rejects.toThrow(ValidationError);
      });

      test('should throw AuthenticationError for unknown token', async () => {
        await expect(client.validateToken('unknown-token')).rejects.toThrow(AuthenticationError);
      });
    });

    describe('getUserInfo', () => {
      test('should get user info for valid token', async () => {
        const userInfo = await client.getUserInfo(validToken);

        expect(userInfo).toBeDefined();
        expect(userInfo.id).toBeDefined();
        expect(typeof userInfo.id).toBe('string');
      });

      test('should return user info with expected fields', async () => {
        const userInfo = await client.getUserInfo(validToken);

        expect(userInfo.id).toBe('user-123');
        expect(userInfo.email).toBe('user@example.com');
        expect(userInfo.name).toBe('Test User');
      });

      test('should throw AuthenticationError for invalid token', async () => {
        await expect(client.getUserInfo(invalidToken)).rejects.toThrow(AuthenticationError);
      });

      test('should throw ValidationError for empty token', async () => {
        await expect(client.getUserInfo('')).rejects.toThrow(ValidationError);
      });
    });

    describe('hasScope', () => {
      test('should return true for token with requested scope', async () => {
        const hasScope = await client.hasScope(validToken, 'read:users');

        expect(hasScope).toBe(true);
      });

      test('should return false for token without requested scope', async () => {
        const hasScope = await client.hasScope(validToken, 'delete:users');

        expect(hasScope).toBe(false);
      });

      test('should throw AuthenticationError for invalid token', async () => {
        await expect(client.hasScope(invalidToken, 'read:users')).rejects.toThrow(
          AuthenticationError
        );
      });

      test('should throw ValidationError for empty token', async () => {
        await expect(client.hasScope('', 'read:users')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty scope', async () => {
        await expect(client.hasScope(validToken, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('hasRole', () => {
      test('should return true for token with requested role', async () => {
        const hasRole = await client.hasRole(validToken, 'admin');

        expect(hasRole).toBe(true);
      });

      test('should return false for token without requested role', async () => {
        const hasRole = await client.hasRole(validToken, 'superadmin');

        expect(hasRole).toBe(false);
      });

      test('should throw AuthenticationError for invalid token', async () => {
        await expect(client.hasRole(invalidToken, 'admin')).rejects.toThrow(AuthenticationError);
      });

      test('should throw ValidationError for empty token', async () => {
        await expect(client.hasRole('', 'admin')).rejects.toThrow(ValidationError);
      });

      test('should throw ValidationError for empty role', async () => {
        await expect(client.hasRole(validToken, '')).rejects.toThrow(ValidationError);
      });
    });

    describe('combined operations', () => {
      test('should validate token and check permissions in sequence', async () => {
        // First validate
        const claims = await client.validateToken(validToken);
        expect(claims).toBeDefined();

        // Then check scope
        const hasReadScope = await client.hasScope(validToken, 'read:users');
        expect(hasReadScope).toBe(true);

        // Then check role
        const isAdmin = await client.hasRole(validToken, 'admin');
        expect(isAdmin).toBe(true);

        // Finally get user info
        const userInfo = await client.getUserInfo(validToken);
        expect(userInfo.id).toBe(claims.sub);
      });
    });
  });
}

// Run contract tests against Mock provider with setup
testAuthClientContract(
  'MockAuthClient',
  () => new MockAuthClient(),
  (client) => {
    // Setup test tokens
    client.registerToken(
      'valid-test-token',
      {
        sub: 'user-123',
        iss: 'https://auth.example.com',
        aud: 'test-app',
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        iat: Math.floor(Date.now() / 1000),
      },
      {
        sub: 'user-123',
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        emailVerified: true,
      },
      {
        scopes: ['read:users', 'write:users', 'read:orders'],
        roles: ['admin', 'user'],
        valid: true,
      }
    );

    // Register expired token
    client.registerToken(
      'expired-test-token',
      {
        sub: 'user-456',
        iss: 'https://auth.example.com',
        aud: 'test-app',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      },
      {
        sub: 'user-456',
        id: 'user-456',
        email: 'expired@example.com',
        name: 'Expired User',
        emailVerified: true,
      },
      { valid: true }
    );

    // Register invalid token
    client.registerInvalidToken('invalid-test-token');
  }
);

// TODO: Uncomment when AWS integration tests are set up with LocalStack
// import { AwsAuthClient } from '../../../src/providers/aws/clients/AwsAuthClient';
// testAuthClientContract('AwsAuthClient', () => new AwsAuthClient({ provider: ProviderType.AWS }));
