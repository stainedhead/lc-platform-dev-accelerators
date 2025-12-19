[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ConfigClientFactory

# Class: ConfigClientFactory

Defined in: [src/factory/clients/ConfigClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ConfigClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`ConfigClient`](../interfaces/ConfigClient.md)\>

## Constructors

### Constructor

> **new ConfigClientFactory**(): `ConfigClientFactory`

#### Returns

`ConfigClientFactory`

#### Inherited from

`BaseProviderFactory<ConfigClient>.constructor`

## Methods

### create()

> **create**(`config`): [`ConfigClient`](../interfaces/ConfigClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ConfigClient`](../interfaces/ConfigClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`ConfigClient`](../interfaces/ConfigClient.md)

Defined in: [src/factory/clients/ConfigClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ConfigClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ConfigClient`](../interfaces/ConfigClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`ConfigClient`](../interfaces/ConfigClient.md)

Defined in: [src/factory/clients/ConfigClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ConfigClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ConfigClient`](../interfaces/ConfigClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`ConfigClient`](../interfaces/ConfigClient.md)

Defined in: [src/factory/clients/ConfigClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ConfigClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ConfigClient`](../interfaces/ConfigClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
