/**
 * Integration Test: AwsWebHostingService with LocalStack
 *
 * Tests AWS App Runner implementation against LocalStack.
 * Requires: docker-compose up localstack
 *
 * NOTE: LocalStack's App Runner support is limited. This test validates
 * the service interface and basic operations. Full App Runner testing
 * requires real AWS environment.
 *
 * T025: Integration test for AWS WebHostingService with LocalStack
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsWebHostingService } from '../../../../src/providers/aws/AwsWebHostingService';
import { DeploymentStatus } from '../../../../src/core/types/deployment';

// LocalStack App Runner endpoint
const LOCALSTACK_ENDPOINT = 'http://localhost:4566';

describe('AwsWebHostingService Integration (LocalStack)', () => {
  let service: AwsWebHostingService;
  const deploymentIds: string[] = [];

  beforeAll(() => {
    service = new AwsWebHostingService({
      region: 'us-east-1',
      endpoint: LOCALSTACK_ENDPOINT,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  });

  afterAll(async () => {
    // Cleanup: Delete all test deployments
    for (const id of deploymentIds) {
      try {
        await service.deleteApplication(id);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('deployApplication - should deploy application to LocalStack App Runner', async () => {
    const deployment = await service.deployApplication({
      name: 'test-integration-app',
      image: 'nginx:latest',
      port: 80,
      environment: {
        NODE_ENV: 'test',
        API_KEY: 'test-key',
      },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 5,
    });

    deploymentIds.push(deployment.id);

    expect(deployment.id).toBeDefined();
    expect(deployment.name).toBe('test-integration-app');
    expect(deployment.image).toBe('nginx:latest');
    expect(deployment.environment.NODE_ENV).toBe('test');
    expect(deployment.environment.API_KEY).toBe('test-key');
    expect(deployment.cpu).toBe(1);
    expect(deployment.memory).toBe(2048);
    expect(deployment.minInstances).toBe(1);
    expect(deployment.maxInstances).toBe(5);
    expect(deployment.url).toBeDefined();
    expect(deployment.created).toBeInstanceOf(Date);

    // Status may vary based on LocalStack implementation
    expect(Object.values(DeploymentStatus)).toContain(deployment.status);
  });

  test('getDeployment - should retrieve deployment details', async () => {
    const initialDeployment = await service.deployApplication({
      name: 'test-get-app',
      image: 'httpd:latest',
      port: 80,
      environment: { TEST: 'value' },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 3,
    });

    deploymentIds.push(initialDeployment.id);

    const deployment = await service.getDeployment(initialDeployment.id);

    expect(deployment.id).toBe(initialDeployment.id);
    expect(deployment.name).toBe('test-get-app');
    expect(deployment.image).toBe('httpd:latest');
    expect(deployment.environment.TEST).toBe('value');
  });

  test('getApplicationUrl - should return deployment URL', async () => {
    const deployment = await service.deployApplication({
      name: 'test-url-app',
      image: 'nginx:latest',
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    const url = await service.getApplicationUrl(deployment.id);

    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(url).toMatch(/^https?:\/\//); // Should be valid URL
  });

  test('updateApplication - should update deployment configuration', async () => {
    const deployment = await service.deployApplication({
      name: 'test-update-app',
      image: 'nginx:1.20',
      port: 80,
      environment: { VERSION: '1.0' },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 3,
    });

    deploymentIds.push(deployment.id);

    const updated = await service.updateApplication(deployment.id, {
      image: 'nginx:1.21',
      environment: {
        VERSION: '2.0',
        NEW_VAR: 'new-value',
      },
    });

    expect(updated.id).toBe(deployment.id);
    expect(updated.image).toBe('nginx:1.21');
    expect(updated.environment.VERSION).toBe('2.0');
    expect(updated.environment.NEW_VAR).toBe('new-value');
    expect(updated.lastUpdated).toBeInstanceOf(Date);
    expect(updated.lastUpdated.getTime()).toBeGreaterThan(deployment.created.getTime());
  });

  test('scaleApplication - should update instance scaling configuration', async () => {
    const deployment = await service.deployApplication({
      name: 'test-scale-app',
      image: 'nginx:latest',
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 3,
    });

    deploymentIds.push(deployment.id);

    await service.scaleApplication(deployment.id, {
      minInstances: 2,
      maxInstances: 10,
    });

    const scaled = await service.getDeployment(deployment.id);

    expect(scaled.minInstances).toBe(2);
    expect(scaled.maxInstances).toBe(10);
  });

  test('deleteApplication - should delete deployment', async () => {
    const deployment = await service.deployApplication({
      name: 'test-delete-app',
      image: 'nginx:latest',
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    await expect(service.deleteApplication(deployment.id)).resolves.not.toThrow();

    // Verify deletion - should throw ResourceNotFoundError
    await expect(service.getDeployment(deployment.id)).rejects.toThrow();
  });

  test('deployApplication with custom CPU and memory - should accept resource configuration', async () => {
    const deployment = await service.deployApplication({
      name: 'test-resources-app',
      image: 'nginx:latest',
      port: 80,
      environment: {},
      cpu: 2, // 2 vCPU
      memory: 4096, // 4GB RAM
      minInstances: 1,
      maxInstances: 4,
    });

    deploymentIds.push(deployment.id);

    expect(deployment.cpu).toBe(2);
    expect(deployment.memory).toBe(4096);
  });

  test('deployApplication with complex environment - should handle multiple env vars', async () => {
    const environment = {
      DATABASE_URL: 'postgresql://localhost/mydb',
      REDIS_URL: 'redis://localhost:6379',
      API_KEY: 'secret-key',
      DEBUG: 'true',
      PORT: '3000',
    };

    const deployment = await service.deployApplication({
      name: 'test-env-app',
      image: 'node:18',
      port: 3000,
      environment,
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 3,
    });

    deploymentIds.push(deployment.id);

    expect(deployment.environment).toEqual(environment);
  });

  test('Multiple deployments - should handle concurrent applications', async () => {
    const deployments = await Promise.all([
      service.deployApplication({
        name: 'test-concurrent-app-1',
        image: 'nginx:latest',
        port: 80,
        environment: { APP_ID: '1' },
        cpu: 1,
        memory: 2048,
        minInstances: 1,
        maxInstances: 2,
      }),
      service.deployApplication({
        name: 'test-concurrent-app-2',
        image: 'nginx:latest',
        port: 80,
        environment: { APP_ID: '2' },
        cpu: 1,
        memory: 2048,
        minInstances: 1,
        maxInstances: 2,
      }),
      service.deployApplication({
        name: 'test-concurrent-app-3',
        image: 'nginx:latest',
        port: 80,
        environment: { APP_ID: '3' },
        cpu: 1,
        memory: 2048,
        minInstances: 1,
        maxInstances: 2,
      }),
    ]);

    deploymentIds.push(...deployments.map((d) => d.id));

    expect(deployments).toHaveLength(3);
    expect(deployments[0]!.environment.APP_ID).toBe('1');
    expect(deployments[1]!.environment.APP_ID).toBe('2');
    expect(deployments[2]!.environment.APP_ID).toBe('3');

    // All should have unique IDs
    const uniqueIds = new Set(deployments.map((d) => d.id));
    expect(uniqueIds.size).toBe(3);
  });

  test('Error handling - should throw on invalid deployment ID', async () => {
    await expect(service.getDeployment('nonexistent-id-12345')).rejects.toThrow();
  });

  test('Error handling - should throw on invalid update', async () => {
    await expect(
      service.updateApplication('nonexistent-id-12345', { image: 'nginx:latest' })
    ).rejects.toThrow();
  });
});
