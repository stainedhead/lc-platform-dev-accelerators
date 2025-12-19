[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ObjectClientFactory

# Class: ObjectClientFactory

Defined in: [src/factory/clients/ObjectClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ObjectClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`ObjectClient`](../interfaces/ObjectClient.md)\>

## Constructors

### Constructor

> **new ObjectClientFactory**(): `ObjectClientFactory`

#### Returns

`ObjectClientFactory`

#### Inherited from

`BaseProviderFactory<ObjectClient>.constructor`

## Methods

### create()

> **create**(`config`): [`ObjectClient`](../interfaces/ObjectClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ObjectClient`](../interfaces/ObjectClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`ObjectClient`](../interfaces/ObjectClient.md)

Defined in: [src/factory/clients/ObjectClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ObjectClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ObjectClient`](../interfaces/ObjectClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`ObjectClient`](../interfaces/ObjectClient.md)

Defined in: [src/factory/clients/ObjectClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ObjectClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ObjectClient`](../interfaces/ObjectClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`ObjectClient`](../interfaces/ObjectClient.md)

Defined in: [src/factory/clients/ObjectClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/ObjectClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`ObjectClient`](../interfaces/ObjectClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
