/**
 * Unit Tests for MockAuthClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockAuthClient } from '../../../../../src/providers/mock/clients/MockAuthClient';
import { AuthenticationError, ValidationError } from '../../../../../src/core/types/common';

describe('MockAuthClient', () => {
  let client: MockAuthClient;

  beforeEach(() => {
    client = new MockAuthClient();
    client.reset();
  });

  describe('validateToken', () => {
    test('should validate a valid token', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://auth.example.com',
        aud: 'my-app',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'user@example.com',
      };

      client.registerToken('valid-token', claims, { sub: 'user-123', email: 'user@example.com' });

      const result = await client.validateToken('valid-token');
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('user@example.com');
    });

    test('should throw AuthenticationError for unknown token', async () => {
      expect(client.validateToken('unknown-token')).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('should throw AuthenticationError for invalid token', async () => {
      client.registerInvalidToken('invalid-token');
      expect(client.validateToken('invalid-token')).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('should throw AuthenticationError for expired token', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://auth.example.com',
        aud: 'my-app',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };

      client.registerToken('expired-token', claims, { sub: 'user-123' });
      expect(client.validateToken('expired-token')).rejects.toBeInstanceOf(AuthenticationError);
    });

    test('should throw ValidationError for empty token', async () => {
      expect(client.validateToken('')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('getUserInfo', () => {
    test('should get user info for valid token', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://auth.example.com',
        aud: 'my-app',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      const userInfo = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png',
      };

      client.registerToken('token', claims, userInfo);

      const result = await client.getUserInfo('token');
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
      expect(result.picture).toBe('https://example.com/avatar.png');
    });

    test('should throw AuthenticationError for invalid token', async () => {
      client.registerInvalidToken('invalid-token');
      expect(client.getUserInfo('invalid-token')).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('hasScope', () => {
    test('should return true if token has scope', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'test',
        aud: 'test',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      client.registerToken(
        'token',
        claims,
        { sub: 'user-123' },
        {
          scopes: ['read:users', 'write:users', 'admin'],
        }
      );

      expect(client.hasScope('token', 'read:users')).resolves.toBe(true);
      expect(client.hasScope('token', 'admin')).resolves.toBe(true);
    });

    test('should return false if token does not have scope', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'test',
        aud: 'test',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      client.registerToken(
        'token',
        claims,
        { sub: 'user-123' },
        {
          scopes: ['read:users'],
        }
      );

      expect(client.hasScope('token', 'write:users')).resolves.toBe(false);
    });

    test('should throw ValidationError for empty scope', async () => {
      client.registerToken(
        'token',
        { sub: 'u', iss: 'i', aud: 'a', exp: 9999999999, iat: 0 },
        { sub: 'u' }
      );
      expect(client.hasScope('token', '')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('hasRole', () => {
    test('should return true if token has role', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'test',
        aud: 'test',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      client.registerToken(
        'token',
        claims,
        { sub: 'user-123' },
        {
          roles: ['admin', 'manager'],
        }
      );

      expect(client.hasRole('token', 'admin')).resolves.toBe(true);
      expect(client.hasRole('token', 'manager')).resolves.toBe(true);
    });

    test('should return false if token does not have role', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'test',
        aud: 'test',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      client.registerToken(
        'token',
        claims,
        { sub: 'user-123' },
        {
          roles: ['user'],
        }
      );

      expect(client.hasRole('token', 'admin')).resolves.toBe(false);
    });

    test('should throw ValidationError for empty role', async () => {
      client.registerToken(
        'token',
        { sub: 'u', iss: 'i', aud: 'a', exp: 9999999999, iat: 0 },
        { sub: 'u' }
      );
      expect(client.hasRole('token', '')).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('integration', () => {
    test('should support typical auth patterns', async () => {
      // Register a user token
      const claims = {
        sub: 'user-456',
        iss: 'https://auth.myapp.com',
        aud: 'my-api',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        email: 'admin@example.com',
      };

      const userInfo = {
        sub: 'user-456',
        email: 'admin@example.com',
        name: 'Admin User',
        emailVerified: true,
      };

      client.registerToken('admin-token', claims, userInfo, {
        scopes: ['read:all', 'write:all'],
        roles: ['admin'],
      });

      // Validate token
      const validatedClaims = await client.validateToken('admin-token');
      expect(validatedClaims.sub).toBe('user-456');

      // Get user info
      const info = await client.getUserInfo('admin-token');
      expect(info.name).toBe('Admin User');

      // Check permissions
      expect(client.hasScope('admin-token', 'write:all')).resolves.toBe(true);
      expect(client.hasRole('admin-token', 'admin')).resolves.toBe(true);
      expect(client.hasRole('admin-token', 'superadmin')).resolves.toBe(false);
    });
  });
});
