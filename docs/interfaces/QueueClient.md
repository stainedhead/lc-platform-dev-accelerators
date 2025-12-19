[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / QueueClient

# Interface: QueueClient

Defined in: [src/core/clients/QueueClient.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L13)

## Methods

### send()

> **send**(`queueName`, `message`, `options?`): `Promise`\<`string`\>

Defined in: [src/core/clients/QueueClient.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L21)

Send a message to a queue

#### Parameters

##### queueName

`string`

Name of the queue

##### message

`unknown`

Message body (will be serialized to JSON if object)

##### options?

[`SendOptions`](SendOptions.md)

Optional send parameters

#### Returns

`Promise`\<`string`\>

Message ID

***

### sendBatch()

> **sendBatch**(`queueName`, `messages`): `Promise`\<[`BatchSendResult`](BatchSendResult.md)\>

Defined in: [src/core/clients/QueueClient.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L29)

Send multiple messages to a queue

#### Parameters

##### queueName

`string`

Name of the queue

##### messages

`unknown`[]

Array of messages to send

#### Returns

`Promise`\<[`BatchSendResult`](BatchSendResult.md)\>

Result with successful and failed entries

***

### receive()

> **receive**(`queueName`, `options?`): `Promise`\<[`ReceivedMessage`](ReceivedMessage.md)[]\>

Defined in: [src/core/clients/QueueClient.ts:37](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L37)

Receive messages from a queue

#### Parameters

##### queueName

`string`

Name of the queue

##### options?

[`ReceiveOptions`](ReceiveOptions.md)

Optional receive parameters

#### Returns

`Promise`\<[`ReceivedMessage`](ReceivedMessage.md)[]\>

Array of received messages

***

### acknowledge()

> **acknowledge**(`queueName`, `receiptHandle`): `Promise`\<`void`\>

Defined in: [src/core/clients/QueueClient.ts:44](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L44)

Acknowledge (delete) a message after processing

#### Parameters

##### queueName

`string`

Name of the queue

##### receiptHandle

`string`

Receipt handle from received message

#### Returns

`Promise`\<`void`\>

***

### acknowledgeBatch()

> **acknowledgeBatch**(`queueName`, `receiptHandles`): `Promise`\<`void`\>

Defined in: [src/core/clients/QueueClient.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L51)

Acknowledge multiple messages at once

#### Parameters

##### queueName

`string`

Name of the queue

##### receiptHandles

`string`[]

Array of receipt handles

#### Returns

`Promise`\<`void`\>

***

### changeVisibility()

> **changeVisibility**(`queueName`, `receiptHandle`, `timeout`): `Promise`\<`void`\>

Defined in: [src/core/clients/QueueClient.ts:59](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/QueueClient.ts#L59)

Change the visibility timeout of a message

#### Parameters

##### queueName

`string`

Name of the queue

##### receiptHandle

`string`

Receipt handle from received message

##### timeout

`number`

New visibility timeout in seconds

#### Returns

`Promise`\<`void`\>
