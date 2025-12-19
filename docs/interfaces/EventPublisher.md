[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / EventPublisher

# Interface: EventPublisher

Defined in: [src/core/clients/EventPublisher.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/EventPublisher.ts#L13)

## Methods

### publish()

> **publish**(`eventBusName`, `event`): `Promise`\<`string`\>

Defined in: [src/core/clients/EventPublisher.ts:20](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/EventPublisher.ts#L20)

Publish an event to an event bus

#### Parameters

##### eventBusName

`string`

Name of the event bus

##### event

[`Event`](Event.md)

Event to publish

#### Returns

`Promise`\<`string`\>

Event ID

***

### publishBatch()

> **publishBatch**(`eventBusName`, `events`): `Promise`\<[`BatchPublishResult`](BatchPublishResult.md)\>

Defined in: [src/core/clients/EventPublisher.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/EventPublisher.ts#L28)

Publish multiple events to an event bus

#### Parameters

##### eventBusName

`string`

Name of the event bus

##### events

[`Event`](Event.md)[]

Array of events to publish

#### Returns

`Promise`\<[`BatchPublishResult`](BatchPublishResult.md)\>

Result with successful and failed entries
