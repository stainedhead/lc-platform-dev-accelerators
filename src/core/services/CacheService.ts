/**
 * Cache Service Interface
 * Provides cloud-agnostic distributed caching capabilities
 * Service: AWS ElastiCache for Redis / Azure Cache for Redis
 */

import type {
  CacheCluster,
  CacheClusterOptions,
  CacheClusterUpdateParams,
  CacheSecurityConfig,
} from '../types/cache';

export interface CacheService {
  /**
   * Create a new cache cluster
   * @param name Cluster name
   * @param options Optional cluster configuration
   * @returns The created cache cluster details
   */
  createCluster(name: string, options?: CacheClusterOptions): Promise<CacheCluster>;

  /**
   * Get details about a specific cache cluster
   * @param clusterId Cluster identifier or name
   * @returns Cluster details including status and endpoints
   */
  getCluster(clusterId: string): Promise<CacheCluster>;

  /**
   * Delete a cache cluster and all its data
   * @param clusterId Cluster identifier or name
   */
  deleteCluster(clusterId: string): Promise<void>;

  /**
   * List all cache clusters
   * @returns Array of cache cluster details
   */
  listClusters(): Promise<CacheCluster[]>;

  /**
   * Update cluster configuration
   * @param clusterId Cluster identifier or name
   * @param params Update parameters
   * @returns Updated cluster details
   */
  updateCluster(clusterId: string, params: CacheClusterUpdateParams): Promise<CacheCluster>;

  /**
   * Configure cluster security settings
   * @param clusterId Cluster identifier or name
   * @param config Security configuration
   */
  configureSecurity(clusterId: string, config: CacheSecurityConfig): Promise<void>;

  /**
   * Flush all data from a cache cluster
   * @param clusterId Cluster identifier or name
   */
  flushCluster(clusterId: string): Promise<void>;
}
