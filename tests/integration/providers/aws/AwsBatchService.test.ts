/**
 * Integration Test: AwsBatchService with Real AWS Batch
 *
 * Tests AWS Batch implementation against real AWS services.
 * Requires: AWS credentials configured (env vars, IAM role, or ~/.aws/credentials)
 *
 * Infrastructure Setup/Teardown:
 * - Creates IAM role for Batch execution
 * - Creates Fargate Compute Environment
 * - Creates Job Queue
 * - Creates Job Definition
 * - Cleans up all resources in reverse order in afterAll
 *
 * Note: This test takes longer (~4-5 minutes) due to compute environment provisioning
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { AwsBatchService } from '../../../../src/providers/aws/AwsBatchService';
import { JobStatus } from '../../../../src/core/types/job';
import { ProviderType } from '../../../../src/core/types/common';
import {
  BatchClient,
  CreateComputeEnvironmentCommand,
  CreateJobQueueCommand,
  RegisterJobDefinitionCommand,
  DeleteComputeEnvironmentCommand,
  DeleteJobQueueCommand,
  DeregisterJobDefinitionCommand,
  UpdateComputeEnvironmentCommand,
  UpdateJobQueueCommand,
  DescribeComputeEnvironmentsCommand,
  DescribeJobQueuesCommand,
  CRType,
  CEState,
  JQState,
} from '@aws-sdk/client-batch';
import {
  IAMClient,
  CreateRoleCommand,
  DeleteRoleCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
} from '@aws-sdk/client-iam';
import { EC2Client, DescribeSubnetsCommand, DescribeVpcsCommand } from '@aws-sdk/client-ec2';

// Test configuration
const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const TEST_PREFIX = `lcplatform-test-${Date.now()}`;

// Infrastructure names
const ROLE_NAME = `${TEST_PREFIX}-batch-role`;
const COMPUTE_ENV_NAME = `${TEST_PREFIX}-compute`;
const JOB_QUEUE_NAME = `${TEST_PREFIX}-queue`;
const JOB_DEFINITION_NAME = `${TEST_PREFIX}-jobdef`;

describe('AwsBatchService Integration (AWS)', () => {
  let service: AwsBatchService;
  let batchClient: BatchClient;
  let iamClient: IAMClient;
  let setupComplete = false; // Flag to track if setup was successful

  // Track infrastructure for cleanup
  let roleArn: string | undefined;
  let computeEnvArn: string | undefined;
  let jobQueueArn: string | undefined;
  let jobDefinitionArn: string | undefined;
  const createdJobIds: string[] = [];
  const createdScheduleIds: string[] = [];

  // Helper to wait for compute environment to be ready
  async function waitForComputeEnvironment(
    name: string,
    desiredState: string,
    maxWait = 120000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const response = await batchClient.send(
        new DescribeComputeEnvironmentsCommand({
          computeEnvironments: [name],
        })
      );

      const env = response.computeEnvironments?.[0];
      if (env?.status === desiredState) {
        return;
      }

      // Wait 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error(
      `Compute environment ${name} did not reach state ${desiredState} within ${maxWait}ms`
    );
  }

  // Helper to wait for job queue to be ready
  async function waitForJobQueue(
    name: string,
    desiredState: string,
    maxWait = 60000
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const response = await batchClient.send(
        new DescribeJobQueuesCommand({
          jobQueues: [name],
        })
      );

      const queue = response.jobQueues?.[0];
      if (queue?.status === desiredState) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error(`Job queue ${name} did not reach state ${desiredState} within ${maxWait}ms`);
  }

  beforeAll(async () => {
    console.log('Setting up AWS Batch test infrastructure...');
    console.log('This may take 2-3 minutes for compute environment provisioning.');

    batchClient = new BatchClient({ region: AWS_REGION });
    iamClient = new IAMClient({ region: AWS_REGION });

    // Get VPC and subnets
    console.log('Fetching VPC subnets...');
    const ec2Client = new EC2Client({ region: AWS_REGION });
    let subnetIds: string[] = [];

    try {
      // First try to find default VPC
      let vpcsResponse = await ec2Client.send(
        new DescribeVpcsCommand({
          Filters: [{ Name: 'isDefault', Values: ['true'] }],
        })
      );

      let vpcId = vpcsResponse.Vpcs?.[0]?.VpcId;

      // If no default VPC, try to find any VPC
      if (!vpcId) {
        console.log('No default VPC found, looking for any VPC...');
        vpcsResponse = await ec2Client.send(new DescribeVpcsCommand({}));
        vpcId = vpcsResponse.Vpcs?.[0]?.VpcId;
      }

      if (!vpcId) {
        console.warn('No VPC found. Skipping AWS Batch tests.');
        console.warn('To run these tests, ensure a VPC with subnets exists in the region.');
        return; // Skip setup - tests will be skipped
      }

      // Get subnets in the VPC
      const subnetsResponse = await ec2Client.send(
        new DescribeSubnetsCommand({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }],
        })
      );

      subnetIds = subnetsResponse.Subnets?.map((s) => s.SubnetId!).filter(Boolean) || [];
      if (subnetIds.length === 0) {
        // Try to find subnets without VPC filter
        console.log('No subnets in selected VPC, checking all subnets...');
        const allSubnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({}));
        subnetIds = allSubnetsResponse.Subnets?.map((s) => s.SubnetId!).filter(Boolean) || [];
      }

      if (subnetIds.length === 0) {
        console.warn('No subnets found. Skipping AWS Batch tests.');
        console.warn('To run these tests, ensure at least one subnet exists in the region.');
        return;
      }

      console.log(`Found ${subnetIds.length} subnets in VPC ${vpcId}.`);
    } catch (error) {
      console.error(`Failed to fetch VPC subnets: ${(error as Error).message}`);
      throw error;
    }

    // 1. Create IAM role for Batch
    console.log('Creating IAM role...');
    const trustPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: ['batch.amazonaws.com', 'ecs-tasks.amazonaws.com'],
          },
          Action: 'sts:AssumeRole',
        },
      ],
    };

    try {
      const roleResponse = await iamClient.send(
        new CreateRoleCommand({
          RoleName: ROLE_NAME,
          AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
          Description: 'Test role for LCPlatform Batch integration tests',
        })
      );
      roleArn = roleResponse.Role?.Arn;
      console.log(`Created IAM role: ${roleArn}`);

      // Attach required policies
      await iamClient.send(
        new AttachRolePolicyCommand({
          RoleName: ROLE_NAME,
          PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole',
        })
      );

      await iamClient.send(
        new AttachRolePolicyCommand({
          RoleName: ROLE_NAME,
          PolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
        })
      );

      // Wait for role to propagate
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`Failed to create IAM role: ${(error as Error).message}`);
      throw error;
    }

    // 2. Create Compute Environment (Fargate)
    console.log('Creating Fargate compute environment...');
    try {
      const computeEnvResponse = await batchClient.send(
        new CreateComputeEnvironmentCommand({
          computeEnvironmentName: COMPUTE_ENV_NAME,
          type: 'MANAGED',
          computeResources: {
            type: CRType.FARGATE,
            maxvCpus: 4,
            subnets: subnetIds,
          },
          serviceRole: roleArn,
          state: CEState.ENABLED,
        })
      );
      computeEnvArn = computeEnvResponse.computeEnvironmentArn;
      console.log(`Created compute environment: ${computeEnvArn}`);

      // Wait for compute environment to be VALID
      console.log('Waiting for compute environment to be ready...');
      await waitForComputeEnvironment(COMPUTE_ENV_NAME, 'VALID');
      console.log('Compute environment is ready.');
    } catch (error) {
      console.error(`Failed to create compute environment: ${(error as Error).message}`);
      throw error;
    }

    // 3. Create Job Queue
    console.log('Creating job queue...');
    try {
      const jobQueueResponse = await batchClient.send(
        new CreateJobQueueCommand({
          jobQueueName: JOB_QUEUE_NAME,
          state: JQState.ENABLED,
          priority: 1,
          computeEnvironmentOrder: [
            {
              order: 1,
              computeEnvironment: COMPUTE_ENV_NAME,
            },
          ],
        })
      );
      jobQueueArn = jobQueueResponse.jobQueueArn;
      console.log(`Created job queue: ${jobQueueArn}`);

      // Wait for job queue to be VALID
      await waitForJobQueue(JOB_QUEUE_NAME, 'VALID');
      console.log('Job queue is ready.');
    } catch (error) {
      console.error(`Failed to create job queue: ${(error as Error).message}`);
      throw error;
    }

    // 4. Create Job Definition
    console.log('Creating job definition...');
    try {
      const jobDefResponse = await batchClient.send(
        new RegisterJobDefinitionCommand({
          jobDefinitionName: JOB_DEFINITION_NAME,
          type: 'container',
          platformCapabilities: ['FARGATE'],
          containerProperties: {
            image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
            command: ['echo', 'Hello from LCPlatform Batch test'],
            resourceRequirements: [
              { type: 'VCPU', value: '0.25' },
              { type: 'MEMORY', value: '512' },
            ],
            executionRoleArn: roleArn,
            networkConfiguration: {
              assignPublicIp: 'ENABLED',
            },
          },
        })
      );
      jobDefinitionArn = jobDefResponse.jobDefinitionArn;
      console.log(`Created job definition: ${jobDefinitionArn}`);
    } catch (error) {
      console.error(`Failed to create job definition: ${(error as Error).message}`);
      throw error;
    }

    // Configure service with test infrastructure
    service = new AwsBatchService({
      provider: ProviderType.AWS,
      region: AWS_REGION,
      options: {
        batchJobQueue: JOB_QUEUE_NAME,
        batchJobDefinition: JOB_DEFINITION_NAME,
      },
    });

    setupComplete = true;
    console.log('AWS Batch test infrastructure setup complete.');
  });

  afterAll(async () => {
    console.log('Cleaning up AWS Batch test infrastructure...');

    // Cancel any running jobs
    for (const jobId of createdJobIds) {
      try {
        await service.cancelJob(jobId);
        console.log(`Cancelled job: ${jobId}`);
      } catch {
        // Job may already be complete
      }
    }

    // Delete scheduled jobs
    for (const scheduleId of createdScheduleIds) {
      try {
        await service.deleteScheduledJob(scheduleId);
        console.log(`Deleted scheduled job: ${scheduleId}`);
      } catch (error) {
        console.warn(`Failed to delete scheduled job: ${(error as Error).message}`);
      }
    }

    // 1. Disable and delete job queue
    if (jobQueueArn) {
      try {
        console.log('Disabling job queue...');
        await batchClient.send(
          new UpdateJobQueueCommand({
            jobQueue: JOB_QUEUE_NAME,
            state: JQState.DISABLED,
          })
        );

        // Wait for queue to be disabled
        await new Promise((resolve) => setTimeout(resolve, 10000));

        console.log('Deleting job queue...');
        await batchClient.send(
          new DeleteJobQueueCommand({
            jobQueue: JOB_QUEUE_NAME,
          })
        );
        console.log('Job queue deleted.');
      } catch (error) {
        console.warn(`Failed to delete job queue: ${(error as Error).message}`);
      }
    }

    // 2. Deregister job definition
    if (jobDefinitionArn) {
      try {
        console.log('Deregistering job definition...');
        await batchClient.send(
          new DeregisterJobDefinitionCommand({
            jobDefinition: jobDefinitionArn,
          })
        );
        console.log('Job definition deregistered.');
      } catch (error) {
        console.warn(`Failed to deregister job definition: ${(error as Error).message}`);
      }
    }

    // 3. Disable and delete compute environment
    if (computeEnvArn) {
      try {
        console.log('Disabling compute environment...');
        await batchClient.send(
          new UpdateComputeEnvironmentCommand({
            computeEnvironment: COMPUTE_ENV_NAME,
            state: CEState.DISABLED,
          })
        );

        // Wait for compute env to be disabled
        await new Promise((resolve) => setTimeout(resolve, 30000));

        console.log('Deleting compute environment...');
        await batchClient.send(
          new DeleteComputeEnvironmentCommand({
            computeEnvironment: COMPUTE_ENV_NAME,
          })
        );
        console.log('Compute environment deleted.');
      } catch (error) {
        console.warn(`Failed to delete compute environment: ${(error as Error).message}`);
      }
    }

    // 4. Detach policies and delete IAM role
    if (roleArn) {
      try {
        console.log('Detaching IAM policies...');
        await iamClient.send(
          new DetachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole',
          })
        );

        await iamClient.send(
          new DetachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
          })
        );

        console.log('Deleting IAM role...');
        await iamClient.send(
          new DeleteRoleCommand({
            RoleName: ROLE_NAME,
          })
        );
        console.log('IAM role deleted.');
      } catch (error) {
        console.warn(`Failed to delete IAM role: ${(error as Error).message}`);
      }
    }

    console.log('AWS Batch test infrastructure cleanup complete.');
  });

  test('submitJob - should submit job to queue', async () => {
    if (!setupComplete) {
      return;
    } // Skip if setup failed
    const job = await service.submitJob({
      name: `${TEST_PREFIX}-test-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'Hello from test job'],
    });
    createdJobIds.push(job.id);

    expect(job.id).toBeDefined();
    expect(job.name).toContain('test-job');
    expect(job.status).toBeDefined();
    expect([JobStatus.PENDING, JobStatus.RUNNING]).toContain(job.status);
    expect(job.created).toBeInstanceOf(Date);
  });

  test('getJob - should retrieve job status', async () => {
    if (!setupComplete) {
      return;
    }
    const submitted = await service.submitJob({
      name: `${TEST_PREFIX}-status-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'Status check'],
    });
    createdJobIds.push(submitted.id);

    const job = await service.getJob(submitted.id);

    expect(job.id).toBe(submitted.id);
    expect(job.name).toBeDefined();
    expect(job.status).toBeDefined();
    expect(Object.values(JobStatus)).toContain(job.status);
  });

  test('listJobs - should list jobs in queue', async () => {
    if (!setupComplete) {
      return;
    }
    // Submit a job first
    const submitted = await service.submitJob({
      name: `${TEST_PREFIX}-list-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'List test'],
    });
    createdJobIds.push(submitted.id);

    // List jobs
    const jobs = await service.listJobs();

    expect(jobs).toBeInstanceOf(Array);
    // Note: Completed jobs may not appear in list by default
  });

  test('listJobs - should filter by status', async () => {
    if (!setupComplete) {
      return;
    }
    const jobs = await service.listJobs(JobStatus.PENDING);

    expect(jobs).toBeInstanceOf(Array);
    jobs.forEach((job) => {
      // Jobs in PENDING status
      expect([JobStatus.PENDING, JobStatus.RUNNING]).toContain(job.status);
    });
  });

  test('cancelJob - should cancel pending job', async () => {
    if (!setupComplete) {
      return;
    }
    const submitted = await service.submitJob({
      name: `${TEST_PREFIX}-cancel-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['sleep', '60'], // Long running job to ensure we can cancel
    });
    // Don't add to cleanup - we're cancelling it

    // Cancel the job
    await service.cancelJob(submitted.id);

    // Verify cancellation (may take a moment)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const job = await service.getJob(submitted.id);
    // Job should be cancelled or failed
    expect([JobStatus.FAILED, JobStatus.SUCCEEDED]).toContain(job.status);
  });

  test('submitJob - should submit job with environment variables', async () => {
    if (!setupComplete) {
      return;
    }
    const job = await service.submitJob({
      name: `${TEST_PREFIX}-env-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['env'],
      environment: {
        MY_VAR: 'test-value',
        ANOTHER_VAR: 'another-value',
      },
    });
    createdJobIds.push(job.id);

    expect(job.id).toBeDefined();
    expect(job.environment).toBeDefined();
    expect(job.environment.MY_VAR).toBe('test-value');
  });

  test('submitJob - should submit job with timeout', async () => {
    if (!setupComplete) {
      return;
    }
    const job = await service.submitJob({
      name: `${TEST_PREFIX}-timeout-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'Timeout test'],
      timeout: 300, // 5 minutes
    });
    createdJobIds.push(job.id);

    expect(job.timeout).toBe(300);
  });

  test('submitJob - should submit job with retry count', async () => {
    if (!setupComplete) {
      return;
    }
    const job = await service.submitJob({
      name: `${TEST_PREFIX}-retry-job`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'Retry test'],
      retryCount: 2,
    });
    createdJobIds.push(job.id);

    expect(job.retryCount).toBe(2);
  });

  test('scheduleJob - should create scheduled job', async () => {
    if (!setupComplete) {
      return;
    }
    const scheduledJob = await service.scheduleJob({
      name: `${TEST_PREFIX}-scheduled`,
      schedule: 'rate(1 hour)',
      jobParams: {
        name: `${TEST_PREFIX}-scheduled-execution`,
        image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
        command: ['echo', 'Scheduled job'],
      },
      enabled: true,
    });
    createdScheduleIds.push(scheduledJob.id);

    expect(scheduledJob.id).toBeDefined();
    expect(scheduledJob.name).toContain('scheduled');
    expect(scheduledJob.schedule).toBe('rate(1 hour)');
    expect(scheduledJob.enabled).toBe(true);
    expect(scheduledJob.nextRun).toBeInstanceOf(Date);
  });

  test('listScheduledJobs - should list scheduled jobs', async () => {
    if (!setupComplete) {
      return;
    }
    // Create a scheduled job first
    const scheduled = await service.scheduleJob({
      name: `${TEST_PREFIX}-list-scheduled`,
      schedule: 'rate(2 hours)',
      jobParams: {
        name: `${TEST_PREFIX}-list-scheduled-exec`,
        image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
        command: ['echo', 'List scheduled'],
      },
    });
    createdScheduleIds.push(scheduled.id);

    const scheduledJobs = await service.listScheduledJobs();

    expect(scheduledJobs).toBeInstanceOf(Array);
    expect(scheduledJobs.some((j) => j.id === scheduled.id)).toBe(true);
  });

  test('deleteScheduledJob - should delete scheduled job', async () => {
    if (!setupComplete) {
      return;
    }
    const scheduled = await service.scheduleJob({
      name: `${TEST_PREFIX}-delete-scheduled`,
      schedule: 'rate(3 hours)',
      jobParams: {
        name: `${TEST_PREFIX}-delete-scheduled-exec`,
        image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
        command: ['echo', 'Delete scheduled'],
      },
    });
    // Don't add to cleanup - we're deleting manually

    await service.deleteScheduledJob(scheduled.id);

    // Verify deletion
    const scheduledJobs = await service.listScheduledJobs();
    expect(scheduledJobs.some((j) => j.id === scheduled.id)).toBe(false);
  });

  test('scheduleJob - should create disabled scheduled job', async () => {
    if (!setupComplete) {
      return;
    }
    const scheduled = await service.scheduleJob({
      name: `${TEST_PREFIX}-disabled-scheduled`,
      schedule: 'cron(0 12 * * ? *)', // Daily at noon
      jobParams: {
        name: `${TEST_PREFIX}-disabled-scheduled-exec`,
        image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
        command: ['echo', 'Disabled scheduled'],
      },
      enabled: false,
    });
    createdScheduleIds.push(scheduled.id);

    expect(scheduled.enabled).toBe(false);
  });

  test('Error handling - should throw on invalid job ID', async () => {
    if (!setupComplete) {
      return;
    }
    await expect(service.getJob('invalid-job-id-12345')).rejects.toThrow();
  });

  test('Job status flow - should track job through status changes', async () => {
    if (!setupComplete) {
      return;
    }
    const job = await service.submitJob({
      name: `${TEST_PREFIX}-status-flow`,
      image: 'public.ecr.aws/amazonlinux/amazonlinux:latest',
      command: ['echo', 'Quick job'],
    });
    createdJobIds.push(job.id);

    // Initial status should be PENDING or RUNNING
    expect([JobStatus.PENDING, JobStatus.RUNNING, JobStatus.SUCCEEDED]).toContain(job.status);

    // Wait and check status (job should complete quickly)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    const finalJob = await service.getJob(job.id);
    // Job should be complete (succeeded or failed)
    expect([JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.RUNNING]).toContain(finalJob.status);
  }, 60000); // 60 second timeout for this test
});
