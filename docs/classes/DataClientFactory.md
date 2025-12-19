[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DataClientFactory

# Class: DataClientFactory

Defined in: [src/factory/clients/DataClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DataClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`DataClient`](../interfaces/DataClient.md)\>

## Constructors

### Constructor

> **new DataClientFactory**(): `DataClientFactory`

#### Returns

`DataClientFactory`

#### Inherited from

`BaseProviderFactory<DataClient>.constructor`

## Methods

### create()

> **create**(`config`): [`DataClient`](../interfaces/DataClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DataClient`](../interfaces/DataClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`DataClient`](../interfaces/DataClient.md)

Defined in: [src/factory/clients/DataClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DataClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DataClient`](../interfaces/DataClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`DataClient`](../interfaces/DataClient.md)

Defined in: [src/factory/clients/DataClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DataClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DataClient`](../interfaces/DataClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`DataClient`](../interfaces/DataClient.md)

Defined in: [src/factory/clients/DataClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DataClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DataClient`](../interfaces/DataClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
