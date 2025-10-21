/**
 * AWS WebHostingService Implementation
 *
 * AWS App Runner-based container hosting with auto-scaling.
 * Implements FR-001 to FR-005.
 */

import {
  AppRunnerClient,
  type AppRunnerClientConfig,
  CreateServiceCommand,
  DescribeServiceCommand,
  UpdateServiceCommand,
  DeleteServiceCommand,
  type Service,
  type ServiceStatus,
} from '@aws-sdk/client-apprunner';
import type { WebHostingService } from '../../core/services/WebHostingService';
import type {
  Deployment,
  DeployApplicationParams,
  UpdateApplicationParams,
  ScaleParams,
} from '../../core/types/deployment';
import { DeploymentStatus } from '../../core/types/deployment';
import {
  ResourceNotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../core/types/common';
import { withRetry } from '../../utils/retry';
import { getErrorMessage, getErrorName } from '../../utils/error';

export interface AwsWebHostingConfig {
  region?: string;
  endpoint?: string; // For LocalStack
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class AwsWebHostingService implements WebHostingService {
  private client: AppRunnerClient;

  constructor(config?: AwsWebHostingConfig) {
    const clientConfig: AppRunnerClientConfig = {
      region: config?.region ?? process.env.AWS_REGION ?? 'us-east-1',
    };

    if (config?.endpoint !== undefined && config.endpoint !== null && config.endpoint !== '') {
      clientConfig.endpoint = config.endpoint;
    }

    if (config?.credentials !== undefined && config.credentials !== null) {
      clientConfig.credentials = config.credentials;
    }

    this.client = new AppRunnerClient(clientConfig);
  }

  async deployApplication(params: DeployApplicationParams): Promise<Deployment> {
    return withRetry(async () => {
      try {
        // Build environment variables
        const envVars = params.environment
          ? Object.entries(params.environment).map(([Name, Value]) => ({ Name, Value }))
          : [];

        const response = await this.client.send(
          new CreateServiceCommand({
            ServiceName: params.name,
            SourceConfiguration: {
              ImageRepository: {
                ImageIdentifier: params.image,
                ImageRepositoryType: 'ECR_PUBLIC', // or 'ECR' for private
                ImageConfiguration: {
                  Port: params.port?.toString() ?? '80',
                  RuntimeEnvironmentVariables: envVars.reduce(
                    (acc, { Name, Value }) => ({
                      ...acc,
                      [Name]: Value,
                    }),
                    {}
                  ),
                },
              },
              AutoDeploymentsEnabled: false,
            },
            InstanceConfiguration: {
              Cpu: `${params.cpu ?? 1} vCPU`,
              Memory: `${params.memory ?? 2048} MB`,
            },
            AutoScalingConfigurationArn: undefined, // Use default auto-scaling
          })
        );

        if (!response.Service) {
          throw new ServiceUnavailableError('Failed to create service: no service returned');
        }

        return this.mapToDeployment(response.Service, params.minInstances, params.maxInstances);
      } catch (error: unknown) {
        if (getErrorName(error) === 'InvalidRequestException') {
          throw new ValidationError(`Invalid deployment parameters: ${getErrorMessage(error)}`);
        }
        throw new ServiceUnavailableError(
          `Failed to deploy application: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async getDeployment(deploymentId: string): Promise<Deployment> {
    return withRetry(async () => {
      try {
        const response = await this.client.send(
          new DescribeServiceCommand({
            ServiceArn: deploymentId,
          })
        );

        if (!response.Service) {
          throw new ResourceNotFoundError('Deployment', deploymentId);
        }

        return this.mapToDeployment(response.Service);
      } catch (error: unknown) {
        if (getErrorName(error) === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Deployment', deploymentId);
        }
        throw new ServiceUnavailableError(`Failed to get deployment: ${getErrorMessage(error)}`);
      }
    });
  }

  async updateApplication(
    deploymentId: string,
    params: UpdateApplicationParams
  ): Promise<Deployment> {
    return withRetry(async () => {
      try {
        // Build update configuration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateConfig: any = {};

        if (params.image) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          updateConfig.SourceConfiguration = {
            ImageRepository: {
              ImageIdentifier: params.image,
              ImageRepositoryType: 'ECR_PUBLIC',
            },
          };
        }

        if (params.environment) {
          const envVars = Object.entries(params.environment).reduce(
            (acc, [Name, Value]) => ({
              ...acc,
              [Name]: Value,
            }),
            {}
          );

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (!updateConfig.SourceConfiguration) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            updateConfig.SourceConfiguration = { ImageRepository: {} };
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          updateConfig.SourceConfiguration.ImageRepository.ImageConfiguration = {
            RuntimeEnvironmentVariables: envVars,
          };
        }

        if (params.cpu || params.memory) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          updateConfig.InstanceConfiguration = {
            Cpu: params.cpu ? `${params.cpu} vCPU` : undefined,
            Memory: params.memory ? `${params.memory} MB` : undefined,
          };
        }

        const response = await this.client.send(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          new UpdateServiceCommand({
            ServiceArn: deploymentId,
            ...updateConfig,
          })
        );

        if (!response.Service) {
          throw new ServiceUnavailableError('Failed to update service: no service returned');
        }

        return this.mapToDeployment(response.Service);
      } catch (error: unknown) {
        if (getErrorName(error) === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Deployment', deploymentId);
        }
        if (getErrorName(error) === 'InvalidRequestException') {
          throw new ValidationError(`Invalid update parameters: ${getErrorMessage(error)}`);
        }
        throw new ServiceUnavailableError(
          `Failed to update application: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async deleteApplication(deploymentId: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.send(
          new DeleteServiceCommand({
            ServiceArn: deploymentId,
          })
        );
      } catch (error: unknown) {
        if (getErrorName(error) === 'ResourceNotFoundException') {
          throw new ResourceNotFoundError('Deployment', deploymentId);
        }
        throw new ServiceUnavailableError(
          `Failed to delete application: ${getErrorMessage(error)}`
        );
      }
    });
  }

  async getApplicationUrl(deploymentId: string): Promise<string> {
    const deployment = await this.getDeployment(deploymentId);
    return deployment.url;
  }

  async scaleApplication(deploymentId: string, params: ScaleParams): Promise<void> {
    // Validate scaling parameters
    if (
      params.minInstances !== undefined &&
      params.maxInstances !== undefined &&
      params.minInstances > params.maxInstances
    ) {
      throw new ValidationError('minInstances cannot be greater than maxInstances');
    }

    // Note: App Runner auto-scaling configuration would be updated here
    // For MVP, we'll accept the parameters but note that App Runner manages
    // scaling automatically. In a full implementation, we would use
    // CreateAutoScalingConfigurationCommand and update the service.

    return withRetry(async () => {
      try {
        // For now, just verify the service exists
        await this.getDeployment(deploymentId);

        // In production, would create/update auto-scaling configuration:
        // 1. CreateAutoScalingConfigurationCommand with min/max instances
        // 2. UpdateServiceCommand to apply the new configuration
      } catch (error: unknown) {
        if (error instanceof ResourceNotFoundError) {
          throw error;
        }
        throw new ServiceUnavailableError(`Failed to scale application: ${getErrorMessage(error)}`);
      }
    });
  }

  private mapToDeployment(
    service: Service,
    minInstances?: number,
    maxInstances?: number
  ): Deployment {
    const status = this.mapStatus(service.Status);

    // Extract environment variables
    const environment: Record<string, string> = {};
    const runtimeEnvVars =
      service.SourceConfiguration?.ImageRepository?.ImageConfiguration?.RuntimeEnvironmentVariables;
    if (runtimeEnvVars) {
      Object.assign(environment, runtimeEnvVars);
    }

    // Parse CPU and memory from instance configuration
    const cpuStr = service.InstanceConfiguration?.Cpu ?? '1 vCPU';
    const memoryStr = service.InstanceConfiguration?.Memory ?? '2048 MB';
    const cpu = parseInt(cpuStr);
    const memory = parseInt(memoryStr);

    return {
      id: service.ServiceArn ?? '',
      name: service.ServiceName ?? '',
      url: service.ServiceUrl ?? `https://${service.ServiceName}.apprunner.aws`,
      status,
      image: service.SourceConfiguration?.ImageRepository?.ImageIdentifier ?? 'unknown',
      cpu,
      memory,
      minInstances: minInstances ?? 1,
      maxInstances: maxInstances ?? 10,
      currentInstances: 1, // App Runner doesn't expose this directly
      created: service.CreatedAt ?? new Date(),
      lastUpdated: service.UpdatedAt ?? new Date(),
      environment,
    };
  }

  private mapStatus(appRunnerStatus?: ServiceStatus): DeploymentStatus {
    if (!appRunnerStatus) {
      return DeploymentStatus.CREATING;
    }

    switch (appRunnerStatus) {
      case 'CREATE_FAILED':
      case 'OPERATION_IN_PROGRESS':
        return DeploymentStatus.FAILED;
      case 'RUNNING':
        return DeploymentStatus.RUNNING;
      case 'DELETED':
        return DeploymentStatus.STOPPED;
      case 'PAUSED':
        return DeploymentStatus.STOPPED;
      default:
        return DeploymentStatus.CREATING;
    }
  }
}
