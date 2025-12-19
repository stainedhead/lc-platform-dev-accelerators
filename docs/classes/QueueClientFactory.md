[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / QueueClientFactory

# Class: QueueClientFactory

Defined in: [src/factory/clients/QueueClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/QueueClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`QueueClient`](../interfaces/QueueClient.md)\>

## Constructors

### Constructor

> **new QueueClientFactory**(): `QueueClientFactory`

#### Returns

`QueueClientFactory`

#### Inherited from

`BaseProviderFactory<QueueClient>.constructor`

## Methods

### create()

> **create**(`config`): [`QueueClient`](../interfaces/QueueClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`QueueClient`](../interfaces/QueueClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`QueueClient`](../interfaces/QueueClient.md)

Defined in: [src/factory/clients/QueueClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/QueueClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`QueueClient`](../interfaces/QueueClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`QueueClient`](../interfaces/QueueClient.md)

Defined in: [src/factory/clients/QueueClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/QueueClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`QueueClient`](../interfaces/QueueClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`QueueClient`](../interfaces/QueueClient.md)

Defined in: [src/factory/clients/QueueClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/QueueClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`QueueClient`](../interfaces/QueueClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
