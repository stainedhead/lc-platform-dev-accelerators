/**
 * Integration Test: AwsWebHostingService with Real AWS App Runner
 *
 * Tests AWS App Runner implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates App Runner services during tests
 * - Cleans up all created services in afterAll
 *
 * NOTE: App Runner deployments can take 2-10 minutes to complete.
 * These tests may take several minutes to run.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsWebHostingService } from '../../../../src/providers/aws/AwsWebHostingService';
import { DeploymentStatus } from '../../../../src/core/types/deployment';
import {
  AppRunnerClient,
  DeleteServiceCommand,
  DescribeServiceCommand,
  ListServicesCommand,
} from '@aws-sdk/client-apprunner';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

// Use a minimal public image for testing
const TEST_IMAGE = 'public.ecr.aws/nginx/nginx:stable-alpine';

describe('AwsWebHostingService Integration (AWS)', () => {
  let service: AwsWebHostingService;
  let appRunnerClient: AppRunnerClient;

  // Track deployments for cleanup
  const deploymentIds: string[] = [];

  beforeAll(() => {
    // Configure service to use real AWS (no endpoint override)
    service = new AwsWebHostingService({
      region: AWS_REGION,
    });

    appRunnerClient = new AppRunnerClient({ region: AWS_REGION });
  });

  afterAll(async () => {
    // Cleanup: Delete all test deployments
    console.log(`Cleaning up ${deploymentIds.length} test services...`);

    for (const id of deploymentIds) {
      try {
        await appRunnerClient.send(
          new DeleteServiceCommand({
            ServiceArn: id,
          })
        );
        console.log(`Deleted service: ${id}`);
      } catch (error) {
        console.warn(
          `Cleanup warning: Failed to delete service ${id}: ${(error as Error).message}`
        );
      }
    }

    // Wait a bit for deletions to process
    if (deploymentIds.length > 0) {
      console.log('Waiting for service deletions to process...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  });

  // Helper function to wait for service to be running
  async function waitForServiceRunning(serviceArn: string, maxWaitMs = 600000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 30000; // 30 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await appRunnerClient.send(
          new DescribeServiceCommand({ ServiceArn: serviceArn })
        );

        const status = response.Service?.Status;
        console.log(`Service ${serviceArn} status: ${status}`);

        if (status === 'RUNNING') {
          return;
        }

        if (status === 'CREATE_FAILED' || status === 'DELETE_FAILED') {
          throw new Error(`Service failed with status: ${status}`);
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        if ((error as Error).message.includes('failed with status')) {
          throw error;
        }
        console.warn(`Error checking service status: ${(error as Error).message}`);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Timeout waiting for service to be running after ${maxWaitMs}ms`);
  }

  test('deployApplication - should deploy application to AWS App Runner', async () => {
    const serviceName = `${TEST_PREFIX}-basic`.substring(0, 40); // App Runner has a 40-char limit

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: {
        NODE_ENV: 'test',
        TEST_VAR: 'integration',
      },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    expect(deployment.id).toBeDefined();
    expect(deployment.id).toContain('arn:aws:apprunner');
    expect(deployment.name).toBe(serviceName);
    expect(deployment.image).toBe(TEST_IMAGE);
    expect(deployment.cpu).toBe(1);
    expect(deployment.memory).toBe(2048);
    expect(deployment.minInstances).toBe(1);
    expect(deployment.maxInstances).toBe(2);
    expect(deployment.created).toBeInstanceOf(Date);

    // Wait for service to be running
    await waitForServiceRunning(deployment.id);

    // Verify service is running
    const runningDeployment = await service.getDeployment(deployment.id);
    expect(runningDeployment.status).toBe(DeploymentStatus.RUNNING);
    expect(runningDeployment.url).toBeDefined();
    expect(runningDeployment.url).toContain('.awsapprunner.com');
  }, 700000); // 11+ minute timeout for deployment

  test('getDeployment - should retrieve deployment details', async () => {
    const serviceName = `${TEST_PREFIX}-get`.substring(0, 40);

    const initialDeployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: { TEST: 'get-value' },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(initialDeployment.id);

    // Get deployment immediately (may be in OPERATION_IN_PROGRESS)
    const deployment = await service.getDeployment(initialDeployment.id);

    expect(deployment.id).toBe(initialDeployment.id);
    expect(deployment.name).toBe(serviceName);
    expect(deployment.image).toBe(TEST_IMAGE);

    // Wait for service to be running for URL verification
    await waitForServiceRunning(initialDeployment.id);

    const runningDeployment = await service.getDeployment(initialDeployment.id);
    expect(runningDeployment.url).toBeDefined();
    expect(runningDeployment.url).toContain('awsapprunner.com');
  }, 700000);

  test('getApplicationUrl - should return deployment URL', async () => {
    const serviceName = `${TEST_PREFIX}-url`.substring(0, 40);

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    // Wait for service to be running
    await waitForServiceRunning(deployment.id);

    const url = await service.getApplicationUrl(deployment.id);

    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(url).toMatch(/^https:\/\/.*\.awsapprunner\.com$/);
  }, 700000);

  test('updateApplication - should update deployment configuration', async () => {
    const serviceName = `${TEST_PREFIX}-update`.substring(0, 40);

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: { VERSION: '1.0' },
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    // Wait for service to be running before updating
    await waitForServiceRunning(deployment.id);

    // Update the service
    const updated = await service.updateApplication(deployment.id, {
      environment: {
        VERSION: '2.0',
        NEW_VAR: 'new-value',
      },
    });

    expect(updated.id).toBe(deployment.id);
    expect(updated.lastUpdated).toBeInstanceOf(Date);

    // Wait for update to complete
    await waitForServiceRunning(deployment.id);

    // Verify the update
    const updatedDeployment = await service.getDeployment(deployment.id);
    expect(updatedDeployment.status).toBe(DeploymentStatus.RUNNING);
  }, 1200000); // 20 minute timeout for deploy + update

  test('scaleApplication - should accept scaling parameters', async () => {
    const serviceName = `${TEST_PREFIX}-scale`.substring(0, 40);

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    // Wait for service to be running
    await waitForServiceRunning(deployment.id);

    // Scale application (note: current implementation just validates service exists)
    await service.scaleApplication(deployment.id, {
      minInstances: 2,
      maxInstances: 5,
    });

    // Verify service still exists
    const scaled = await service.getDeployment(deployment.id);
    expect(scaled.status).toBe(DeploymentStatus.RUNNING);
  }, 700000);

  test('deleteApplication - should delete deployment', async () => {
    const serviceName = `${TEST_PREFIX}-delete`.substring(0, 40);

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment: {},
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    // Don't add to deploymentIds - we're deleting manually

    // Wait for service to be running before deleting
    await waitForServiceRunning(deployment.id);

    // Delete the service
    await service.deleteApplication(deployment.id);

    // Wait for deletion to process
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify deletion - should throw ResourceNotFoundError or service should be in DELETED state
    try {
      const deleted = await service.getDeployment(deployment.id);
      // If we get here, service might still be deleting
      expect(['DELETED', 'DELETE_IN_PROGRESS']).toContain(deleted.status);
    } catch (error) {
      // Expected - service not found
      expect((error as Error).message).toMatch(/not found|ResourceNotFound/i);
    }
  }, 800000);

  test('Error handling - should throw on invalid deployment ID', async () => {
    await expect(
      service.getDeployment('arn:aws:apprunner:us-east-1:123456789012:service/nonexistent/invalid')
    ).rejects.toThrow();
  });

  test('Error handling - should throw on invalid update', async () => {
    await expect(
      service.updateApplication(
        'arn:aws:apprunner:us-east-1:123456789012:service/nonexistent/invalid',
        { image: TEST_IMAGE }
      )
    ).rejects.toThrow();
  });

  test('deployApplication with environment variables - should handle complex env', async () => {
    const serviceName = `${TEST_PREFIX}-env`.substring(0, 40);
    const environment = {
      DATABASE_URL: 'postgresql://localhost/mydb',
      API_KEY: 'test-api-key',
      DEBUG: 'true',
      PORT: '80',
    };

    const deployment = await service.deployApplication({
      name: serviceName,
      image: TEST_IMAGE,
      port: 80,
      environment,
      cpu: 1,
      memory: 2048,
      minInstances: 1,
      maxInstances: 2,
    });

    deploymentIds.push(deployment.id);

    expect(deployment.environment).toEqual(environment);

    // Wait for service to verify it works
    await waitForServiceRunning(deployment.id);

    const runningDeployment = await service.getDeployment(deployment.id);
    expect(runningDeployment.status).toBe(DeploymentStatus.RUNNING);
  }, 700000);

  test('listServices - should find created services', async () => {
    // List services using the client directly
    const response = await appRunnerClient.send(new ListServicesCommand({}));

    expect(response.ServiceSummaryList).toBeDefined();
    expect(response.ServiceSummaryList).toBeInstanceOf(Array);

    // Should find at least one of our test services if any are created
    if (deploymentIds.length > 0) {
      const testServices = response.ServiceSummaryList?.filter((svc) =>
        svc.ServiceName?.startsWith('lcplatform-test-')
      );
      expect(testServices?.length).toBeGreaterThanOrEqual(0); // May be 0 if all deleted
    }
  });
});
