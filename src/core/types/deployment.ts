/**
 * Deployment Types
 *
 * Types for WebHostingService - deploying containerized applications
 * Provider-agnostic abstractions for AWS App Runner, Azure Container Apps, etc.
 */

export enum DeploymentStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  UPDATING = 'updating',
  DELETING = 'deleting',
  FAILED = 'failed',
  STOPPED = 'stopped',
}

export interface Deployment {
  id: string;
  name: string;
  url: string;
  status: DeploymentStatus;
  image: string;
  cpu: number;
  memory: number;
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  created: Date;
  lastUpdated: Date;
  environment: Record<string, string>;
}

export interface DeployApplicationParams {
  name: string;
  image: string;
  port?: number;
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
  minInstances?: number;
  maxInstances?: number;
}

export interface UpdateApplicationParams {
  image?: string;
  environment?: Record<string, string>;
  cpu?: number;
  memory?: number;
}

export interface ScaleParams {
  minInstances?: number;
  maxInstances?: number;
}
