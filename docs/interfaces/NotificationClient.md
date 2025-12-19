[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / NotificationClient

# Interface: NotificationClient

Defined in: [src/core/clients/NotificationClient.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/NotificationClient.ts#L13)

## Methods

### publish()

> **publish**(`topicName`, `message`): `Promise`\<`string`\>

Defined in: [src/core/clients/NotificationClient.ts:20](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/NotificationClient.ts#L20)

Publish a notification message to a topic

#### Parameters

##### topicName

`string`

Name of the topic

##### message

[`NotificationMessage`](NotificationMessage.md)

Notification message

#### Returns

`Promise`\<`string`\>

Message ID

***

### publishBatch()

> **publishBatch**(`topicName`, `messages`): `Promise`\<[`BatchPublishResult`](BatchPublishResult.md)\>

Defined in: [src/core/clients/NotificationClient.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/NotificationClient.ts#L28)

Publish multiple notification messages to a topic

#### Parameters

##### topicName

`string`

Name of the topic

##### messages

[`NotificationMessage`](NotificationMessage.md)[]

Array of notification messages

#### Returns

`Promise`\<[`BatchPublishResult`](BatchPublishResult.md)\>

Result with successful and failed entries
