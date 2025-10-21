/**
 * Unit tests for MockAuthenticationService
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { MockAuthenticationService } from '../../../../src/providers/mock/MockAuthenticationService';

describe('MockAuthenticationService', () => {
  let service: MockAuthenticationService;

  beforeEach(async () => {
    service = new MockAuthenticationService();
    await service.configure({
      provider: 'auth0',
      domain: 'test.auth0.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['openid', 'email', 'profile'],
    });
  });

  it('should generate authorization URL', async () => {
    const url = await service.getAuthorizationUrl(
      'https://example.com/callback',
      ['openid', 'email'],
      'random-state'
    );

    expect(url).toContain('test.auth0.com/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    expect(url).toContain('scope=openid+email');
    expect(url).toContain('state=random-state');
  });

  it('should throw when not configured', async () => {
    const unconfiguredService = new MockAuthenticationService();

    await expect(
      unconfiguredService.getAuthorizationUrl('https://example.com/callback')
    ).rejects.toThrow();
  });
});
