[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / SecretsClientFactory

# Class: SecretsClientFactory

Defined in: [src/factory/clients/SecretsClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/SecretsClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`SecretsClient`](../interfaces/SecretsClient.md)\>

## Constructors

### Constructor

> **new SecretsClientFactory**(): `SecretsClientFactory`

#### Returns

`SecretsClientFactory`

#### Inherited from

`BaseProviderFactory<SecretsClient>.constructor`

## Methods

### create()

> **create**(`config`): [`SecretsClient`](../interfaces/SecretsClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`SecretsClient`](../interfaces/SecretsClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`SecretsClient`](../interfaces/SecretsClient.md)

Defined in: [src/factory/clients/SecretsClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/SecretsClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`SecretsClient`](../interfaces/SecretsClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`SecretsClient`](../interfaces/SecretsClient.md)

Defined in: [src/factory/clients/SecretsClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/SecretsClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`SecretsClient`](../interfaces/SecretsClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`SecretsClient`](../interfaces/SecretsClient.md)

Defined in: [src/factory/clients/SecretsClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/SecretsClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`SecretsClient`](../interfaces/SecretsClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
