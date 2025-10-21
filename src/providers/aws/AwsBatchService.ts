/**
 * AWS Batch Service Implementation
 * Uses AWS Batch for container-based batch job processing
 */

import {
  BatchClient,
  SubmitJobCommand,
  DescribeJobsCommand,
  TerminateJobCommand,
  ListJobsCommand,
  JobStatus as AwsJobStatus,
} from '@aws-sdk/client-batch';
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  DeleteRuleCommand,
  RemoveTargetsCommand,
  ListRulesCommand,
} from '@aws-sdk/client-eventbridge';
import type { BatchService } from '../../core/services/BatchService';
import type { Job, JobParams, ScheduledJob, ScheduleJobParams } from '../../core/types/job';
import { JobStatus } from '../../core/types/job';
import type { ProviderConfig } from '../../core/types/common';
import { ResourceNotFoundError, ServiceUnavailableError } from '../../core/types/common';

export class AwsBatchService implements BatchService {
  private batchClient: BatchClient;
  private eventBridgeClient: EventBridgeClient;
  private jobQueue: string;
  private jobDefinition: string;

  constructor(config: ProviderConfig) {
    const clientConfig: {
      region?: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = {};

    if (config.region) {
      clientConfig.region = config.region;
    }

    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      };
    }

    this.batchClient = new BatchClient(clientConfig);
    this.eventBridgeClient = new EventBridgeClient(clientConfig);

