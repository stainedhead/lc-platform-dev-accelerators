/**
 * Mock Container Repository Service Implementation
 * In-memory implementation of ContainerRepoService for testing
 */

import type { ContainerRepoService } from '../../core/services/ContainerRepoService';
import type {
  ContainerRepository,
  ContainerRepositoryOptions,
  LifecyclePolicy,
  ImageScanConfig,
  RepositoryPermission,
  ContainerImageDetail,
} from '../../core/types/container';
import { ResourceNotFoundError, ValidationError } from '../../core/types/common';

interface RepositoryData {
  repo: ContainerRepository;
  options: ContainerRepositoryOptions;
  lifecyclePolicy?: LifecyclePolicy;
  permissions: RepositoryPermission[];
  images: Map<string, ContainerImageDetail>;
}

export class MockContainerRepoService implements ContainerRepoService {
  private repositories = new Map<string, RepositoryData>();
  public static repositoryDataStore = new Map<string, Map<string, ContainerImageDetail>>();

  async createRepository(
    name: string,
    options: ContainerRepositoryOptions = {}
  ): Promise<ContainerRepository> {
    if (this.repositories.has(name)) {
      throw new Error(`Repository ${name} already exists`);
    }

    const repo: ContainerRepository = {
      name,
      repositoryArn: `arn:aws:ecr:mock:123456789:repository/${name}`,
      repositoryUri: `123456789.dkr.ecr.mock.amazonaws.com/${name}`,
      created: new Date(),
      imageCount: 0,
      imageScanningEnabled: options.imageScanOnPush ?? false,
      encryptionEnabled: options.encryptionType !== undefined,
    };

    const images = new Map<string, ContainerImageDetail>();
    MockContainerRepoService.repositoryDataStore.set(name, images);

    this.repositories.set(name, {
      repo,
      options,
      permissions: [],
      images,
    });

    return repo;
  }

  async getRepository(repositoryName: string): Promise<ContainerRepository> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    return data.repo;
  }

  async deleteRepository(repositoryName: string, force: boolean = false): Promise<void> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    if (data.images.size > 0 && !force) {
      throw new ValidationError(
        'Repository contains images. Use force=true to delete with images.'
      );
    }

    this.repositories.delete(repositoryName);
    MockContainerRepoService.repositoryDataStore.delete(repositoryName);
  }

  async listRepositories(): Promise<ContainerRepository[]> {
    return Array.from(this.repositories.values()).map((data) => data.repo);
  }

  async setLifecyclePolicy(repositoryName: string, policy: LifecyclePolicy): Promise<void> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    data.lifecyclePolicy = policy;
  }

  async getLifecyclePolicy(repositoryName: string): Promise<LifecyclePolicy> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    if (!data.lifecyclePolicy) {
      throw new ResourceNotFoundError('LifecyclePolicy', repositoryName);
    }

    return data.lifecyclePolicy;
  }

  async deleteLifecyclePolicy(repositoryName: string): Promise<void> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    delete data.lifecyclePolicy;
  }

  async configureImageScanning(repositoryName: string, config: ImageScanConfig): Promise<void> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    data.repo.imageScanningEnabled = config.scanOnPush;
  }

  async setPermissions(repositoryName: string, permissions: RepositoryPermission[]): Promise<void> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    data.permissions = permissions;
  }

  async getPermissions(repositoryName: string): Promise<RepositoryPermission[]> {
    const data = this.repositories.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }

    return data.permissions;
  }
}
