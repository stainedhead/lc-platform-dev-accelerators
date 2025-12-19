[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / EventPublisherFactory

# Class: EventPublisherFactory

Defined in: [src/factory/clients/EventPublisherFactory.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/EventPublisherFactory.ts#L12)

## Extends

- `BaseProviderFactory`\<[`EventPublisher`](../interfaces/EventPublisher.md)\>

## Constructors

### Constructor

> **new EventPublisherFactory**(): `EventPublisherFactory`

#### Returns

`EventPublisherFactory`

#### Inherited from

`BaseProviderFactory<EventPublisher>.constructor`

## Methods

### create()

> **create**(`config`): [`EventPublisher`](../interfaces/EventPublisher.md)

Defined in: [src/factory/ProviderFactory.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/ProviderFactory.ts#L28)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`EventPublisher`](../interfaces/EventPublisher.md)

#### Inherited from

`BaseProviderFactory.create`

***

### createAwsService()

> `protected` **createAwsService**(`config`): [`EventPublisher`](../interfaces/EventPublisher.md)

Defined in: [src/factory/clients/EventPublisherFactory.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/EventPublisherFactory.ts#L13)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`EventPublisher`](../interfaces/EventPublisher.md)

#### Overrides

`BaseProviderFactory.createAwsService`

***

### createAzureService()

> `protected` **createAzureService**(`_config`): [`EventPublisher`](../interfaces/EventPublisher.md)

Defined in: [src/factory/clients/EventPublisherFactory.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/EventPublisherFactory.ts#L17)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`EventPublisher`](../interfaces/EventPublisher.md)

#### Overrides

`BaseProviderFactory.createAzureService`

***

### createMockService()

> `protected` **createMockService**(`_config`): [`EventPublisher`](../interfaces/EventPublisher.md)

Defined in: [src/factory/clients/EventPublisherFactory.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/factory/clients/EventPublisherFactory.ts#L21)

#### Parameters

##### \_config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

[`EventPublisher`](../interfaces/EventPublisher.md)

#### Overrides

`BaseProviderFactory.createMockService`
