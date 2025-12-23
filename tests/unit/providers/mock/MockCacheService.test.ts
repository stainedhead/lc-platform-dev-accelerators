/**
 * Unit Tests for MockCacheService
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockCacheService } from '../../../../src/providers/mock/MockCacheService';
import { ResourceNotFoundError } from '../../../../src/core/types/common';
import type { ClusterStatus } from '../../../../src/core/types/cache';

describe('MockCacheService', () => {
  let service: MockCacheService;

  beforeEach(() => {
    service = new MockCacheService();
  });

  describe('createCluster', () => {
    test('should create a cluster with default options', async () => {
      const cluster = await service.createCluster('test-cluster');

      expect(cluster.name).toBe('test-cluster');
      expect(cluster.clusterId).toMatch(/^mock-cluster-\d+$/);
      expect(cluster.endpoint).toBe('mock-redis-test-cluster.cache.local');
      expect(cluster.port).toBe(6379);
      expect(cluster.status).toBe('creating' as ClusterStatus);
      expect(cluster.nodeType).toBe('cache.t3.micro');
      expect(cluster.numNodes).toBe(1);
      expect(cluster.engine).toBe('redis');
      expect(cluster.engineVersion).toBe('7.0');
      expect(cluster.created).toBeInstanceOf(Date);
      expect(cluster.securityEnabled).toBe(false);
    });

    test('should create a cluster with custom options', async () => {
      const cluster = await service.createCluster('custom-cluster', {
        nodeType: 'cache.r6g.large',
        numNodes: 3,
        engineVersion: '7.1',
        port: 6380,
        authTokenEnabled: true,
      });

      expect(cluster.name).toBe('custom-cluster');
      expect(cluster.nodeType).toBe('cache.r6g.large');
      expect(cluster.numNodes).toBe(3);
      expect(cluster.engineVersion).toBe('7.1');
      expect(cluster.port).toBe(6380);
      expect(cluster.securityEnabled).toBe(true);
    });

    test('should throw error when creating duplicate cluster', async () => {
      await service.createCluster('duplicate-cluster');
      expect(service.createCluster('duplicate-cluster')).rejects.toThrow('already exists');
    });

    test('should transition to available status', async () => {
      const cluster = await service.createCluster('status-cluster');
      expect(cluster.status).toBe('creating' as ClusterStatus);

      // Wait for status transition
      await new Promise((resolve) => setTimeout(resolve, 150));

      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.status).toBe('available' as ClusterStatus);
    });
  });

  describe('getCluster', () => {
    test('should get cluster by clusterId', async () => {
      const created = await service.createCluster('get-cluster');
      const retrieved = await service.getCluster(created.clusterId);

      expect(retrieved.name).toBe('get-cluster');
      expect(retrieved.clusterId).toBe(created.clusterId);
    });

    test('should get cluster by name', async () => {
      const created = await service.createCluster('get-by-name');
      const retrieved = await service.getCluster('get-by-name');

      expect(retrieved.clusterId).toBe(created.clusterId);
    });

    test('should throw error for non-existent cluster', async () => {
      expect(service.getCluster('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('deleteCluster', () => {
    test('should delete cluster by clusterId', async () => {
      const cluster = await service.createCluster('delete-cluster');
      await service.deleteCluster(cluster.clusterId);

      expect(service.getCluster(cluster.clusterId)).rejects.toThrow(ResourceNotFoundError);
    });

    test('should delete cluster by name', async () => {
      await service.createCluster('delete-by-name');
      await service.deleteCluster('delete-by-name');

      expect(service.getCluster('delete-by-name')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should throw error when deleting non-existent cluster', async () => {
      expect(service.deleteCluster('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should clear cluster data from shared store', async () => {
      const cluster = await service.createCluster('data-cluster');
      MockCacheService.clusterDataStore.get('data-cluster')?.set('key1', {
        value: 'value1',
      });

      await service.deleteCluster(cluster.clusterId);

      expect(MockCacheService.clusterDataStore.has('data-cluster')).toBe(false);
    });
  });

  describe('listClusters', () => {
    test('should return empty array when no clusters exist', async () => {
      const clusters = await service.listClusters();
      expect(clusters).toEqual([]);
    });

    test('should list all clusters', async () => {
      await service.createCluster('cluster-1');
      await service.createCluster('cluster-2');
      await service.createCluster('cluster-3');

      const clusters = await service.listClusters();
      expect(clusters.length).toBe(3);
      expect(clusters.map((c) => c.name)).toContain('cluster-1');
      expect(clusters.map((c) => c.name)).toContain('cluster-2');
      expect(clusters.map((c) => c.name)).toContain('cluster-3');
    });
  });

  describe('updateCluster', () => {
    test('should update cluster node type', async () => {
      const cluster = await service.createCluster('update-cluster');
      const updated = await service.updateCluster(cluster.clusterId, {
        nodeType: 'cache.r6g.xlarge',
      });

      expect(updated.nodeType).toBe('cache.r6g.xlarge');
      expect(updated.status).toBe('modifying' as ClusterStatus);
    });

    test('should update cluster num nodes', async () => {
      const cluster = await service.createCluster('scale-cluster');
      const updated = await service.updateCluster(cluster.clusterId, {
        numNodes: 5,
      });

      expect(updated.numNodes).toBe(5);
    });

    test('should update engine version', async () => {
      const cluster = await service.createCluster('version-cluster');
      const updated = await service.updateCluster(cluster.clusterId, {
        engineVersion: '7.2',
      });

      expect(updated.engineVersion).toBe('7.2');
    });

    test('should update security groups', async () => {
      const cluster = await service.createCluster('security-cluster');
      const updated = await service.updateCluster(cluster.clusterId, {
        securityGroups: ['sg-123', 'sg-456'],
      });

      expect(updated.status).toBe('modifying' as ClusterStatus);
    });

    test('should update maintenance window', async () => {
      const cluster = await service.createCluster('maintenance-cluster');
      await service.updateCluster(cluster.clusterId, {
        maintenanceWindow: 'sun:05:00-sun:09:00',
      });

      expect(cluster).toBeDefined();
    });

    test('should transition back to available status', async () => {
      const cluster = await service.createCluster('transition-cluster');
      await new Promise((resolve) => setTimeout(resolve, 150));

      const updated = await service.updateCluster(cluster.clusterId, {
        nodeType: 'cache.r6g.large',
      });
      expect(updated.status).toBe('modifying' as ClusterStatus);

      await new Promise((resolve) => setTimeout(resolve, 150));
      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.status).toBe('available' as ClusterStatus);
    });

    test('should throw error for non-existent cluster', async () => {
      expect(service.updateCluster('non-existent', { nodeType: 'cache.t3.small' })).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('configureSecurity', () => {
    test('should configure auth token', async () => {
      const cluster = await service.createCluster('auth-cluster');
      await service.configureSecurity(cluster.clusterId, {
        authToken: 'my-secret-token',
      });

      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.securityEnabled).toBe(true);
    });

    test('should configure encryption at rest', async () => {
      const cluster = await service.createCluster('encrypt-cluster');
      await service.configureSecurity(cluster.clusterId, {
        encryptionAtRest: true,
      });

      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.securityEnabled).toBe(true);
    });

    test('should configure encryption in transit', async () => {
      const cluster = await service.createCluster('transit-cluster');
      await service.configureSecurity(cluster.clusterId, {
        encryptionInTransit: true,
      });

      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.securityEnabled).toBe(true);
    });

    test('should configure all security options', async () => {
      const cluster = await service.createCluster('full-security-cluster');
      await service.configureSecurity(cluster.clusterId, {
        authToken: 'token',
        encryptionAtRest: true,
        encryptionInTransit: true,
      });

      const retrieved = await service.getCluster(cluster.clusterId);
      expect(retrieved.securityEnabled).toBe(true);
    });

    test('should throw error for non-existent cluster', async () => {
      expect(service.configureSecurity('non-existent', { authToken: 'token' })).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('flushCluster', () => {
    test('should clear all data from cluster', async () => {
      const cluster = await service.createCluster('flush-cluster');
      const data = MockCacheService.clusterDataStore.get('flush-cluster');
      data?.set('key1', { value: 'value1' });
      data?.set('key2', { value: 'value2' });

      await service.flushCluster(cluster.clusterId);

      expect(data?.size).toBe(0);
    });

    test('should clear data from shared store', async () => {
      const cluster = await service.createCluster('shared-flush-cluster');
      MockCacheService.clusterDataStore.get('shared-flush-cluster')?.set('key', {
        value: 'val',
      });

      await service.flushCluster(cluster.clusterId);

      const sharedData = MockCacheService.clusterDataStore.get('shared-flush-cluster');
      expect(sharedData?.size).toBe(0);
    });

    test('should throw error for non-existent cluster', async () => {
      expect(service.flushCluster('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
