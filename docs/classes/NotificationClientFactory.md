[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / NotificationClientFactory

# Class: NotificationClientFactory

Defined in: [src/factory/clients/NotificationClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/NotificationClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`NotificationClient`](../interfaces/NotificationClient.md)\>

## Constructors

### Constructor

> **new NotificationClientFactory**(): `NotificationClientFactory`

#### Returns

`NotificationClientFactory`

#### Inherited from

`BaseProviderFactory<NotificationClient>.constructor`

## Methods

### create()

> **create**(`config`): [`NotificationClient`](../interfaces/NotificationClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`NotificationClient`](../interfaces/NotificationClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`NotificationClient`](../interfaces/NotificationClient.md)

Defined in: [src/factory/clients/NotificationClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/NotificationClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`NotificationClient`](../interfaces/NotificationClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`NotificationClient`](../interfaces/NotificationClient.md)

Defined in: [src/factory/clients/NotificationClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/NotificationClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`NotificationClient`](../interfaces/NotificationClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`NotificationClient`](../interfaces/NotificationClient.md)

Defined in: [src/factory/clients/NotificationClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/NotificationClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`NotificationClient`](../interfaces/NotificationClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
