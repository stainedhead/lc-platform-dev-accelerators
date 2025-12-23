/**
 * LCPlatform - Main Entry Point
 *
 * Provides a unified interface to all 11 cloud services through factory methods.
 * This is the primary API that applications use to access cloud-agnostic services.
 *
 * Constitution Principle I: Provider Independence
 * - Applications depend on this abstraction, not on cloud provider SDKs
 * - Provider selection is configuration-driven, not code-driven
 */

import type { ProviderConfig } from './core/types/common';
import { validateProviderConfig } from './factory/ProviderFactory';
import { WebHostingServiceFactory } from './factory/WebHostingServiceFactory';
import { DataStoreServiceFactory } from './factory/DataStoreServiceFactory';
import { ObjectStoreServiceFactory } from './factory/ObjectStoreServiceFactory';
import { BatchServiceFactory } from './factory/BatchServiceFactory';
import { QueueServiceFactory } from './factory/QueueServiceFactory';
import { SecretsServiceFactory } from './factory/SecretsServiceFactory';
import { ConfigurationServiceFactory } from './factory/ConfigurationServiceFactory';
import { DocumentStoreServiceFactory } from './factory/DocumentStoreServiceFactory';
import { EventBusServiceFactory } from './factory/EventBusServiceFactory';
import { NotificationServiceFactory } from './factory/NotificationServiceFactory';
import { AuthenticationServiceFactory } from './factory/AuthenticationServiceFactory';
import { FunctionHostingServiceFactory } from './factory/FunctionHostingServiceFactory';
import { CacheServiceFactory } from './factory/CacheServiceFactory';
import { ContainerRepoServiceFactory } from './factory/ContainerRepoServiceFactory';

// Service interfaces
import type { WebHostingService } from './core/services/WebHostingService';
import type { DataStoreService } from './core/services/DataStoreService';
import type { ObjectStoreService } from './core/services/ObjectStoreService';
import type { BatchService } from './core/services/BatchService';
import type { SecretsService } from './core/services/SecretsService';
import type { ConfigurationService } from './core/services/ConfigurationService';
import type { DocumentStoreService } from './core/services/DocumentStoreService';
import type { QueueService } from './core/services/QueueService';
import type { EventBusService } from './core/services/EventBusService';
import type { NotificationService } from './core/services/NotificationService';
import type { AuthenticationService } from './core/services/AuthenticationService';
import type { FunctionHostingService } from './core/services/FunctionHostingService';
import type { CacheService } from './core/services/CacheService';
import type { ContainerRepoService } from './core/services/ContainerRepoService';

/**
 * Main LCPlatform class
 *
 * Usage:
 * ```typescript
 * const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
 * const secrets = platform.getSecrets();
 * const value = await secrets.getSecret('my-secret');
 * ```
 */
export class LCPlatform {
  private readonly config: ProviderConfig;
  private readonly webHostingFactory = new WebHostingServiceFactory();
  private readonly dataStoreFactory = new DataStoreServiceFactory();
  private readonly objectStoreFactory = new ObjectStoreServiceFactory();
  private readonly batchFactory = new BatchServiceFactory();
  private readonly queueFactory = new QueueServiceFactory();
  private readonly secretsFactory = new SecretsServiceFactory();
  private readonly configurationFactory = new ConfigurationServiceFactory();
  private readonly documentStoreFactory = new DocumentStoreServiceFactory();
  private readonly eventBusFactory = new EventBusServiceFactory();
  private readonly notificationFactory = new NotificationServiceFactory();
  private readonly authenticationFactory = new AuthenticationServiceFactory();
  private readonly functionHostingFactory = new FunctionHostingServiceFactory();
  private readonly cacheFactory = new CacheServiceFactory();
  private readonly containerRepoFactory = new ContainerRepoServiceFactory();

  constructor(config: ProviderConfig) {
    validateProviderConfig(config);
    this.config = config;
  }

  /**
   * Get the current provider configuration
   */
  public getConfig(): ProviderConfig {
    return this.config;
  }

  /**
   * Get WebHostingService for deploying containerized applications
   * Service: AWS App Runner / Azure Container Apps
   */
  public getWebHosting(): WebHostingService {
    return this.webHostingFactory.create(this.config);
  }

  /**
   * Get BatchService for running batch jobs and scheduled tasks
   * Service: AWS Batch / Azure Batch
   */
  public getBatch(): BatchService {
    return this.batchFactory.create(this.config);
  }

  /**
   * Get SecretsService for managing sensitive data
   * Service: AWS Secrets Manager / Azure Key Vault
   */
  public getSecrets(): SecretsService {
    return this.secretsFactory.create(this.config);
  }

  /**
   * Get ConfigurationService for application configuration
   * Service: AWS AppConfig / Azure App Configuration
   */
  public getConfiguration(): ConfigurationService {
    return this.configurationFactory.create(this.config);
  }

  /**
   * Get DocumentStoreService for NoSQL document storage
   * Service: AWS DocumentDB / Azure Cosmos DB
   */
  public getDocumentStore(): DocumentStoreService {
    return this.documentStoreFactory.create(this.config);
  }

  /**
   * Get DataStoreService for relational database operations
   * Service: AWS RDS PostgreSQL / Azure Database for PostgreSQL
   */
  public getDataStore(): DataStoreService {
    return this.dataStoreFactory.create(this.config);
  }

  /**
   * Get ObjectStoreService for binary object/file storage
   * Service: AWS S3 / Azure Blob Storage
   */
  public getObjectStore(): ObjectStoreService {
    return this.objectStoreFactory.create(this.config);
  }

  /**
   * Get QueueService for message queuing
   * Service: AWS SQS / Azure Storage Queues
   */
  public getQueue(): QueueService {
    return this.queueFactory.create(this.config);
  }

  /**
   * Get EventBusService for event-driven architecture
   * Service: AWS EventBridge / Azure Event Grid
   */
  public getEventBus(): EventBusService {
    return this.eventBusFactory.create(this.config);
  }

  /**
   * Get NotificationService for multi-channel notifications
   * Service: AWS SNS / Azure Notification Hubs
   */
  public getNotification(): NotificationService {
    return this.notificationFactory.create(this.config);
  }

  /**
   * Get AuthenticationService for OAuth2/OIDC authentication
   * Service: AWS Cognito + Okta / Azure AD B2C
   */
  public getAuthentication(): AuthenticationService {
    return this.authenticationFactory.create(this.config);
  }

  /**
   * Get FunctionHostingService for serverless function hosting
   * Service: AWS Lambda / Azure Functions
   */
  public getFunctionHosting(): FunctionHostingService {
    return this.functionHostingFactory.create(this.config);
  }

  /**
   * Get CacheService for managing distributed cache clusters
   * Service: AWS ElastiCache for Redis / Azure Cache for Redis
   */
  public getCache(): CacheService {
    return this.cacheFactory.create(this.config);
  }

  /**
   * Get ContainerRepoService for managing container image repositories
   * Service: AWS ECR / Azure Container Registry
   */
  public getContainerRepo(): ContainerRepoService {
    return this.containerRepoFactory.create(this.config);
  }
}
