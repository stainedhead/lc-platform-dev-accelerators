/**
 * Unit Tests for MockContainerRepoService
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockContainerRepoService } from '../../../../src/providers/mock/MockContainerRepoService';
import { ResourceNotFoundError, ValidationError } from '../../../../src/core/types/common';
import {
  EncryptionType,
  RepositoryAction,
  TagStatus,
  CountType,
} from '../../../../src/core/types/container';

describe('MockContainerRepoService', () => {
  let service: MockContainerRepoService;

  beforeEach(() => {
    service = new MockContainerRepoService();
  });

  describe('createRepository', () => {
    test('should create a repository with default options', async () => {
      const repo = await service.createRepository('test-repo');

      expect(repo.name).toBe('test-repo');
      expect(repo.repositoryArn).toBe('arn:aws:ecr:mock:123456789:repository/test-repo');
      expect(repo.repositoryUri).toBe('123456789.dkr.ecr.mock.amazonaws.com/test-repo');
      expect(repo.imageCount).toBe(0);
      expect(repo.imageScanningEnabled).toBe(false);
      expect(repo.encryptionEnabled).toBe(false);
      expect(repo.created).toBeInstanceOf(Date);
    });

    test('should create a repository with custom options', async () => {
      const repo = await service.createRepository('custom-repo', {
        imageScanOnPush: true,
        encryptionType: EncryptionType.AES256,
        tags: { environment: 'production', team: 'platform' },
      });

      expect(repo.name).toBe('custom-repo');
      expect(repo.imageScanningEnabled).toBe(true);
      expect(repo.encryptionEnabled).toBe(true);
    });

    test('should throw error when creating duplicate repository', async () => {
      await service.createRepository('duplicate-repo');
      expect(service.createRepository('duplicate-repo')).rejects.toThrow('already exists');
    });

    test('should initialize empty images map', async () => {
      await service.createRepository('empty-repo');
      const images = MockContainerRepoService.repositoryDataStore.get('empty-repo');
      expect(images).toBeDefined();
      expect(images?.size).toBe(0);
    });
  });

  describe('getRepository', () => {
    test('should get repository details', async () => {
      const created = await service.createRepository('get-repo');
      const retrieved = await service.getRepository('get-repo');

      expect(retrieved.name).toBe('get-repo');
      expect(retrieved.repositoryArn).toBe(created.repositoryArn);
      expect(retrieved.repositoryUri).toBe(created.repositoryUri);
    });

    test('should throw error for non-existent repository', async () => {
      expect(service.getRepository('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('deleteRepository', () => {
    test('should delete empty repository', async () => {
      await service.createRepository('delete-repo');
      await service.deleteRepository('delete-repo');

      expect(service.getRepository('delete-repo')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should throw error when deleting repository with images without force', async () => {
      await service.createRepository('repo-with-images');
      const images = MockContainerRepoService.repositoryDataStore.get('repo-with-images');
      images?.set('sha256:abc123', {
        repositoryName: 'repo-with-images',
        imageDigest: 'sha256:abc123',
        imageTags: ['latest'],
        imageSizeInBytes: 1000000,
        imagePushedAt: new Date(),
        registryId: '123456789',
      });

      expect(service.deleteRepository('repo-with-images', false)).rejects.toThrow(ValidationError);
    });

    test('should force delete repository with images', async () => {
      await service.createRepository('force-delete-repo');
      const images = MockContainerRepoService.repositoryDataStore.get('force-delete-repo');
      images?.set('sha256:xyz789', {
        repositoryName: 'force-delete-repo',
        imageDigest: 'sha256:xyz789',
        imageTags: ['v1.0'],
        imageSizeInBytes: 2000000,
        imagePushedAt: new Date(),
        registryId: '123456789',
      });

      await service.deleteRepository('force-delete-repo', true);
      expect(service.getRepository('force-delete-repo')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should remove repository from shared store', async () => {
      await service.createRepository('shared-delete-repo');
      await service.deleteRepository('shared-delete-repo');

      expect(MockContainerRepoService.repositoryDataStore.has('shared-delete-repo')).toBe(false);
    });

    test('should throw error for non-existent repository', async () => {
      expect(service.deleteRepository('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('listRepositories', () => {
    test('should return empty array when no repositories exist', async () => {
      const repos = await service.listRepositories();
      expect(repos).toEqual([]);
    });

    test('should list all repositories', async () => {
      await service.createRepository('repo-1');
      await service.createRepository('repo-2');
      await service.createRepository('repo-3');

      const repos = await service.listRepositories();
      expect(repos.length).toBe(3);
      expect(repos.map((r) => r.name)).toContain('repo-1');
      expect(repos.map((r) => r.name)).toContain('repo-2');
      expect(repos.map((r) => r.name)).toContain('repo-3');
    });
  });

  describe('lifecycle policy management', () => {
    test('should set lifecycle policy', async () => {
      await service.createRepository('policy-repo');

      const policy = {
        rules: [
          {
            rulePriority: 1,
            description: 'Remove old untagged images',
            selection: {
              tagStatus: 'untagged' as TagStatus,
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 10,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('policy-repo', policy);

      const retrieved = await service.getLifecyclePolicy('policy-repo');
      expect(retrieved).toEqual(policy);
    });

    test('should get lifecycle policy', async () => {
      await service.createRepository('get-policy-repo');

      const policy = {
        rules: [
          {
            rulePriority: 1,
            selection: {
              tagStatus: 'tagged' as TagStatus,
              tagPrefixList: ['v'],
              countType: 'sinceImagePushed' as CountType,
              countNumber: 30,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('get-policy-repo', policy);
      const retrieved = await service.getLifecyclePolicy('get-policy-repo');

      expect(retrieved.rules.length).toBe(1);
      expect(retrieved.rules[0]?.rulePriority).toBe(1);
    });

    test('should throw error when getting policy for non-existent repository', async () => {
      expect(service.getLifecyclePolicy('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should throw error when getting non-existent policy', async () => {
      await service.createRepository('no-policy-repo');
      expect(service.getLifecyclePolicy('no-policy-repo')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should delete lifecycle policy', async () => {
      await service.createRepository('delete-policy-repo');

      const policy = {
        rules: [
          {
            rulePriority: 1,
            selection: {
              tagStatus: 'any' as TagStatus,
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 100,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('delete-policy-repo', policy);
      await service.deleteLifecyclePolicy('delete-policy-repo');

      expect(service.getLifecyclePolicy('delete-policy-repo')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('should update existing lifecycle policy', async () => {
      await service.createRepository('update-policy-repo');

      const policy1 = {
        rules: [
          {
            rulePriority: 1,
            selection: {
              tagStatus: 'untagged' as TagStatus,
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 5,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('update-policy-repo', policy1);

      const policy2 = {
        rules: [
          {
            rulePriority: 1,
            selection: {
              tagStatus: 'untagged' as TagStatus,
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 10,
            },
            action: {
              type: 'expire' as const,
            },
          },
          {
            rulePriority: 2,
            selection: {
              tagStatus: 'tagged' as TagStatus,
              countType: 'sinceImagePushed' as CountType,
              countNumber: 60,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('update-policy-repo', policy2);
      const retrieved = await service.getLifecyclePolicy('update-policy-repo');

      expect(retrieved.rules.length).toBe(2);
    });
  });

  describe('image scanning configuration', () => {
    test('should enable image scanning', async () => {
      await service.createRepository('scan-repo');
      await service.configureImageScanning('scan-repo', {
        scanOnPush: true,
      });

      const repo = await service.getRepository('scan-repo');
      expect(repo.imageScanningEnabled).toBe(true);
    });

    test('should disable image scanning', async () => {
      await service.createRepository('no-scan-repo', {
        imageScanOnPush: true,
      });

      await service.configureImageScanning('no-scan-repo', {
        scanOnPush: false,
      });

      const repo = await service.getRepository('no-scan-repo');
      expect(repo.imageScanningEnabled).toBe(false);
    });

    test('should throw error for non-existent repository', async () => {
      expect(service.configureImageScanning('non-existent', { scanOnPush: true })).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('permissions management', () => {
    test('should set repository permissions', async () => {
      await service.createRepository('perms-repo');

      const permissions = [
        {
          principal: 'arn:aws:iam::111111111111:root',
          actions: [RepositoryAction.PULL],
        },
        {
          principal: 'arn:aws:iam::222222222222:user/deploy',
          actions: [RepositoryAction.PUSH],
        },
      ];

      await service.setPermissions('perms-repo', permissions);

      const retrieved = await service.getPermissions('perms-repo');
      expect(retrieved).toEqual(permissions);
    });

    test('should get repository permissions', async () => {
      await service.createRepository('get-perms-repo');

      const permissions = [
        {
          principal: 'arn:aws:iam::123456789:role/ecs-task',
          actions: [RepositoryAction.PULL],
        },
      ];

      await service.setPermissions('get-perms-repo', permissions);
      const retrieved = await service.getPermissions('get-perms-repo');

      expect(retrieved.length).toBe(1);
      expect(retrieved[0]?.principal).toBe('arn:aws:iam::123456789:role/ecs-task');
      expect(retrieved[0]?.actions).toContain(RepositoryAction.PULL);
    });

    test('should return empty permissions for new repository', async () => {
      await service.createRepository('empty-perms-repo');
      const permissions = await service.getPermissions('empty-perms-repo');
      expect(permissions).toEqual([]);
    });

    test('should update existing permissions', async () => {
      await service.createRepository('update-perms-repo');

      const permissions1 = [
        {
          principal: 'arn:aws:iam::111111111111:root',
          actions: [RepositoryAction.PULL],
        },
      ];

      await service.setPermissions('update-perms-repo', permissions1);

      const permissions2 = [
        {
          principal: 'arn:aws:iam::222222222222:root',
          actions: [RepositoryAction.PUSH, RepositoryAction.PULL],
        },
        {
          principal: 'arn:aws:iam::333333333333:root',
          actions: [RepositoryAction.PULL],
        },
      ];

      await service.setPermissions('update-perms-repo', permissions2);
      const retrieved = await service.getPermissions('update-perms-repo');

      expect(retrieved.length).toBe(2);
    });

    test('should throw error for non-existent repository', async () => {
      expect(service.setPermissions('non-existent', [])).rejects.toThrow(ResourceNotFoundError);
      expect(service.getPermissions('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('complex lifecycle policies', () => {
    test('should handle multiple rules with different priorities', async () => {
      await service.createRepository('complex-policy-repo');

      const policy = {
        rules: [
          {
            rulePriority: 1,
            description: 'Keep last 10 images',
            selection: {
              tagStatus: 'tagged' as TagStatus,
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 10,
            },
            action: {
              type: 'expire' as const,
            },
          },
          {
            rulePriority: 2,
            description: 'Remove untagged images older than 7 days',
            selection: {
              tagStatus: 'untagged' as TagStatus,
              countType: 'sinceImagePushed' as CountType,
              countNumber: 7,
            },
            action: {
              type: 'expire' as const,
            },
          },
          {
            rulePriority: 3,
            description: 'Keep production images indefinitely',
            selection: {
              tagStatus: 'tagged' as TagStatus,
              tagPrefixList: ['prod-'],
              countType: 'imageCountMoreThan' as CountType,
              countNumber: 999,
            },
            action: {
              type: 'expire' as const,
            },
          },
        ],
      };

      await service.setLifecyclePolicy('complex-policy-repo', policy);
      const retrieved = await service.getLifecyclePolicy('complex-policy-repo');

      expect(retrieved.rules.length).toBe(3);
      expect(retrieved.rules[0]?.rulePriority).toBe(1);
      expect(retrieved.rules[1]?.rulePriority).toBe(2);
      expect(retrieved.rules[2]?.rulePriority).toBe(3);
    });
  });
});
