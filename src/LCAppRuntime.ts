/**
 * LCAppRuntime - Data Plane Entry Point
 *
 * The runtime interface for hosted applications to access cloud services.
 * This is the Data Plane counterpart to LCPlatform (Control Plane).
 *
 * LCAppRuntime provides simplified, operation-focused clients for:
 * - Queue operations (send/receive messages)
 * - Object storage operations (get/put/delete objects)
 * - Secrets retrieval (get secrets at runtime)
 * - Configuration access (get configuration values)
 * - Event publishing (publish events to event buses)
 * - Notifications (publish to notification topics)
 * - Document operations (CRUD on document stores)
 * - Data operations (SQL queries and transactions)
 * - Authentication (token validation and user info)
 *
 * Constitution Principle I: Provider Independence
 * - Provides a unified interface across cloud providers
 * - Enables testing with mock implementations
 *
 * @example
 * ```typescript
 * import { LCAppRuntime, ProviderType } from 'lc-platform-dev-accelerators';
 *
 * const runtime = new LCAppRuntime({ provider: ProviderType.AWS });
 *
 * // Use existing resources (no create/delete operations)
 * const queue = runtime.getQueueClient();
 * await queue.send('order-processing', { orderId: '12345' });
 *
 * const secrets = runtime.getSecretsClient();
 * const apiKey = await secrets.get('api-keys/stripe');
 * ```
 */

import type { RuntimeConfig } from './core/types/runtime';
import type { ProviderConfig } from './core/types/common';
import type { QueueClient } from './core/clients/QueueClient';
import type { ObjectClient } from './core/clients/ObjectClient';
import type { SecretsClient } from './core/clients/SecretsClient';
import type { ConfigClient } from './core/clients/ConfigClient';
import type { EventPublisher } from './core/clients/EventPublisher';
import type { NotificationClient } from './core/clients/NotificationClient';
import type { DocumentClient } from './core/clients/DocumentClient';
import type { DataClient } from './core/clients/DataClient';
import type { AuthClient } from './core/clients/AuthClient';
import type { CacheClient } from './core/clients/CacheClient';
import type { ContainerRepoClient } from './core/clients/ContainerRepoClient';

import { QueueClientFactory } from './factory/clients/QueueClientFactory';
import { ObjectClientFactory } from './factory/clients/ObjectClientFactory';
import { SecretsClientFactory } from './factory/clients/SecretsClientFactory';
import { ConfigClientFactory } from './factory/clients/ConfigClientFactory';
import { EventPublisherFactory } from './factory/clients/EventPublisherFactory';
import { NotificationClientFactory } from './factory/clients/NotificationClientFactory';
import { DocumentClientFactory } from './factory/clients/DocumentClientFactory';
import { DataClientFactory } from './factory/clients/DataClientFactory';
import { AuthClientFactory } from './factory/clients/AuthClientFactory';
import { CacheClientFactory } from './factory/clients/CacheClientFactory';
import { ContainerRepoClientFactory } from './factory/clients/ContainerRepoClientFactory';

export class LCAppRuntime {
  private readonly config: RuntimeConfig;
  private readonly providerConfig: ProviderConfig;

  // Client factories (lazy initialized)
  private readonly queueClientFactory = new QueueClientFactory();
  private readonly objectClientFactory = new ObjectClientFactory();
  private readonly secretsClientFactory = new SecretsClientFactory();
  private readonly configClientFactory = new ConfigClientFactory();
  private readonly eventPublisherFactory = new EventPublisherFactory();
  private readonly notificationClientFactory = new NotificationClientFactory();
  private readonly documentClientFactory = new DocumentClientFactory();
  private readonly dataClientFactory = new DataClientFactory();
  private readonly authClientFactory = new AuthClientFactory();
  private readonly cacheClientFactory = new CacheClientFactory();
  private readonly containerRepoClientFactory = new ContainerRepoClientFactory();

