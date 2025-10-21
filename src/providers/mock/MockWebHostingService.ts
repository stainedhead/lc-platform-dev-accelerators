/**
 * Mock WebHostingService Implementation
 *
 * In-memory implementation for testing without cloud resources.
 * Simulates deployment lifecycle with latency.
 *
 * Constitution Principle VI: Mock Provider Completeness
 */

import type { WebHostingService } from '../../core/services/WebHostingService';
import type {
  Deployment,
  DeployApplicationParams,
  ScaleParams,
  UpdateApplicationParams,
} from '../../core/types/deployment';
import { DeploymentStatus } from '../../core/types/deployment';
import { ResourceNotFoundError, ValidationError } from '../../core/types/common';

export class MockWebHostingService implements WebHostingService {
  private deployments = new Map<string, Deployment>();
  private idCounter = 1;

  async deployApplication(params: DeployApplicationParams): Promise<Deployment> {
    // Validate input
    if (!params.name || !params.image) {
      throw new ValidationError('Name and image are required');
    }

    // Simulate deployment creation
    const id = `mock-deploy-${this.idCounter++}`;
    const deployment: Deployment = {
      id,
      name: params.name,
      url: `https://${params.name}.mock.lcplatform.com`,
      status: DeploymentStatus.CREATING,
      image: params.image,
      cpu: params.cpu ?? 1,
      memory: params.memory ?? 2048,
      minInstances: params.minInstances ?? 1,
      maxInstances: params.maxInstances ?? 10,
      currentInstances: params.minInstances ?? 1,
      created: new Date(),
      lastUpdated: new Date(),
      environment: params.environment ?? {},
    };

    this.deployments.set(id, deployment);

    // Simulate async deployment (transition to RUNNING after delay)
    setTimeout(() => {
      const current = this.deployments.get(id);
      if (current) {
        current.status = DeploymentStatus.RUNNING;
        current.lastUpdated = new Date();
      }
    }, 100);

    return deployment;
  }

  async getDeployment(deploymentId: string): Promise<Deployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new ResourceNotFoundError('Deployment', deploymentId);
    }
    return { ...deployment };
  }

  async updateApplication(
    deploymentId: string,
    params: UpdateApplicationParams
  ): Promise<Deployment> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new ResourceNotFoundError('Deployment', deploymentId);
    }

    // Update deployment
    deployment.status = DeploymentStatus.UPDATING;
    if (params.image) {
      deployment.image = params.image;
    }
    if (params.environment) {
      deployment.environment = { ...deployment.environment, ...params.environment };
    }
    if (params.cpu !== undefined) {
      deployment.cpu = params.cpu;
    }
    if (params.memory !== undefined) {
      deployment.memory = params.memory;
    }
    deployment.lastUpdated = new Date();

    // Simulate async update (transition to RUNNING after delay)
    setTimeout(() => {
      deployment.status = DeploymentStatus.RUNNING;
      deployment.lastUpdated = new Date();
    }, 100);

    return { ...deployment };
  }

  async deleteApplication(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new ResourceNotFoundError('Deployment', deploymentId);
    }

    deployment.status = DeploymentStatus.DELETING;

    // Simulate async deletion
    setTimeout(() => {
      this.deployments.delete(deploymentId);
    }, 50);
  }

  async getApplicationUrl(deploymentId: string): Promise<string> {
    const deployment = await this.getDeployment(deploymentId);
    return deployment.url;
  }

  async scaleApplication(deploymentId: string, params: ScaleParams): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new ResourceNotFoundError('Deployment', deploymentId);
    }

    if (params.minInstances !== undefined) {
      deployment.minInstances = params.minInstances;
    }
    if (params.maxInstances !== undefined) {
      deployment.maxInstances = params.maxInstances;
    }

    // Adjust current instances to be within new range
    deployment.currentInstances = Math.max(
      deployment.minInstances,
      Math.min(deployment.currentInstances, deployment.maxInstances)
    );

    deployment.lastUpdated = new Date();
  }
}
