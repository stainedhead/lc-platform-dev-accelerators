/**
 * Unit Tests for MockContainerRepoClient
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockContainerRepoClient } from '../../../../../src/providers/mock/clients/MockContainerRepoClient';
import { MockContainerRepoService } from '../../../../../src/providers/mock/MockContainerRepoService';
import { ResourceNotFoundError } from '../../../../../src/core/types/common';
import type { TagStatus } from '../../../../../src/core/types/container';

describe('MockContainerRepoClient', () => {
  let client: MockContainerRepoClient;
  let service: MockContainerRepoService;
  const repoName = 'test-repo';

  beforeEach(async () => {
    client = new MockContainerRepoClient();
    service = new MockContainerRepoService();
    await service.createRepository(repoName);
  });

  describe('getRepositoryUri', () => {
    test('should return repository URI', async () => {
      const uri = await client.getRepositoryUri(repoName);
      expect(uri).toBe(`123456789.dkr.ecr.mock.amazonaws.com/${repoName}`);
    });

    test('should throw error for non-existent repository', async () => {
      expect(client.getRepositoryUri('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('listImages', () => {
    test('should return empty array for repository with no images', async () => {
      const images = await client.listImages(repoName);
      expect(images).toEqual([]);
    });

    test('should list all images', async () => {
      await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.1');
      await client._addMockImage(repoName, 'latest');

      const images = await client.listImages(repoName);
      expect(images.length).toBe(3);
    });

    test('should filter tagged images', async () => {
      await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.1');
      const digest = (await client._addMockImage(repoName, 'temp')).imageDigest;

      // Remove tag to make it untagged
      const data = MockContainerRepoService.repositoryDataStore.get(repoName);
      const image = data?.get(digest);
      if (image) {
        image.imageTags = [];
      }

      const images = await client.listImages(repoName, {
        filter: { tagStatus: 'tagged' as TagStatus },
      });

      expect(images.length).toBe(2);
      expect(images.every((img) => img.imageTags && img.imageTags.length > 0)).toBe(true);
    });

    test('should filter untagged images', async () => {
      await client._addMockImage(repoName, 'v1.0');
      const digest = (await client._addMockImage(repoName, 'temp')).imageDigest;

      // Remove tag to make it untagged
      const data = MockContainerRepoService.repositoryDataStore.get(repoName);
      const image = data?.get(digest);
      if (image) {
        image.imageTags = [];
      }

      const images = await client.listImages(repoName, {
        filter: { tagStatus: 'untagged' as TagStatus },
      });

      expect(images.length).toBe(1);
      expect(images[0]?.imageTags).toEqual([]);
    });

    test('should limit results with maxResults', async () => {
      await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.1');
      await client._addMockImage(repoName, 'v1.2');
      await client._addMockImage(repoName, 'v1.3');

      const images = await client.listImages(repoName, { maxResults: 2 });
      expect(images.length).toBe(2);
    });

    test('should throw error for non-existent repository', async () => {
      expect(client.listImages('non-existent')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('getImageByTag', () => {
    test('should get image by tag', async () => {
      const created = await client._addMockImage(repoName, 'v1.0');
      const retrieved = await client.getImageByTag(repoName, 'v1.0');

      expect(retrieved.imageDigest).toBe(created.imageDigest);
      expect(retrieved.imageTags).toContain('v1.0');
    });

    test('should throw error for non-existent tag', async () => {
      expect(client.getImageByTag(repoName, 'non-existent')).rejects.toThrow(ResourceNotFoundError);
    });

    test('should throw error for non-existent repository', async () => {
      expect(client.getImageByTag('non-existent', 'tag')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('getImageByDigest', () => {
    test('should get image by digest', async () => {
      const created = await client._addMockImage(repoName, 'v1.0');
      const retrieved = await client.getImageByDigest(repoName, created.imageDigest);

      expect(retrieved.imageDigest).toBe(created.imageDigest);
      expect(retrieved.repositoryName).toBe(repoName);
    });

    test('should throw error for non-existent digest', async () => {
      expect(client.getImageByDigest(repoName, 'sha256:nonexistent')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('should throw error for non-existent repository', async () => {
      expect(client.getImageByDigest('non-existent', 'sha256:abc')).rejects.toThrow(
        ResourceNotFoundError
      );
    });
  });

  describe('imageExists', () => {
    test('should return true for existing image', async () => {
      await client._addMockImage(repoName, 'v1.0');
      const exists = await client.imageExists(repoName, 'v1.0');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent image', async () => {
      const exists = await client.imageExists(repoName, 'non-existent');
      expect(exists).toBe(false);
    });

    test('should return false for non-existent repository', async () => {
      const exists = await client.imageExists('non-existent', 'tag');
      expect(exists).toBe(false);
    });
  });

  describe('deleteImageByTag', () => {
    test('should delete image by tag', async () => {
      await client._addMockImage(repoName, 'delete-me');
      const deleted = await client.deleteImageByTag(repoName, 'delete-me');
      expect(deleted).toBe(true);

      const exists = await client.imageExists(repoName, 'delete-me');
      expect(exists).toBe(false);
    });

    test('should return false for non-existent tag', async () => {
      const deleted = await client.deleteImageByTag(repoName, 'non-existent');
      expect(deleted).toBe(false);
    });

    test('should remove image from shared store', async () => {
      const image = await client._addMockImage(repoName, 'shared-delete');
      await client.deleteImageByTag(repoName, 'shared-delete');

      const data = MockContainerRepoService.repositoryDataStore.get(repoName);
      expect(data?.has(image.imageDigest)).toBe(false);
    });
  });

  describe('deleteImageByDigest', () => {
    test('should delete image by digest', async () => {
      const image = await client._addMockImage(repoName, 'v1.0');
      const deleted = await client.deleteImageByDigest(repoName, image.imageDigest);
      expect(deleted).toBe(true);

      const data = MockContainerRepoService.repositoryDataStore.get(repoName);
      expect(data?.has(image.imageDigest)).toBe(false);
    });

    test('should return false for non-existent digest', async () => {
      const deleted = await client.deleteImageByDigest(repoName, 'sha256:nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteImages (batch)', () => {
    test('should delete multiple images by tag', async () => {
      await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.1');
      await client._addMockImage(repoName, 'v1.2');

      const result = await client.deleteImages(repoName, ['v1.0', 'v1.1']);

      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(0);

      const exists1 = await client.imageExists(repoName, 'v1.0');
      const exists2 = await client.imageExists(repoName, 'v1.1');
      const exists3 = await client.imageExists(repoName, 'v1.2');

      expect(exists1).toBe(false);
      expect(exists2).toBe(false);
      expect(exists3).toBe(true);
    });

    test('should delete multiple images by digest', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      const image2 = await client._addMockImage(repoName, 'v1.1');

      const result = await client.deleteImages(repoName, [image1.imageDigest, image2.imageDigest]);

      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(0);
    });

    test('should handle mixed tag and digest identifiers', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.1');

      const result = await client.deleteImages(repoName, [image1.imageDigest, 'v1.1']);

      expect(result.successful.length).toBe(2);
    });

    test('should handle non-existent images', async () => {
      await client._addMockImage(repoName, 'v1.0');

      const result = await client.deleteImages(repoName, [
        'v1.0',
        'non-existent',
        'sha256:nonexistent',
      ]);

      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(2);
      expect(result.failed[0]?.code).toBe('DeleteFailed');
      expect(result.failed[1]?.code).toBe('ImageNotFound');
    });

    test('should include imageDigest and imageTag in successful results', async () => {
      const image = await client._addMockImage(repoName, 'v1.0');

      const result = await client.deleteImages(repoName, ['v1.0']);

      expect(result.successful.length).toBe(1);
      expect(result.successful[0]?.imageDigest).toBe(image.imageDigest);
      expect(result.successful[0]?.imageTag).toBe('v1.0');
    });

    test('should include error details in failed results', async () => {
      const result = await client.deleteImages(repoName, ['non-existent-1', 'non-existent-2']);

      expect(result.failed.length).toBe(2);
      expect(result.failed[0]?.imageTag).toBe('non-existent-1');
      expect(result.failed[0]?.message).toBeTruthy();
      expect(result.failed[1]?.imageTag).toBe('non-existent-2');
    });
  });

  describe('multiple tags per image', () => {
    test('should support multiple tags pointing to same digest', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      const image2 = await client._addMockImage(repoName, 'latest', image1.imageDigest);

      expect(image1.imageDigest).toBe(image2.imageDigest);

      const retrieved1 = await client.getImageByTag(repoName, 'v1.0');
      const retrieved2 = await client.getImageByTag(repoName, 'latest');

      expect(retrieved1.imageDigest).toBe(retrieved2.imageDigest);
      expect(retrieved1.imageTags).toContain('v1.0');
      expect(retrieved1.imageTags).toContain('latest');
    });

    test('should add new tag to existing image', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'stable', image1.imageDigest);

      const retrieved = await client.getImageByDigest(repoName, image1.imageDigest);
      expect(retrieved.imageTags?.length).toBe(2);
      expect(retrieved.imageTags).toContain('v1.0');
      expect(retrieved.imageTags).toContain('stable');
    });

    test('should not duplicate tags', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      await client._addMockImage(repoName, 'v1.0', image1.imageDigest);

      const retrieved = await client.getImageByDigest(repoName, image1.imageDigest);
      expect(retrieved.imageTags?.length).toBe(1);
      expect(retrieved.imageTags).toEqual(['v1.0']);
    });
  });

  describe('_addMockImage helper', () => {
    test('should generate unique digest if not provided', async () => {
      const image1 = await client._addMockImage(repoName, 'v1.0');
      const image2 = await client._addMockImage(repoName, 'v1.1');

      expect(image1.imageDigest).not.toBe(image2.imageDigest);
      expect(image1.imageDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(image2.imageDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('should set image properties', async () => {
      const image = await client._addMockImage(repoName, 'v1.0');

      expect(image.repositoryName).toBe(repoName);
      expect(image.imageTags).toEqual(['v1.0']);
      expect(image.imageSizeInBytes).toBeGreaterThan(50_000_000);
      expect(image.imageSizeInBytes).toBeLessThan(500_000_000);
      expect(image.imagePushedAt).toBeInstanceOf(Date);
      expect(image.registryId).toBe('123456789');
    });

    test('should use provided digest', async () => {
      const customDigest = 'sha256:custom123';
      const image = await client._addMockImage(repoName, 'v1.0', customDigest);

      expect(image.imageDigest).toBe(customDigest);
    });
  });

  describe('image size generation', () => {
    test('should generate random sizes within range', async () => {
      const sizes = new Set<number>();

      for (let i = 0; i < 10; i++) {
        const image = await client._addMockImage(repoName, `v${i}`);
        sizes.add(image.imageSizeInBytes);
        expect(image.imageSizeInBytes).toBeGreaterThanOrEqual(50_000_000);
        expect(image.imageSizeInBytes).toBeLessThan(500_000_000);
      }

      // Should have some variety in sizes (not all the same)
      expect(sizes.size).toBeGreaterThan(1);
    });
  });
});
