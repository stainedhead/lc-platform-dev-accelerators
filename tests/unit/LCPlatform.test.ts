/**
 * Integration tests for LCPlatform class
 *
 * Tests the main entry point with Mock provider
 */

import { describe, it, expect } from 'bun:test';
import { LCPlatform } from '../../src/LCPlatform';
import { ProviderType } from '../../src/core/types/common';
import { ClusterStatus } from '../../src/core/types/cache';

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

  it('should get CacheService', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const service = platform.getCache();
    expect(service).toBeDefined();
  });

  it('should create and manage cache cluster end-to-end', async () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const cache = platform.getCache();

    const cluster = await cache.createCluster('test-cluster', {
      nodeType: 'cache.t3.micro',
      numNodes: 1,
    });

    expect(cluster).toBeDefined();
    expect(cluster.name).toBe('test-cluster');
    expect(cluster.nodeType).toBe('cache.t3.micro');

    // Wait for cluster to be available
    await new Promise((resolve) => setTimeout(resolve, 150));

    const retrieved = await cache.getCluster(cluster.clusterId);
    expect(retrieved.status).toBe(ClusterStatus.AVAILABLE);

    await cache.deleteCluster(cluster.clusterId);
  });

  it('should get ContainerRepoService', () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const service = platform.getContainerRepo();
    expect(service).toBeDefined();
  });

  it('should create and manage container repository end-to-end', async () => {
    const platform = new LCPlatform({ provider: ProviderType.MOCK });
    const repo = platform.getContainerRepo();

    const repository = await repo.createRepository('test-repo', {
      imageScanOnPush: true,
    });

    expect(repository).toBeDefined();
    expect(repository.name).toBe('test-repo');
    expect(repository.imageScanningEnabled).toBe(true);
    expect(repository.repositoryUri).toContain('test-repo');

    const retrieved = await repo.getRepository('test-repo');
    expect(retrieved.name).toBe('test-repo');

    await repo.deleteRepository('test-repo');
  });
});
