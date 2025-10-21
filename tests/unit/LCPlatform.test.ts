/**
 * Integration tests for LCPlatform class
 *
 * Tests the main entry point with Mock provider
 */

import { describe, it, expect } from 'bun:test';
import { LCPlatform } from '../../src/LCPlatform';
import { ProviderType } from '../../src/core/types/common';

describe('LCPlatform', () => {
  it('should create instance with Mock provider', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    expect(platform).toBeDefined();
    expect(platform.getConfig().provider).toBe(ProviderType.MOCK);
  });

  it('should get WebHostingService', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const service = platform.getWebHosting();
    expect(service).toBeDefined();
  });

  it('should get DataStoreService', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const service = platform.getDataStore();
    expect(service).toBeDefined();
  });

  it('should get ObjectStoreService', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const service = platform.getObjectStore();
    expect(service).toBeDefined();
  });

  it('should deploy an application end-to-end', async () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const hosting = platform.getWebHosting();

    const deployment = await hosting.deployApplication({
      name: 'test-app',
      image: 'nginx:latest',
      port: 80,
      environment: { ENV: 'test' },
    });

    expect(deployment).toBeDefined();
    expect(deployment.name).toBe('test-app');
    expect(deployment.image).toBe('nginx:latest');
    expect(deployment.url).toContain('test-app');
  });

  it('should store and retrieve object end-to-end', async () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const storage = platform.getObjectStore();

    await storage.createBucket('test-bucket');
    await storage.putObject('test-bucket', 'file.txt', Buffer.from('Hello!'));

    const obj = await storage.getObject('test-bucket', 'file.txt');
    expect(obj.data).toEqual(Buffer.from('Hello!'));
  });

  it('should execute database query end-to-end', async () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const db = platform.getDataStore();

    await db.connect();
    const result = await db.execute('INSERT INTO users VALUES (?)', ['test-user']);
    expect(result.rowsAffected).toBeGreaterThan(0);
  });
});
