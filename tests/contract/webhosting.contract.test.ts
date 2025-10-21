/**
 * Contract Test: WebHostingService
 *
 * Verifies that both AWS and Mock providers implement the same interface
 * with identical behavior. This ensures cloud-agnostic portability.
 *
 * T019: Contract test for WebHostingService interface
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type { WebHostingService } from '../../src/core/services/WebHostingService';
import type { DeployApplicationParams, UpdateApplicationParams, ScaleParams } from '../../src/core/types/deployment';
import { DeploymentStatus } from '../../src/core/types/deployment';
import { MockWebHostingService } from '../../src/providers/mock/MockWebHostingService';
import { ResourceNotFoundError, ValidationError } from '../../src/core/types/common';

/**
 * Contract test suite that verifies provider implementations
 * follow the WebHostingService contract.
 */
function testWebHostingServiceContract(
  name: string,
  createService: () => WebHostingService
) {
  describe(`WebHostingService Contract: ${name}`, () => {
    let service: WebHostingService;

    beforeEach(() => {
      service = createService();
    });

    test('deployApplication - should deploy a containerized application', async () => {
      const params: DeployApplicationParams = {
        name: 'test-app',
        image: 'nginx:latest',
        port: 80,
        environment: { NODE_ENV: 'production' },
        cpu: 1,
        memory: 512,
        minInstances: 1,
        maxInstances: 5,
      };

      const deployment = await service.deployApplication(params);

      expect(deployment).toBeDefined();
      expect(deployment.id).toBeDefined();
      expect(deployment.name).toBe('test-app');
      expect(deployment.image).toBe('nginx:latest');
      expect(deployment.status).toBe(DeploymentStatus.RUNNING);
      expect(deployment.url).toBeDefined();
      expect(deployment.cpu).toBe(1);
      expect(deployment.memory).toBe(512);
      expect(deployment.minInstances).toBe(1);
      expect(deployment.maxInstances).toBe(5);
      expect(deployment.currentInstances).toBeGreaterThanOrEqual(1);
      expect(deployment.environment).toEqual({ NODE_ENV: 'production' });
      expect(deployment.created).toBeInstanceOf(Date);
      expect(deployment.lastUpdated).toBeInstanceOf(Date);
    });

    test('deployApplication - should use defaults when optional params omitted', async () => {
      const params: DeployApplicationParams = {
        name: 'minimal-app',
        image: 'alpine:latest',
      };

      const deployment = await service.deployApplication(params);

      expect(deployment).toBeDefined();
      expect(deployment.name).toBe('minimal-app');
      expect(deployment.cpu).toBeGreaterThan(0);
      expect(deployment.memory).toBeGreaterThan(0);
      expect(deployment.minInstances).toBeGreaterThanOrEqual(1);
      expect(deployment.maxInstances).toBeGreaterThanOrEqual(1);
    });

    test('getDeployment - should retrieve deployment by ID', async () => {
      const params: DeployApplicationParams = {
        name: 'get-test',
        image: 'nginx:latest',
      };

      const deployed = await service.deployApplication(params);
      const retrieved = await service.getDeployment(deployed.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(deployed.id);
      expect(retrieved.name).toBe('get-test');
      expect(retrieved.status).toBe(DeploymentStatus.RUNNING);
    });

    test('getDeployment - should throw ResourceNotFoundError for non-existent ID', async () => {
      await expect(service.getDeployment('non-existent-id')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('updateApplication - should update deployment with new image', async () => {
      const params: DeployApplicationParams = {
        name: 'update-test',
        image: 'nginx:1.20',
      };

      const deployed = await service.deployApplication(params);

      const updateParams: UpdateApplicationParams = {
        image: 'nginx:1.21',
      };

      const updated = await service.updateApplication(deployed.id, updateParams);

      expect(updated.id).toBe(deployed.id);
      expect(updated.image).toBe('nginx:1.21');
      expect(updated.status).toBe(DeploymentStatus.RUNNING);
    });

    test('updateApplication - should update environment variables', async () => {
      const params: DeployApplicationParams = {
        name: 'env-test',
        image: 'nginx:latest',
        environment: { KEY1: 'value1' },
      };

      const deployed = await service.deployApplication(params);

      const updateParams: UpdateApplicationParams = {
        environment: { KEY1: 'updated', KEY2: 'new' },
      };

      const updated = await service.updateApplication(deployed.id, updateParams);

      expect(updated.environment).toEqual({ KEY1: 'updated', KEY2: 'new' });
    });

    test('updateApplication - should throw ResourceNotFoundError for non-existent ID', async () => {
      const updateParams: UpdateApplicationParams = {
        image: 'nginx:latest',
      };

      await expect(
        service.updateApplication('non-existent-id', updateParams)
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('deleteApplication - should delete deployment', async () => {
      const params: DeployApplicationParams = {
        name: 'delete-test',
        image: 'nginx:latest',
      };

      const deployed = await service.deployApplication(params);
      await service.deleteApplication(deployed.id);

      await expect(service.getDeployment(deployed.id)).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('deleteApplication - should throw ResourceNotFoundError for non-existent ID', async () => {
      await expect(service.deleteApplication('non-existent-id')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('getApplicationUrl - should return application URL', async () => {
      const params: DeployApplicationParams = {
        name: 'url-test',
        image: 'nginx:latest',
      };

      const deployed = await service.deployApplication(params);
      const url = await service.getApplicationUrl(deployed.id);

      expect(url).toBeDefined();
      expect(url).toMatch(/^https?:\/\//);
      expect(url).toBe(deployed.url);
    });

    test('getApplicationUrl - should throw ResourceNotFoundError for non-existent ID', async () => {
      await expect(service.getApplicationUrl('non-existent-id')).rejects.toThrow(
        ResourceNotFoundError
      );
    });

    test('scaleApplication - should update instance counts', async () => {
      const params: DeployApplicationParams = {
        name: 'scale-test',
        image: 'nginx:latest',
        minInstances: 1,
        maxInstances: 3,
      };

      const deployed = await service.deployApplication(params);

      const scaleParams: ScaleParams = {
        minInstances: 2,
        maxInstances: 10,
      };

      await service.scaleApplication(deployed.id, scaleParams);

      const scaled = await service.getDeployment(deployed.id);
      expect(scaled.minInstances).toBe(2);
      expect(scaled.maxInstances).toBe(10);
    });

    test('scaleApplication - should throw ResourceNotFoundError for non-existent ID', async () => {
      const scaleParams: ScaleParams = {
        minInstances: 2,
        maxInstances: 5,
      };

      await expect(
        service.scaleApplication('non-existent-id', scaleParams)
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('scaleApplication - should validate minInstances <= maxInstances', async () => {
      const params: DeployApplicationParams = {
        name: 'invalid-scale-test',
        image: 'nginx:latest',
      };

      const deployed = await service.deployApplication(params);

      const scaleParams: ScaleParams = {
        minInstances: 10,
        maxInstances: 5,
      };

      await expect(
        service.scaleApplication(deployed.id, scaleParams)
      ).rejects.toThrow(ValidationError);
    });
  });
}

// Run contract tests against Mock provider
testWebHostingServiceContract('MockWebHostingService', () => new MockWebHostingService());

// TODO: Uncomment when AWS provider is implemented
// import { AwsWebHostingService } from '../../src/providers/aws/AwsWebHostingService';
// testWebHostingServiceContract('AwsWebHostingService', () => new AwsWebHostingService());
