[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / LCPlatform

# Class: LCPlatform

Defined in: [src/LCPlatform.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L51)

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

Defined in: [src/LCPlatform.ts:66](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L66)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

`LCPlatform`

## Methods

### getConfig()

> **getConfig**(): [`ProviderConfig`](../interfaces/ProviderConfig.md)

Defined in: [src/LCPlatform.ts:74](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L74)

Get the current provider configuration

#### Returns

[`ProviderConfig`](../interfaces/ProviderConfig.md)

***

### getWebHosting()

> **getWebHosting**(): [`WebHostingService`](../interfaces/WebHostingService.md)

Defined in: [src/LCPlatform.ts:82](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L82)

Get WebHostingService for deploying containerized applications
Service: AWS App Runner / Azure Container Apps

#### Returns

[`WebHostingService`](../interfaces/WebHostingService.md)

***

### getBatch()

> **getBatch**(): [`BatchService`](../interfaces/BatchService.md)

Defined in: [src/LCPlatform.ts:90](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L90)

Get BatchService for running batch jobs and scheduled tasks
Service: AWS Batch / Azure Batch

#### Returns

[`BatchService`](../interfaces/BatchService.md)

***

### getSecrets()

> **getSecrets**(): [`SecretsService`](../interfaces/SecretsService.md)

Defined in: [src/LCPlatform.ts:98](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L98)

Get SecretsService for managing sensitive data
Service: AWS Secrets Manager / Azure Key Vault

#### Returns

[`SecretsService`](../interfaces/SecretsService.md)

***

### getConfiguration()

> **getConfiguration**(): [`ConfigurationService`](../interfaces/ConfigurationService.md)

Defined in: [src/LCPlatform.ts:106](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L106)

Get ConfigurationService for application configuration
Service: AWS AppConfig / Azure App Configuration

#### Returns

[`ConfigurationService`](../interfaces/ConfigurationService.md)

***

### getDocumentStore()

> **getDocumentStore**(): [`DocumentStoreService`](../interfaces/DocumentStoreService.md)

Defined in: [src/LCPlatform.ts:114](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L114)

Get DocumentStoreService for NoSQL document storage
Service: AWS DocumentDB / Azure Cosmos DB

#### Returns

[`DocumentStoreService`](../interfaces/DocumentStoreService.md)

***

### getDataStore()

> **getDataStore**(): [`DataStoreService`](../interfaces/DataStoreService.md)

Defined in: [src/LCPlatform.ts:122](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L122)

Get DataStoreService for relational database operations
Service: AWS RDS PostgreSQL / Azure Database for PostgreSQL

#### Returns

[`DataStoreService`](../interfaces/DataStoreService.md)

***

### getObjectStore()

> **getObjectStore**(): [`ObjectStoreService`](../interfaces/ObjectStoreService.md)

Defined in: [src/LCPlatform.ts:130](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L130)

Get ObjectStoreService for binary object/file storage
Service: AWS S3 / Azure Blob Storage

#### Returns

[`ObjectStoreService`](../interfaces/ObjectStoreService.md)

***

### getQueue()

> **getQueue**(): [`QueueService`](../interfaces/QueueService.md)

Defined in: [src/LCPlatform.ts:138](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L138)

Get QueueService for message queuing
Service: AWS SQS / Azure Storage Queues

#### Returns

[`QueueService`](../interfaces/QueueService.md)

***

### getEventBus()

> **getEventBus**(): [`EventBusService`](../interfaces/EventBusService.md)

Defined in: [src/LCPlatform.ts:146](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L146)

Get EventBusService for event-driven architecture
Service: AWS EventBridge / Azure Event Grid

#### Returns

[`EventBusService`](../interfaces/EventBusService.md)

***

### getNotification()

> **getNotification**(): [`NotificationService`](../interfaces/NotificationService.md)

Defined in: [src/LCPlatform.ts:154](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L154)

Get NotificationService for multi-channel notifications
Service: AWS SNS / Azure Notification Hubs

#### Returns

[`NotificationService`](../interfaces/NotificationService.md)

***

### getAuthentication()

> **getAuthentication**(): [`AuthenticationService`](../interfaces/AuthenticationService.md)

Defined in: [src/LCPlatform.ts:162](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L162)

Get AuthenticationService for OAuth2/OIDC authentication
Service: AWS Cognito + Okta / Azure AD B2C

#### Returns

[`AuthenticationService`](../interfaces/AuthenticationService.md)

***

### getFunctionHosting()

> **getFunctionHosting**(): [`FunctionHostingService`](../interfaces/FunctionHostingService.md)

Defined in: [src/LCPlatform.ts:170](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCPlatform.ts#L170)

Get FunctionHostingService for serverless function hosting
Service: AWS Lambda / Azure Functions

#### Returns

[`FunctionHostingService`](../interfaces/FunctionHostingService.md)
