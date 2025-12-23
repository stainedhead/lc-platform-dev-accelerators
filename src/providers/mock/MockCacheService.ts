/**
 * Mock Cache Service Implementation
 * In-memory implementation of CacheService for testing
 */

import type { CacheService } from '../../core/services/CacheService';
import type {
  CacheCluster,
  CacheClusterOptions,
  CacheClusterUpdateParams,
  CacheSecurityConfig,
  ClusterStatus,
} from '../../core/types/cache';
import { ResourceNotFoundError } from '../../core/types/common';

interface CacheEntry {
  value: string;
  expiresAt?: Date;
}

interface ClusterData {
  cluster: CacheCluster;
  options: CacheClusterOptions;
  data: Map<string, CacheEntry>;
  securityConfig: CacheSecurityConfig;
}

export class MockCacheService implements CacheService {
  private clusters = new Map<string, ClusterData>();
  private clusterCounter = 1;
  public static clusterDataStore = new Map<string, Map<string, CacheEntry>>();

  async createCluster(name: string, options: CacheClusterOptions = {}): Promise<CacheCluster> {
    if (this.clusters.has(name)) {
      throw new Error(`Cache cluster ${name} already exists`);
    }

    const clusterId = `mock-cluster-${this.clusterCounter++}`;
    const endpoint = `mock-redis-${name}.cache.local`;
    const port = options.port ?? 6379;

    const cluster: CacheCluster = {
      name,
      clusterId,
      endpoint,
      port,
      status: 'creating' as ClusterStatus,
      nodeType: options.nodeType ?? 'cache.t3.micro',
      numNodes: options.numNodes ?? 1,
      engine: 'redis',
      engineVersion: options.engineVersion ?? '7.0',
      created: new Date(),
      securityEnabled: options.authTokenEnabled ?? false,
    };

    const data = new Map<string, CacheEntry>();
    MockCacheService.clusterDataStore.set(name, data);

    this.clusters.set(name, {
      cluster,
      options,
      data,
      securityConfig: {},
    });

    setTimeout(() => {
      const clusterData = this.clusters.get(name);
      if (clusterData) {
        clusterData.cluster.status = 'available' as ClusterStatus;
      }
    }, 100);

    return cluster;
  }

  async getCluster(clusterId: string): Promise<CacheCluster> {
    for (const [name, data] of this.clusters.entries()) {
      if (data.cluster.clusterId === clusterId || name === clusterId) {
        return data.cluster;
      }
    }

    throw new ResourceNotFoundError('CacheCluster', clusterId);
  }

  async deleteCluster(clusterId: string): Promise<void> {
    let found = false;
    let nameToDelete: string | undefined;

    for (const [name, data] of this.clusters.entries()) {
      if (data.cluster.clusterId === clusterId || name === clusterId) {
        found = true;
        nameToDelete = name;
        break;
      }
    }

    if (!found || !nameToDelete) {
      throw new ResourceNotFoundError('CacheCluster', clusterId);
    }

    this.clusters.delete(nameToDelete);
    MockCacheService.clusterDataStore.delete(nameToDelete);
  }

  async listClusters(): Promise<CacheCluster[]> {
    return Array.from(this.clusters.values()).map((data) => data.cluster);
  }

  async updateCluster(clusterId: string, params: CacheClusterUpdateParams): Promise<CacheCluster> {
    let clusterData: ClusterData | undefined;

    for (const [_name, data] of this.clusters.entries()) {
      if (data.cluster.clusterId === clusterId || _name === clusterId) {
        clusterData = data;
        break;
      }
    }

    if (!clusterData) {
      throw new ResourceNotFoundError('CacheCluster', clusterId);
    }

    clusterData.cluster.status = 'modifying' as ClusterStatus;

    if (params.nodeType) {
      clusterData.cluster.nodeType = params.nodeType;
    }
    if (params.numNodes) {
      clusterData.cluster.numNodes = params.numNodes;
    }
    if (params.engineVersion) {
      clusterData.cluster.engineVersion = params.engineVersion;
    }
    if (params.securityGroups) {
      clusterData.options.securityGroups = params.securityGroups;
    }
    if (params.maintenanceWindow) {
      clusterData.options.maintenanceWindow = params.maintenanceWindow;
    }
    if (params.snapshotRetentionDays !== undefined) {
      clusterData.options.snapshotRetentionDays = params.snapshotRetentionDays;
    }

    setTimeout(() => {
      if (clusterData) {
        clusterData.cluster.status = 'available' as ClusterStatus;
      }
    }, 100);

    return clusterData.cluster;
  }

  async configureSecurity(clusterId: string, config: CacheSecurityConfig): Promise<void> {
    let clusterData: ClusterData | undefined;

    for (const [_name, data] of this.clusters.entries()) {
      if (data.cluster.clusterId === clusterId || _name === clusterId) {
        clusterData = data;
        break;
      }
    }

    if (!clusterData) {
      throw new ResourceNotFoundError('CacheCluster', clusterId);
    }

    clusterData.securityConfig = { ...clusterData.securityConfig, ...config };

    if (config.authToken ?? config.encryptionAtRest ?? config.encryptionInTransit) {
      clusterData.cluster.securityEnabled = true;
    }
  }

  async flushCluster(clusterId: string): Promise<void> {
    let clusterData: ClusterData | undefined;
    let nameToFlush: string | undefined;

    for (const [name, data] of this.clusters.entries()) {
      if (data.cluster.clusterId === clusterId || name === clusterId) {
        clusterData = data;
        nameToFlush = name;
        break;
      }
    }

    if (!clusterData || !nameToFlush) {
      throw new ResourceNotFoundError('CacheCluster', clusterId);
    }

    clusterData.data.clear();
    const sharedData = MockCacheService.clusterDataStore.get(nameToFlush);
    if (sharedData) {
      sharedData.clear();
    }
  }
}