    // Use provided job queue and definition, or defaults
    this.jobQueue = String(config.options?.batchJobQueue || 'lcplatform-job-queue');
    this.jobDefinition = String(config.options?.batchJobDefinition || 'lcplatform-job-definition');
  }

  async submitJob(params: JobParams): Promise<Job> {
    try {
      const command = new SubmitJobCommand({
        jobName: params.name,
        jobQueue: this.jobQueue,
        jobDefinition: this.jobDefinition,
        containerOverrides: {
          command: params.command,
          environment: Object.entries(params.environment ?? {}).map(([key, value]) => ({
            name: key,
            value,
          })),
          resourceRequirements: [
            {
              type: 'VCPU',
              value: (params.cpu ?? 1).toString(),
            },
            {
              type: 'MEMORY',
              value: (params.memory ?? 2048).toString(),
            },
          ],
        },
        timeout: {
          attemptDurationSeconds: params.timeout ?? 3600,
        },
        retryStrategy: {
          attempts: (params.retryCount ?? 0) + 1,
        },
      });

      const response = await this.batchClient.send(command);

      if (!response.jobId) {
        throw new ServiceUnavailableError('Failed to submit job to AWS Batch');
      }

      // Get job details
      return await this.getJob(response.jobId);
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to submit batch job: ${(error as Error).message}`);
    }
  }

  async getJob(jobId: string): Promise<Job> {
    try {
      const command = new DescribeJobsCommand({
        jobs: [jobId],
      });

      const response = await this.batchClient.send(command);

      if (!response.jobs || response.jobs.length === 0) {
        throw new ResourceNotFoundError('Job', jobId);
      }

      const awsJob = response.jobs[0];
      if (!awsJob) {
        throw new ResourceNotFoundError('Job', jobId);
      }

      const job: Job = {
        id: awsJob.jobId || jobId,
        name: awsJob.jobName || '',
        status: this.mapAwsJobStatus(awsJob.status || AwsJobStatus.FAILED),
        image: awsJob.container?.image || '',
        environment: this.mapEnvironmentVariables(awsJob.container?.environment || []),
        cpu: this.extractResourceRequirement(awsJob.container?.resourceRequirements, 'VCPU'),
        memory: this.extractResourceRequirement(awsJob.container?.resourceRequirements, 'MEMORY'),
        timeout: awsJob.timeout?.attemptDurationSeconds ?? 3600,
        retryCount: (awsJob.retryStrategy?.attempts ?? 1) - 1,
        attemptsMade: awsJob.attempts?.length ?? 0,
        created: new Date(awsJob.createdAt ?? Date.now()),
      };

      if (awsJob.container?.command) {
        job.command = awsJob.container.command;
      }

      if (awsJob.startedAt) {
        job.started = new Date(awsJob.startedAt);
      }

      if (awsJob.stoppedAt) {
        job.completed = new Date(awsJob.stoppedAt);
      }

      if (awsJob.container?.exitCode !== undefined) {
        job.exitCode = awsJob.container.exitCode;
      }

      if (awsJob.statusReason) {
        job.errorMessage = awsJob.statusReason;
      }

      return job;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new ServiceUnavailableError(`Failed to get job details: ${(error as Error).message}`);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    try {
      const command = new TerminateJobCommand({
        jobId,
        reason: 'Job cancelled by user',
      });

      await this.batchClient.send(command);
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to cancel job: ${(error as Error).message}`);
    }
  }

  async listJobs(status?: JobStatus): Promise<Job[]> {
    try {
      const command = new ListJobsCommand({
        jobQueue: this.jobQueue,
        jobStatus: status !== undefined ? this.mapToAwsJobStatus(status) : undefined,
        maxResults: 100,
      });

      const response = await this.batchClient.send(command);

      const jobs = await Promise.all(
        (response.jobSummaryList || []).map(async (summary) => {
          if (summary.jobId) {
            return await this.getJob(summary.jobId);
          }
          throw new Error('Job summary missing jobId');
        })
      );

      return jobs;
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to list jobs: ${(error as Error).message}`);
    }
  }

  async scheduleJob(params: ScheduleJobParams): Promise<ScheduledJob> {
    try {
      // Create EventBridge rule with cron expression
      const ruleName = `lcplatform-schedule-${params.name.replace(/[^a-zA-Z0-9-]/g, '-')}`;

      const putRuleCommand = new PutRuleCommand({
        Name: ruleName,
        Description: `Scheduled job: ${params.name}`,
        ScheduleExpression: this.convertToCronExpression(params.schedule),
        State: params.enabled !== false ? 'ENABLED' : 'DISABLED',
      });

      await this.eventBridgeClient.send(putRuleCommand);

      // Add Batch job as target
      const putTargetsCommand = new PutTargetsCommand({
        Rule: ruleName,
        Targets: [
          {
            Id: '1',
            Arn: `arn:aws:batch:${this.batchClient.config.region}:${await this.getAccountId()}:job-queue/${this.jobQueue}`,
            RoleArn: params.jobParams.environment?.EVENTBRIDGE_ROLE_ARN || '',
            BatchParameters: {
              JobDefinition: this.jobDefinition,
              JobName: params.jobParams.name,
            },
          },
        ],
      });

      await this.eventBridgeClient.send(putTargetsCommand);

      return {
        id: ruleName,
        name: params.name,
        schedule: params.schedule,
        jobParams: params.jobParams,
        enabled: params.enabled !== false,
        createdAt: new Date(),
        nextRun: this.calculateNextRun(params.schedule),
      };
    } catch (error) {
      throw new ServiceUnavailableError(`Failed to schedule job: ${(error as Error).message}`);
    }
  }

  async deleteScheduledJob(scheduleId: string): Promise<void> {
    try {
      // Remove targets first
      const removeTargetsCommand = new RemoveTargetsCommand({
        Rule: scheduleId,
        Ids: ['1'],
      });

      await this.eventBridgeClient.send(removeTargetsCommand);

      // Delete the rule
      const deleteRuleCommand = new DeleteRuleCommand({
        Name: scheduleId,
      });

      await this.eventBridgeClient.send(deleteRuleCommand);
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to delete scheduled job: ${(error as Error).message}`
      );
    }
  }

  async listScheduledJobs(): Promise<ScheduledJob[]> {
    try {
      const command = new ListRulesCommand({
        NamePrefix: 'lcplatform-schedule-',
      });

      const response = await this.eventBridgeClient.send(command);

      const scheduledJobs = await Promise.all(
        (response.Rules || []).map(async (rule) => {
          if (!rule.Name) {
            throw new Error('Rule missing Name');
          }

          return {
            id: rule.Name,
            name: rule.Name.replace('lcplatform-schedule-', ''),
            schedule: rule.ScheduleExpression || '',
            jobParams: {
              name: rule.Name,
              image: '',
            },
            enabled: rule.State === 'ENABLED',
            createdAt: new Date(),
            nextRun: this.calculateNextRun(rule.ScheduleExpression || ''),
          };
        })
      );

      return scheduledJobs;
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to list scheduled jobs: ${(error as Error).message}`
      );
    }
  }

  // Helper methods
  private mapAwsJobStatus(awsStatus: AwsJobStatus): JobStatus {
    switch (awsStatus) {
      case AwsJobStatus.SUBMITTED:
      case AwsJobStatus.PENDING:
      case AwsJobStatus.RUNNABLE:
        return JobStatus.PENDING;
      case AwsJobStatus.STARTING:
      case AwsJobStatus.RUNNING:
        return JobStatus.RUNNING;
      case AwsJobStatus.SUCCEEDED:
        return JobStatus.SUCCEEDED;
      case AwsJobStatus.FAILED:
        return JobStatus.FAILED;
      default:
        return JobStatus.FAILED;
    }
  }

  private mapToAwsJobStatus(status: JobStatus): AwsJobStatus {
    switch (status) {
      case JobStatus.PENDING:
        return AwsJobStatus.RUNNABLE;
      case JobStatus.RUNNING:
        return AwsJobStatus.RUNNING;
      case JobStatus.SUCCEEDED:
        return AwsJobStatus.SUCCEEDED;
      case JobStatus.FAILED:
        return AwsJobStatus.FAILED;
      default:
        return AwsJobStatus.FAILED;
    }
  }

  private mapEnvironmentVariables(env: unknown[] | undefined): Record<string, string> {
    if (!env) {
      return {};
    }
    const result: Record<string, string> = {};
    env.forEach((e: unknown) => {
      const entry = e as { name?: string; value?: string };
      if (entry.name && entry.value) {
        result[entry.name] = entry.value;
      }
    });
    return result;
  }

  private extractResourceRequirement(requirements: unknown[] | undefined, type: string): number {
    if (!requirements) {
      return type === 'VCPU' ? 1 : 2048;
    }
    const req = requirements.find((r: unknown) => {
      const requirement = r as { type?: string; value?: string };
      return requirement.type === type;
    });
    const requirement = req as { type?: string; value?: string } | undefined;
    return requirement?.value ? parseInt(requirement.value, 10) : type === 'VCPU' ? 1 : 2048;
  }

  private convertToCronExpression(schedule: string): string {
    // If already in EventBridge cron format, return as-is
    if (schedule.startsWith('cron(') || schedule.startsWith('rate(')) {
      return schedule;
    }

    // Convert standard cron to EventBridge cron format
    // EventBridge cron: cron(Minutes Hours Day-of-month Month Day-of-week Year)
    return `cron(${schedule} *)`;
  }

  private calculateNextRun(_schedule: string): Date {
    // Simple implementation: return 1 hour from now
    // In production, use a cron parser library
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  }

  private async getAccountId(): Promise<string> {
    // In production, use STS GetCallerIdentity
    // For now, return a placeholder
    return '123456789012';
  }
}
