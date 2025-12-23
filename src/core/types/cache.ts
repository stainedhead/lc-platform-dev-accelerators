/**
 * Cache Types - Distributed Caching
 * Cloud-agnostic types for cache cluster management
 */

export interface CacheCluster {
  name: string;
  clusterId: string;
  endpoint: string;
  port: number;
  status: ClusterStatus;
  nodeType: string;
  numNodes: number;
  engine: string;
  engineVersion: string;
  created: Date;
  securityEnabled: boolean;
}

export enum ClusterStatus {
  CREATING = 'creating',
  AVAILABLE = 'available',
  MODIFYING = 'modifying',
  DELETING = 'deleting',
  DELETED = 'deleted',
  FAILED = 'failed',
}

export interface CacheClusterOptions {
  nodeType?: string;
  numNodes?: number;
  port?: number;
  engineVersion?: string;
  subnetGroup?: string;
  securityGroups?: string[];
  enableBackups?: boolean;
  snapshotRetentionDays?: number;
  maintenanceWindow?: string;
  enableEncryption?: boolean;
  authTokenEnabled?: boolean;
  tags?: Record<string, string>;
}

export interface CacheClusterUpdateParams {
  nodeType?: string;
  numNodes?: number;
  engineVersion?: string;
  securityGroups?: string[];
  maintenanceWindow?: string;
  snapshotRetentionDays?: number;
}

export interface CacheSecurityConfig {
  authToken?: string;
  securityGroupIds?: string[];
  encryptionAtRest?: boolean;
  encryptionInTransit?: boolean;
}
