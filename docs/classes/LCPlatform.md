[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / LCPlatform

# Class: LCPlatform

Defined in: [src/LCPlatform.ts:49](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L49)

Main LCPlatform class

Usage:
```typescript
const platform = new LCPlatform({ provider: 'aws', region: 'us-east-1' });
const secrets = platform.getSecrets();
const value = await secrets.getSecret('my-secret');
```

## Constructors

### Constructor

> **new LCPlatform**(`config`): `LCPlatform`

Defined in: [src/LCPlatform.ts:63](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L63)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

`LCPlatform`

## Methods

### getConfig()

> **getConfig**(): [`ProviderConfig`](../interfaces/ProviderConfig.md)

Defined in: [src/LCPlatform.ts:71](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L71)

Get the current provider configuration

#### Returns

[`ProviderConfig`](../interfaces/ProviderConfig.md)

***

### getWebHosting()

> **getWebHosting**(): [`WebHostingService`](../interfaces/WebHostingService.md)

Defined in: [src/LCPlatform.ts:79](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L79)

Get WebHostingService for deploying containerized applications
Service: AWS App Runner / Azure Container Apps

#### Returns

[`WebHostingService`](../interfaces/WebHostingService.md)

***

### getBatch()

> **getBatch**(): [`BatchService`](../interfaces/BatchService.md)

Defined in: [src/LCPlatform.ts:87](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L87)

Get BatchService for running batch jobs and scheduled tasks
Service: AWS Batch / Azure Batch

#### Returns

[`BatchService`](../interfaces/BatchService.md)

***

### getSecrets()

> **getSecrets**(): [`SecretsService`](../interfaces/SecretsService.md)

Defined in: [src/LCPlatform.ts:95](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L95)

Get SecretsService for managing sensitive data
Service: AWS Secrets Manager / Azure Key Vault

#### Returns

[`SecretsService`](../interfaces/SecretsService.md)

***

### getConfiguration()

> **getConfiguration**(): [`ConfigurationService`](../interfaces/ConfigurationService.md)

Defined in: [src/LCPlatform.ts:103](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L103)

Get ConfigurationService for application configuration
Service: AWS AppConfig / Azure App Configuration

#### Returns

[`ConfigurationService`](../interfaces/ConfigurationService.md)

***

### getDocumentStore()

> **getDocumentStore**(): [`DocumentStoreService`](../interfaces/DocumentStoreService.md)

Defined in: [src/LCPlatform.ts:111](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L111)

Get DocumentStoreService for NoSQL document storage
Service: AWS DocumentDB / Azure Cosmos DB

#### Returns

[`DocumentStoreService`](../interfaces/DocumentStoreService.md)

***

### getDataStore()

> **getDataStore**(): [`DataStoreService`](../interfaces/DataStoreService.md)

Defined in: [src/LCPlatform.ts:119](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L119)

Get DataStoreService for relational database operations
Service: AWS RDS PostgreSQL / Azure Database for PostgreSQL

#### Returns

[`DataStoreService`](../interfaces/DataStoreService.md)

***

### getObjectStore()

> **getObjectStore**(): [`ObjectStoreService`](../interfaces/ObjectStoreService.md)

Defined in: [src/LCPlatform.ts:127](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L127)

Get ObjectStoreService for binary object/file storage
Service: AWS S3 / Azure Blob Storage

#### Returns

[`ObjectStoreService`](../interfaces/ObjectStoreService.md)

***

### getQueue()

> **getQueue**(): [`QueueService`](../interfaces/QueueService.md)

Defined in: [src/LCPlatform.ts:135](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L135)

Get QueueService for message queuing
Service: AWS SQS / Azure Storage Queues

#### Returns

[`QueueService`](../interfaces/QueueService.md)

***

### getEventBus()

> **getEventBus**(): [`EventBusService`](../interfaces/EventBusService.md)

Defined in: [src/LCPlatform.ts:143](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L143)

Get EventBusService for event-driven architecture
Service: AWS EventBridge / Azure Event Grid

#### Returns

[`EventBusService`](../interfaces/EventBusService.md)

***

### getNotification()

> **getNotification**(): [`NotificationService`](../interfaces/NotificationService.md)

Defined in: [src/LCPlatform.ts:151](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L151)

Get NotificationService for multi-channel notifications
Service: AWS SNS / Azure Notification Hubs

#### Returns

[`NotificationService`](../interfaces/NotificationService.md)

***

### getAuthentication()

> **getAuthentication**(): [`AuthenticationService`](../interfaces/AuthenticationService.md)

Defined in: [src/LCPlatform.ts:159](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/LCPlatform.ts#L159)

Get AuthenticationService for OAuth2/OIDC authentication
Service: AWS Cognito + Okta / Azure AD B2C

#### Returns

[`AuthenticationService`](../interfaces/AuthenticationService.md)
