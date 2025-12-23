/**
 * Mock Container Repository Client Implementation
 * In-memory implementation of ContainerRepoClient for testing
 */

import * as crypto from 'crypto';
import type { ContainerRepoClient } from '../../../core/clients/ContainerRepoClient';
import type {
  ContainerImage,
  ContainerImageDetail,
  ImageListOptions,
  TagStatus,
} from '../../../core/types/container';
import type { BatchDeleteImagesResult } from '../../../core/types/runtime';
import { ResourceNotFoundError } from '../../../core/types/common';
import { MockContainerRepoService } from '../MockContainerRepoService';

export class MockContainerRepoClient implements ContainerRepoClient {
  private generateDigest(): string {
    return `sha256:${crypto.randomBytes(32).toString('hex')}`;
  }

  private getRepositoryData(repositoryName: string): Map<string, ContainerImageDetail> {
    const data = MockContainerRepoService.repositoryDataStore.get(repositoryName);
    if (!data) {
      throw new ResourceNotFoundError('Repository', repositoryName);
    }
    return data;
  }

  async getRepositoryUri(repositoryName: string): Promise<string> {
    this.getRepositoryData(repositoryName);
    return `123456789.dkr.ecr.mock.amazonaws.com/${repositoryName}`;
  }

  async listImages(
    repositoryName: string,
    options: ImageListOptions = {}
  ): Promise<ContainerImage[]> {
    const data = this.getRepositoryData(repositoryName);
    let images = Array.from(data.values());

    if (options.filter?.tagStatus) {
      images = images.filter((img) => {
        const hasTags = img.imageTags && img.imageTags.length > 0;
        if (options.filter?.tagStatus === ('tagged' as TagStatus)) {
          return hasTags;
        } else if (options.filter?.tagStatus === ('untagged' as TagStatus)) {
          return !hasTags;
        }
        return true;
      });
    }

    return images.slice(0, options.maxResults ?? images.length);
  }

  async getImageByTag(repositoryName: string, imageTag: string): Promise<ContainerImageDetail> {
    const data = this.getRepositoryData(repositoryName);

    for (const image of data.values()) {
      if (image.imageTags?.includes(imageTag)) {
        return image;
      }
    }

    throw new ResourceNotFoundError('Image', `${repositoryName}:${imageTag}`);
  }

  async getImageByDigest(
    repositoryName: string,
    imageDigest: string
  ): Promise<ContainerImageDetail> {
    const data = this.getRepositoryData(repositoryName);
    const image = data.get(imageDigest);

    if (!image) {
      throw new ResourceNotFoundError('Image', `${repositoryName}@${imageDigest}`);
    }

    return image;
  }

  async imageExists(repositoryName: string, imageTag: string): Promise<boolean> {
    try {
      await this.getImageByTag(repositoryName, imageTag);
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async deleteImageByTag(repositoryName: string, imageTag: string): Promise<boolean> {
    try {
      const image = await this.getImageByTag(repositoryName, imageTag);
      const data = this.getRepositoryData(repositoryName);
      return data.delete(image.imageDigest);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async deleteImageByDigest(repositoryName: string, imageDigest: string): Promise<boolean> {
    const data = this.getRepositoryData(repositoryName);
    return data.delete(imageDigest);
  }

  async deleteImages(
    repositoryName: string,
    imageIdentifiers: string[]
  ): Promise<BatchDeleteImagesResult> {
    const successful: Array<{ imageDigest: string; imageTag?: string }> = [];
    const failed: Array<{
      imageDigest?: string;
      imageTag?: string;
      code: string;
      message: string;
    }> = [];

    for (const identifier of imageIdentifiers) {
      try {
        let deleted = false;
        let digest: string | undefined;
        let tag: string | undefined;

        if (identifier.startsWith('sha256:')) {
          digest = identifier;
          deleted = await this.deleteImageByDigest(repositoryName, identifier);
        } else {
          tag = identifier;
          const image = await this.getImageByTag(repositoryName, identifier);
          digest = image.imageDigest;
          deleted = await this.deleteImageByTag(repositoryName, identifier);
        }

        if (deleted) {
          const successEntry: { imageDigest: string; imageTag?: string } = { imageDigest: digest };
          if (tag) {
            successEntry.imageTag = tag;
          }
          successful.push(successEntry);
        } else {
          const failEntry: {
            imageDigest?: string;
            imageTag?: string;
            code: string;
            message: string;
          } = {
            code: 'ImageNotFound',
            message: 'Image not found',
          };
          if (digest) {
            failEntry.imageDigest = digest;
          }
          if (tag) {
            failEntry.imageTag = tag;
          }
          failed.push(failEntry);
        }
      } catch (error) {
        const errEntry: { imageDigest?: string; imageTag?: string; code: string; message: string } =
          {
            code: 'DeleteFailed',
            message: (error as Error).message,
          };
        if (identifier.startsWith('sha256:')) {
          errEntry.imageDigest = identifier;
        } else {
          errEntry.imageTag = identifier;
        }
        failed.push(errEntry);
      }
    }

    return { successful, failed };
  }

  public async _addMockImage(
    repositoryName: string,
    tag: string,
    digest?: string
  ): Promise<ContainerImageDetail> {
    const data = this.getRepositoryData(repositoryName);
    const imageDigest = digest ?? this.generateDigest();

    const existingImage = data.get(imageDigest);
    if (existingImage) {
      if (!existingImage.imageTags) {
        existingImage.imageTags = [];
      }
      if (!existingImage.imageTags.includes(tag)) {
        existingImage.imageTags.push(tag);
      }
      return existingImage;
    }

    const image: ContainerImageDetail = {
      repositoryName,
      imageDigest,
      imageTags: [tag],
      imageSizeInBytes: Math.floor(Math.random() * (500_000_000 - 50_000_000) + 50_000_000),
      imagePushedAt: new Date(),
      registryId: '123456789',
    };

    data.set(imageDigest, image);
    return image;
  }
}
