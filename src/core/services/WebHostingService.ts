/**
 * WebHostingService Interface
 *
 * Cloud-agnostic interface for deploying and managing containerized web applications.
 * No AWS/Azure-specific types - pure abstraction.
 *
 * FR-001 to FR-005
 * Constitution Principle I: Provider Independence
 */

import type {
  Deployment,
  DeployApplicationParams,
  UpdateApplicationParams,
  ScaleParams,
} from '../types/deployment';

export interface WebHostingService {
  /**
   * Deploy a containerized application
   * FR-001: Deploy containerized applications with auto-scaling
   */
  deployApplication(params: DeployApplicationParams): Promise<Deployment>;

  /**
   * Get deployment status and details
   * FR-002: Get application URL and deployment status
   */
  getDeployment(deploymentId: string): Promise<Deployment>;

  /**
   * Update a running application (rolling update)
   * FR-003: Update application with zero downtime
   */
  updateApplication(
    deploymentId: string,
    params: UpdateApplicationParams
  ): Promise<Deployment>;

  /**
   * Delete an application deployment
   * FR-004: Delete application and clean up resources
   */
  deleteApplication(deploymentId: string): Promise<void>;

  /**
   * Get the public URL for an application
   * FR-002: Retrieve application URL
   */
  getApplicationUrl(deploymentId: string): Promise<string>;

  /**
   * Scale application instances
   * FR-005: Scale min/max instances
   */
  scaleApplication(deploymentId: string, params: ScaleParams): Promise<void>;
}
