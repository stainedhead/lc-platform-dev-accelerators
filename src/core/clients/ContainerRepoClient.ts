/**
 * ContainerRepoClient Interface - Data Plane
 *
 * Runtime interface for container image operations in hosted applications.
 * Provides image query and management operations without repository creation.
 *
 * Constitution Principle I: Provider Independence
 */

import type { ContainerImage, ContainerImageDetail, ImageListOptions } from '../types/container';
import type { BatchDeleteImagesResult } from '../types/runtime';

export interface ContainerRepoClient {
  /**
   * Get repository URI for Docker push/pull
   * @param repositoryName - Repository name
   * @returns Repository URI (e.g., "123456789.dkr.ecr.us-east-1.amazonaws.com/my-repo")
   */
  getRepositoryUri(repositoryName: string): Promise<string>;

  /**
   * List images in a repository
   * @param repositoryName - Repository name
   * @param options - Optional filtering and pagination
   * @returns Array of image summaries
   */
  listImages(repositoryName: string, options?: ImageListOptions): Promise<ContainerImage[]>;

  /**
   * Get detailed information about an image
   * @param repositoryName - Repository name
   * @param imageTag - Image tag (e.g., "latest", "v1.0.0")
   * @returns Detailed image information
   */
  getImageByTag(repositoryName: string, imageTag: string): Promise<ContainerImageDetail>;

  /**
   * Get detailed information about an image by digest
   * @param repositoryName - Repository name
   * @param imageDigest - Image digest (sha256:...)
   * @returns Detailed image information
   */
  getImageByDigest(repositoryName: string, imageDigest: string): Promise<ContainerImageDetail>;

  /**
   * Check if an image exists by tag
   * @param repositoryName - Repository name
   * @param imageTag - Image tag
   * @returns True if image exists, false otherwise
   */
  imageExists(repositoryName: string, imageTag: string): Promise<boolean>;

  /**
   * Delete an image by tag
   * @param repositoryName - Repository name
   * @param imageTag - Image tag
   * @returns True if deleted, false if not found
   */
  deleteImageByTag(repositoryName: string, imageTag: string): Promise<boolean>;

  /**
   * Delete an image by digest
   * @param repositoryName - Repository name
   * @param imageDigest - Image digest
   * @returns True if deleted, false if not found
   */
  deleteImageByDigest(repositoryName: string, imageDigest: string): Promise<boolean>;

  /**
   * Delete multiple images
   * @param repositoryName - Repository name
   * @param imageIdentifiers - Array of tags or digests to delete
   * @returns Result with successful and failed deletions
   */
  deleteImages(
    repositoryName: string,
    imageIdentifiers: string[]
  ): Promise<BatchDeleteImagesResult>;
}
