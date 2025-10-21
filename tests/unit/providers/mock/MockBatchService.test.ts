/**
 * Unit Tests for MockBatchService
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { MockBatchService } from '../../../../src/providers/mock/MockBatchService';
import { JobStatus } from '../../../../src/core/types/job';

describe('MockBatchService', () => {
  let service: MockBatchService;

  beforeEach(() => {
    service = new MockBatchService();
  });

  describe('submitJob', () => {
    test('should submit a job and return job details', async () => {
      const job = await service.submitJob({
        name: 'test-job',
        image: 'ubuntu:latest',
        command: ['echo', 'hello'],
        environment: { TEST: 'value' },
      });

      expect(job.id).toMatch(/^mock-job-\d+$/);
      expect(job.name).toBe('test-job');
      expect(job.image).toBe('ubuntu:latest');
      expect(job.command).toEqual(['echo', 'hello']);
      expect(job.environment).toEqual({ TEST: 'value' });
      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.attemptsMade).toBe(0);
    });

    test('should apply default values for optional parameters', async () => {
      const job = await service.submitJob({
        name: 'minimal-job',
        image: 'alpine',
      });

      expect(job.cpu).toBe(1);
      expect(job.memory).toBe(2048);
      expect(job.timeout).toBe(3600);
      expect(job.retryCount).toBe(0);
      expect(job.environment).toEqual({});
    });

    test('should simulate async job execution', async () => {
      const job = await service.submitJob({
        name: 'async-job',
        image: 'node:18',
      });

      // Job should start as PENDING
      expect(job.status).toBe(JobStatus.PENDING);

      // Wait for simulated execution
      await new Promise((resolve) => setTimeout(resolve, 700));

      // Get updated job status
      const updatedJob = await service.getJob(job.id);
      expect([JobStatus.SUCCEEDED, JobStatus.FAILED]).toContain(updatedJob.status);
    });
  });

  describe('getJob', () => {
    test('should retrieve an existing job', async () => {
      const submittedJob = await service.submitJob({
        name: 'test-job',
        image: 'nginx',
      });

      const retrievedJob = await service.getJob(submittedJob.id);
      expect(retrievedJob.id).toBe(submittedJob.id);
      expect(retrievedJob.name).toBe('test-job');
    });

    test('should throw error for non-existent job', async () => {
      expect(service.getJob('non-existent-id')).rejects.toThrow('Job');
    });
  });

  describe('cancelJob', () => {
    test('should cancel a pending job', async () => {
      const job = await service.submitJob({
        name: 'cancel-test',
        image: 'alpine',
      });

      await service.cancelJob(job.id);

      const cancelledJob = await service.getJob(job.id);
      expect(cancelledJob.status).toBe(JobStatus.CANCELLED);
      expect(cancelledJob.errorMessage).toBe('Job cancelled by user');
    });

    test('should throw error when cancelling non-existent job', async () => {
      expect(service.cancelJob('non-existent')).rejects.toThrow('Job');
    });
  });

  describe('listJobs', () => {
    test('should list all jobs when no status filter provided', async () => {
      await service.submitJob({ name: 'job1', image: 'alpine' });
      await service.submitJob({ name: 'job2', image: 'ubuntu' });

      const jobs = await service.listJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter jobs by status', async () => {
      const job1 = await service.submitJob({ name: 'job1', image: 'alpine' });
      await service.submitJob({ name: 'job2', image: 'ubuntu' });
      await service.cancelJob(job1.id);

      const cancelledJobs = await service.listJobs(JobStatus.CANCELLED);
      expect(cancelledJobs.length).toBeGreaterThanOrEqual(1);
      expect(cancelledJobs.every((j) => j.status === JobStatus.CANCELLED)).toBe(true);
    });
  });

  describe('scheduleJob', () => {
    test('should create a scheduled job', async () => {
      const scheduled = await service.scheduleJob({
        name: 'daily-backup',
        schedule: '0 2 * * *',
        jobParams: {
          name: 'backup-job',
          image: 'backup:latest',
        },
      });

      expect(scheduled.id).toMatch(/^mock-schedule-\d+$/);
      expect(scheduled.name).toBe('daily-backup');
      expect(scheduled.schedule).toBe('0 2 * * *');
      expect(scheduled.enabled).toBe(true);
      expect(scheduled.nextRun).toBeInstanceOf(Date);
    });

    test('should create disabled scheduled job', async () => {
      const scheduled = await service.scheduleJob({
        name: 'disabled-job',
        schedule: '0 0 * * *',
        jobParams: { name: 'test', image: 'test' },
        enabled: false,
      });

      expect(scheduled.enabled).toBe(false);
    });
  });

  describe('deleteScheduledJob', () => {
    test('should delete a scheduled job', async () => {
      const scheduled = await service.scheduleJob({
        name: 'temp-schedule',
        schedule: '* * * * *',
        jobParams: { name: 'temp', image: 'temp' },
      });

      await service.deleteScheduledJob(scheduled.id);

      const schedules = await service.listScheduledJobs();
      expect(schedules.find((s) => s.id === scheduled.id)).toBeUndefined();
    });

    test('should throw error when deleting non-existent schedule', async () => {
      expect(service.deleteScheduledJob('non-existent')).rejects.toThrow('ScheduledJob');
    });
  });

  describe('listScheduledJobs', () => {
    test('should list all scheduled jobs', async () => {
      await service.scheduleJob({
        name: 'schedule1',
        schedule: '0 * * * *',
        jobParams: { name: 's1', image: 'img1' },
      });

      await service.scheduleJob({
        name: 'schedule2',
        schedule: '0 0 * * *',
        jobParams: { name: 's2', image: 'img2' },
      });

      const schedules = await service.listScheduledJobs();
      expect(schedules.length).toBeGreaterThanOrEqual(2);
    });
  });
});
