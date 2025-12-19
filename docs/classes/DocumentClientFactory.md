[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DocumentClientFactory

# Class: DocumentClientFactory

Defined in: [src/factory/clients/DocumentClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DocumentClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`DocumentClient`](../interfaces/DocumentClient.md)\>

## Constructors

### Constructor

> **new DocumentClientFactory**(): `DocumentClientFactory`

#### Returns

`DocumentClientFactory`

#### Inherited from

`BaseProviderFactory<DocumentClient>.constructor`

## Methods

### create()

> **create**(`config`): [`DocumentClient`](../interfaces/DocumentClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DocumentClient`](../interfaces/DocumentClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`DocumentClient`](../interfaces/DocumentClient.md)

Defined in: [src/factory/clients/DocumentClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DocumentClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DocumentClient`](../interfaces/DocumentClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`DocumentClient`](../interfaces/DocumentClient.md)

Defined in: [src/factory/clients/DocumentClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DocumentClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DocumentClient`](../interfaces/DocumentClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`DocumentClient`](../interfaces/DocumentClient.md)

Defined in: [src/factory/clients/DocumentClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/DocumentClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`DocumentClient`](../interfaces/DocumentClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
