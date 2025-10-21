/**
 * Mock Batch Service Implementation
 * In-memory batch job processing for testing
 */

import type { BatchService } from '../../core/services/BatchService';
import type { Job, JobParams, ScheduledJob, ScheduleJobParams } from '../../core/types/job';
import { JobStatus } from '../../core/types/job';
import { ResourceNotFoundError } from '../../core/types/common';

export class MockBatchService implements BatchService {
  private jobs = new Map<string, Job>();
  private scheduledJobs = new Map<string, ScheduledJob>();
  private jobCounter = 1;
  private scheduleCounter = 1;

  async submitJob(params: JobParams): Promise<Job> {
    const jobId = `mock-job-${this.jobCounter++}`;

    const job: Job = {
      id: jobId,
      name: params.name,
      image: params.image,
      environment: params.environment ?? {},
      cpu: params.cpu ?? 1,
      memory: params.memory ?? 2048,
      timeout: params.timeout ?? 3600,
      retryCount: params.retryCount ?? 0,
      attemptsMade: 0,
      status: JobStatus.PENDING,
      created: new Date(),
    };

    if (params.command) {
      job.command = params.command;
    }

    this.jobs.set(jobId, job);

    // Simulate async job execution
    setTimeout(() => {
      this.simulateJobExecution(jobId);
    }, 100);

    return job;
  }

  async getJob(jobId: string): Promise<Job> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new ResourceNotFoundError('Job', jobId);
    }
    return job;
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new ResourceNotFoundError('Job', jobId);
    }

    if (job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING) {
      job.status = JobStatus.CANCELLED;
      job.completed = new Date();
      job.errorMessage = 'Job cancelled by user';
    }
  }

  async listJobs(status?: JobStatus): Promise<Job[]> {
    const allJobs = Array.from(this.jobs.values());

    if (status !== undefined) {
      return allJobs.filter((job) => job.status === status);
    }

    return allJobs;
  }

  async scheduleJob(params: ScheduleJobParams): Promise<ScheduledJob> {
    const scheduleId = `mock-schedule-${this.scheduleCounter++}`;

    const scheduledJob: ScheduledJob = {
      id: scheduleId,
      name: params.name,
      schedule: params.schedule,
      jobParams: params.jobParams,
      enabled: params.enabled ?? true,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(params.schedule),
    };

    this.scheduledJobs.set(scheduleId, scheduledJob);
    return scheduledJob;
  }

  async deleteScheduledJob(scheduleId: string): Promise<void> {
    const exists = this.scheduledJobs.has(scheduleId);
    if (!exists) {
      throw new ResourceNotFoundError('ScheduledJob', scheduleId);
    }
    this.scheduledJobs.delete(scheduleId);
  }

  async listScheduledJobs(): Promise<ScheduledJob[]> {
    return Array.from(this.scheduledJobs.values());
  }

  // Helper methods
  private simulateJobExecution(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    // Start job
    job.status = JobStatus.RUNNING;
    job.started = new Date();

    // Simulate completion after 500ms
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status === JobStatus.RUNNING) {
        // 90% success rate
        const success = Math.random() > 0.1;

        currentJob.status = success ? JobStatus.SUCCEEDED : JobStatus.FAILED;
        currentJob.completed = new Date();
        currentJob.exitCode = success ? 0 : 1;

        if (!success) {
          currentJob.errorMessage = 'Mock job failed randomly';
        }
      }
    }, 500);
  }

  private calculateNextRun(_schedule: string): Date {
    // Simple mock: schedule for 1 hour from now
    // In real implementation, parse cron expression
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  }
}
