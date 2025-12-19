[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / LCAppRuntime

# Class: LCAppRuntime

Defined in: [src/LCAppRuntime.ts:59](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L59)

## Constructors

### Constructor

> **new LCAppRuntime**(`config`): `LCAppRuntime`

Defined in: [src/LCAppRuntime.ts:85](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L85)

#### Parameters

##### config

[`RuntimeConfig`](../interfaces/RuntimeConfig.md)

#### Returns

`LCAppRuntime`

## Methods

### getConfig()

> **getConfig**(): [`RuntimeConfig`](../interfaces/RuntimeConfig.md)

Defined in: [src/LCAppRuntime.ts:117](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L117)

Get the runtime configuration

#### Returns

[`RuntimeConfig`](../interfaces/RuntimeConfig.md)

***

### getQueueClient()

> **getQueueClient**(): [`QueueClient`](../interfaces/QueueClient.md)

Defined in: [src/LCAppRuntime.ts:125](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L125)

Get a QueueClient for queue operations
Queue operations: send, sendBatch, receive, acknowledge, acknowledgeBatch, changeVisibility

#### Returns

[`QueueClient`](../interfaces/QueueClient.md)

***

### getObjectClient()

> **getObjectClient**(): [`ObjectClient`](../interfaces/ObjectClient.md)

Defined in: [src/LCAppRuntime.ts:136](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L136)

Get an ObjectClient for object storage operations
Object operations: get, put, delete, deleteBatch, list, exists, getMetadata, getSignedUrl

#### Returns

[`ObjectClient`](../interfaces/ObjectClient.md)

***

### getSecretsClient()

> **getSecretsClient**(): [`SecretsClient`](../interfaces/SecretsClient.md)

Defined in: [src/LCAppRuntime.ts:147](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L147)

Get a SecretsClient for secrets retrieval
Secret operations: get, getJson

#### Returns

[`SecretsClient`](../interfaces/SecretsClient.md)

***

### getConfigClient()

> **getConfigClient**(): [`ConfigClient`](../interfaces/ConfigClient.md)

Defined in: [src/LCAppRuntime.ts:158](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L158)

Get a ConfigClient for configuration access
Config operations: get, getString, getNumber, getBoolean

#### Returns

[`ConfigClient`](../interfaces/ConfigClient.md)

***

### getEventPublisher()

> **getEventPublisher**(): [`EventPublisher`](../interfaces/EventPublisher.md)

Defined in: [src/LCAppRuntime.ts:169](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L169)

Get an EventPublisher for event publishing
Event operations: publish, publishBatch

#### Returns

[`EventPublisher`](../interfaces/EventPublisher.md)

***

### getNotificationClient()

> **getNotificationClient**(): [`NotificationClient`](../interfaces/NotificationClient.md)

Defined in: [src/LCAppRuntime.ts:180](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L180)

Get a NotificationClient for publishing notifications
Notification operations: publish, publishBatch

#### Returns

[`NotificationClient`](../interfaces/NotificationClient.md)

***

### getDocumentClient()

> **getDocumentClient**(): [`DocumentClient`](../interfaces/DocumentClient.md)

Defined in: [src/LCAppRuntime.ts:191](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L191)

Get a DocumentClient for document store operations
Document operations: get, put, update, delete, query, batchGet, batchPut

#### Returns

[`DocumentClient`](../interfaces/DocumentClient.md)

***

### getDataClient()

> **getDataClient**(): [`DataClient`](../interfaces/DataClient.md)

Defined in: [src/LCAppRuntime.ts:202](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L202)

Get a DataClient for database operations
Data operations: query, execute, transaction

#### Returns

[`DataClient`](../interfaces/DataClient.md)

***

### getAuthClient()

> **getAuthClient**(): [`AuthClient`](../interfaces/AuthClient.md)

Defined in: [src/LCAppRuntime.ts:213](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/LCAppRuntime.ts#L213)

Get an AuthClient for authentication operations
Auth operations: validateToken, getUserInfo, hasScope, hasRole

#### Returns

[`AuthClient`](../interfaces/AuthClient.md)
