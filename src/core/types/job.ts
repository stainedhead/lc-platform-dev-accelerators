/**
 * Job Types - Batch Processing
 */

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  image: string;
  command?: string[];
  environment: Record<string, string>;
  cpu: number;
  memory: number;
  timeout: number;
  retryCount: number;
  attemptsMade: number;
  created: Date;
  started?: Date;
  completed?: Date;
  exitCode?: number;
  errorMessage?: string;
}

export interface JobParams {
  name: string;
  image: string;
  command?: string[];
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
  timeout?: number;
  retryCount?: number;
}

export interface ListJobsParams {
  status?: JobStatus;
  limit?: number;
  nextToken?: string;
}

export interface ScheduleJobParams {
  name: string;
  schedule: string;
  jobParams: JobParams;
  enabled?: boolean;
}

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string;
  jobParams: JobParams;
  enabled: boolean;
  createdAt: Date;
  lastRun?: Date;
  nextRun: Date;
}
