[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / AuthClientFactory

# Class: AuthClientFactory

Defined in: [src/factory/clients/AuthClientFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/AuthClientFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`AuthClient`](../interfaces/AuthClient.md)\>

## Constructors

### Constructor

> **new AuthClientFactory**(): `AuthClientFactory`

#### Returns

`AuthClientFactory`

#### Inherited from

`BaseProviderFactory<AuthClient>.constructor`

## Methods

### create()

> **create**(`config`): [`AuthClient`](../interfaces/AuthClient.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`AuthClient`](../interfaces/AuthClient.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`AuthClient`](../interfaces/AuthClient.md)

Defined in: [src/factory/clients/AuthClientFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/AuthClientFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`AuthClient`](../interfaces/AuthClient.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`AuthClient`](../interfaces/AuthClient.md)

Defined in: [src/factory/clients/AuthClientFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/AuthClientFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`AuthClient`](../interfaces/AuthClient.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`AuthClient`](../interfaces/AuthClient.md)

Defined in: [src/factory/clients/AuthClientFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/AuthClientFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`AuthClient`](../interfaces/AuthClient.md)

#### Overrides

`BaseProviderFactory.createMockService`
