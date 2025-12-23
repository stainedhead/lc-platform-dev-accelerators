/**
 * Container Repository Service Interface
 * Provides cloud-agnostic container image registry capabilities
 * Service: AWS ECR / Azure Container Registry
 */

import type {
  ContainerRepository,
  ContainerRepositoryOptions,
  LifecyclePolicy,
  ImageScanConfig,
  RepositoryPermission,
} from '../types/container';

export interface ContainerRepoService {
  /**
   * Create a new container repository
   * @param name Repository name
   * @param options Optional repository configuration
   * @returns The created repository details
   */
  createRepository(
    name: string,
    options?: ContainerRepositoryOptions
  ): Promise<ContainerRepository>;

  /**
   * Get details about a specific repository
   * @param repositoryName Repository name
   * @returns Repository details including URI
   */
  getRepository(repositoryName: string): Promise<ContainerRepository>;

  /**
   * Delete a repository and all its images
   * @param repositoryName Repository name
   * @param force Force deletion even if repository contains images
   */
  deleteRepository(repositoryName: string, force?: boolean): Promise<void>;

  /**
   * List all repositories
   * @returns Array of repository details
   */
  listRepositories(): Promise<ContainerRepository[]>;

  /**
   * Set lifecycle policy for automatic image cleanup
   * @param repositoryName Repository name
   * @param policy Lifecycle policy configuration
   */
  setLifecyclePolicy(repositoryName: string, policy: LifecyclePolicy): Promise<void>;

  /**
   * Get lifecycle policy for a repository
   * @param repositoryName Repository name
   * @returns Current lifecycle policy
   */
  getLifecyclePolicy(repositoryName: string): Promise<LifecyclePolicy>;

  /**
   * Delete lifecycle policy from a repository
   * @param repositoryName Repository name
   */
  deleteLifecyclePolicy(repositoryName: string): Promise<void>;

  /**
   * Configure image scanning
   * @param repositoryName Repository name
   * @param config Scan configuration
   */
  configureImageScanning(repositoryName: string, config: ImageScanConfig): Promise<void>;

  /**
   * Set repository permissions
   * @param repositoryName Repository name
   * @param permissions Array of permission grants
   */
  setPermissions(repositoryName: string, permissions: RepositoryPermission[]): Promise<void>;

  /**
   * Get repository permissions
   * @param repositoryName Repository name
   * @returns Array of permission grants
   */
  getPermissions(repositoryName: string): Promise<RepositoryPermission[]>;
}
