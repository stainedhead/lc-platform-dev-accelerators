/**
 * Unit tests for Application types
 *
 * Following TDD: These tests are written FIRST and should FAIL before implementation
 */

import { describe, test, expect } from 'bun:test';
import { PlatformType, Environment, LCPlatformApp } from '../../../../src/core/types/application';

describe('PlatformType enum', () => {
  test('should have all expected platform types', () => {
    expect(PlatformType.WEB).toBe('web' as PlatformType);
    expect(PlatformType.FUNCTION).toBe('function' as PlatformType);
    expect(PlatformType.BATCH).toBe('batch' as PlatformType);
    expect(PlatformType.MOBILE).toBe('mobile' as PlatformType);
    expect(PlatformType.API).toBe('api' as PlatformType);
  });
});

describe('Environment enum', () => {
  test('should have all expected environments', () => {
    expect(Environment.DEVELOPMENT).toBe('dev' as Environment);
    expect(Environment.STAGING).toBe('staging' as Environment);
    expect(Environment.PRODUCTION).toBe('prod' as Environment);
    expect(Environment.TEST).toBe('test' as Environment);
  });
});

describe('LCPlatformApp class', () => {
  test('should create app with valid data', () => {
    const app = new LCPlatformApp({
      name: 'My Application',
      team: 'platform-team',
      moniker: 'myapp',
      ciAppId: 'APP-12345',
      platformType: PlatformType.WEB,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@example.com',
      ownerEmail: 'owner@example.com',
    });

    expect(app.name).toBe('My Application');
    expect(app.team).toBe('platform-team');
    expect(app.moniker).toBe('myapp');
    expect(app.id).toMatch(/^app-[a-f0-9]{8}$/);
  });

  test('should validate email format', () => {
    expect(() => {
      new LCPlatformApp({
        name: 'My Application',
        team: 'platform-team',
        moniker: 'myapp',
        ciAppId: 'APP-12345',
        platformType: PlatformType.WEB,
        environment: Environment.PRODUCTION,
        supportEmail: 'invalid-email',
        ownerEmail: 'owner@example.com',
      });
    }).toThrow(/invalid.*email/i);
  });

  test('should validate moniker format (lowercase alphanumeric + hyphens)', () => {
    expect(() => {
      new LCPlatformApp({
        name: 'My Application',
        team: 'platform-team',
        moniker: 'MyApp_Invalid',
        ciAppId: 'APP-12345',
        platformType: PlatformType.WEB,
        environment: Environment.PRODUCTION,
        supportEmail: 'support@example.com',
        ownerEmail: 'owner@example.com',
      });
    }).toThrow(/invalid moniker/i);
  });

  test('should generate resource tags from metadata', () => {
    const app = new LCPlatformApp({
      name: 'My Application',
      team: 'platform-team',
      moniker: 'myapp',
      ciAppId: 'APP-12345',
      platformType: PlatformType.WEB,
      environment: Environment.PRODUCTION,
      supportEmail: 'support@example.com',
      ownerEmail: 'owner@example.com',
    });

    const tags = app.toResourceTags();
    expect(tags).toEqual({
      Team: 'platform-team',
      Moniker: 'myapp',
      'CI-AppID': 'APP-12345',
      PlatformType: 'web',
      Environment: 'prod',
      SupportEmail: 'support@example.com',
      OwnerEmail: 'owner@example.com',
    });
  });
});