  // Cached client instances
  private queueClient?: QueueClient;
  private objectClient?: ObjectClient;
  private secretsClient?: SecretsClient;
  private configClient?: ConfigClient;
  private eventPublisher?: EventPublisher;
  private notificationClient?: NotificationClient;
  private documentClient?: DocumentClient;
  private dataClient?: DataClient;
  private authClient?: AuthClient;
  private cacheClient?: CacheClient;
  private containerRepoClient?: ContainerRepoClient;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.providerConfig = this.toProviderConfig(config);
  }

  /**
   * Convert RuntimeConfig to ProviderConfig for factory compatibility
   */
  private toProviderConfig(config: RuntimeConfig): ProviderConfig {
    const providerConfig: ProviderConfig = {
      provider: config.provider,
    };

    if (config.region !== undefined) {
      providerConfig.region = config.region;
    }
    if (config.credentials !== undefined) {
      providerConfig.credentials = config.credentials;
    }
    if (config.endpoint !== undefined) {
      providerConfig.endpoint = config.endpoint;
    }
    if (config.options !== undefined) {
      providerConfig.options = config.options;
    }

    return providerConfig;
  }

  /**
   * Get the runtime configuration
   */
  public getConfig(): RuntimeConfig {
    return { ...this.config };
  }

  /**
   * Get a QueueClient for queue operations
   * Queue operations: send, sendBatch, receive, acknowledge, acknowledgeBatch, changeVisibility
   */
  public getQueueClient(): QueueClient {
    if (this.queueClient === undefined) {
      this.queueClient = this.queueClientFactory.create(this.providerConfig);
    }
    return this.queueClient;
  }

  /**
   * Get an ObjectClient for object storage operations
   * Object operations: get, put, delete, deleteBatch, list, exists, getMetadata, getSignedUrl
   */
  public getObjectClient(): ObjectClient {
    if (this.objectClient === undefined) {
      this.objectClient = this.objectClientFactory.create(this.providerConfig);
    }
    return this.objectClient;
  }

  /**
   * Get a SecretsClient for secrets retrieval
   * Secret operations: get, getJson
   */
  public getSecretsClient(): SecretsClient {
    if (this.secretsClient === undefined) {
      this.secretsClient = this.secretsClientFactory.create(this.providerConfig);
    }
    return this.secretsClient;
  }

  /**
   * Get a ConfigClient for configuration access
   * Config operations: get, getString, getNumber, getBoolean
   */
  public getConfigClient(): ConfigClient {
    if (this.configClient === undefined) {
      this.configClient = this.configClientFactory.create(this.providerConfig);
    }
    return this.configClient;
  }

  /**
   * Get an EventPublisher for event publishing
   * Event operations: publish, publishBatch
   */
  public getEventPublisher(): EventPublisher {
    if (this.eventPublisher === undefined) {
      this.eventPublisher = this.eventPublisherFactory.create(this.providerConfig);
    }
    return this.eventPublisher;
  }

  /**
   * Get a NotificationClient for publishing notifications
   * Notification operations: publish, publishBatch
   */
  public getNotificationClient(): NotificationClient {
    if (this.notificationClient === undefined) {
      this.notificationClient = this.notificationClientFactory.create(this.providerConfig);
    }
    return this.notificationClient;
  }

  /**
   * Get a DocumentClient for document store operations
   * Document operations: get, put, update, delete, query, batchGet, batchPut
   */
  public getDocumentClient(): DocumentClient {
    if (this.documentClient === undefined) {
      this.documentClient = this.documentClientFactory.create(this.providerConfig);
    }
    return this.documentClient;
  }

  /**
   * Get a DataClient for database operations
   * Data operations: query, execute, transaction
   */
  public getDataClient(): DataClient {
    if (this.dataClient === undefined) {
      this.dataClient = this.dataClientFactory.create(this.providerConfig);
    }
    return this.dataClient;
  }

  /**
   * Get an AuthClient for authentication operations
   * Auth operations: validateToken, getUserInfo, hasScope, hasRole
   */
  public getAuthClient(): AuthClient {
    if (this.authClient === undefined) {
      this.authClient = this.authClientFactory.create(this.providerConfig);
    }
    return this.authClient;
  }

  /**
   * Get a CacheClient for cache operations
   * Cache operations: get, set, delete, exists, expire, ttl, persist, increment, decrement, mget, mset, mdel
   */
  public getCacheClient(): CacheClient {
    if (this.cacheClient === undefined) {
      this.cacheClient = this.cacheClientFactory.create(this.providerConfig);
    }
    return this.cacheClient;
  }

  /**
   * Get a ContainerRepoClient for container image operations
   * Container operations: getRepositoryUri, listImages, getImageByTag, getImageByDigest, imageExists, deleteImageByTag, deleteImageByDigest, deleteImages
   */
  public getContainerRepoClient(): ContainerRepoClient {
    if (this.containerRepoClient === undefined) {
      this.containerRepoClient = this.containerRepoClientFactory.create(this.providerConfig);
    }
    return this.containerRepoClient;
  }
}
