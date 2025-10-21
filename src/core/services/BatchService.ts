/**
 * Batch Service Interface
 * Provides cloud-agnostic batch job processing capabilities
 */

import type {
  Job,
  JobParams,
  ScheduledJob,
  ScheduleJobParams,
  JobStatus,
} from '../types/job';

export interface BatchService {
  /**
   * Submit a batch job for execution
   * @param params Job configuration parameters
   * @returns The created job with ID and initial status
   */
  submitJob(params: JobParams): Promise<Job>;

  /**
   * Get the current status and details of a job
   * @param jobId Unique identifier of the job
   * @returns Job details including status, progress, and results
   */
  getJob(jobId: string): Promise<Job>;

  /**
   * Cancel a running or pending job
   * @param jobId Unique identifier of the job to cancel
   */
  cancelJob(jobId: string): Promise<void>;

  /**
   * List all jobs, optionally filtered by status
   * @param status Optional status filter
   * @returns Array of jobs matching the filter
   */
  listJobs(status?: JobStatus): Promise<Job[]>;

  /**
   * Schedule a job to run on a recurring basis
   * @param params Scheduling configuration including cron expression
   * @returns The created scheduled job
   */
  scheduleJob(params: ScheduleJobParams): Promise<ScheduledJob>;

  /**
   * Remove a scheduled job
   * @param scheduleId Unique identifier of the scheduled job
   */
  deleteScheduledJob(scheduleId: string): Promise<void>;

  /**
   * List all scheduled jobs
   * @returns Array of all scheduled jobs
   */
  listScheduledJobs(): Promise<ScheduledJob[]>;
}
