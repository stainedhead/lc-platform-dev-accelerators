[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / QueueService

# Interface: QueueService

Defined in: [src/core/services/QueueService.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L14)

## Methods

### createQueue()

> **createQueue**(`name`, `options?`): `Promise`\<[`Queue`](Queue.md)\>

Defined in: [src/core/services/QueueService.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L21)

Create a new message queue

#### Parameters

##### name

`string`

Name of the queue

##### options?

[`QueueOptions`](QueueOptions.md)

Optional queue configuration

#### Returns

`Promise`\<[`Queue`](Queue.md)\>

The created queue details

***

### getQueue()

> **getQueue**(`queueUrl`): `Promise`\<[`Queue`](Queue.md)\>

Defined in: [src/core/services/QueueService.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L28)

Get details about a specific queue

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

#### Returns

`Promise`\<[`Queue`](Queue.md)\>

Queue details including message counts

***

### deleteQueue()

> **deleteQueue**(`queueUrl`): `Promise`\<`void`\>

Defined in: [src/core/services/QueueService.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L34)

Delete a queue and all its messages

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

#### Returns

`Promise`\<`void`\>

***

### sendMessage()

> **sendMessage**(`queueUrl`, `params`): `Promise`\<`string`\>

Defined in: [src/core/services/QueueService.ts:42](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L42)

Send a message to a queue

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

##### params

[`SendMessageParams`](SendMessageParams.md)

Message content and optional attributes

#### Returns

`Promise`\<`string`\>

The message ID

***

### receiveMessages()

> **receiveMessages**(`queueUrl`, `params?`): `Promise`\<[`Message`](Message.md)[]\>

Defined in: [src/core/services/QueueService.ts:50](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L50)

Receive messages from a queue

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

##### params?

[`ReceiveMessageParams`](ReceiveMessageParams.md)

Optional parameters for message retrieval

#### Returns

`Promise`\<[`Message`](Message.md)[]\>

Array of received messages

***

### deleteMessage()

> **deleteMessage**(`queueUrl`, `receiptHandle`): `Promise`\<`void`\>

Defined in: [src/core/services/QueueService.ts:57](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L57)

Delete a message from the queue after processing

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

##### receiptHandle

`string`

Receipt handle from the received message

#### Returns

`Promise`\<`void`\>

***

### listQueues()

> **listQueues**(): `Promise`\<`string`[]\>

Defined in: [src/core/services/QueueService.ts:63](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L63)

List all queues

#### Returns

`Promise`\<`string`[]\>

Array of queue URLs

***

### purgeQueue()

> **purgeQueue**(`queueUrl`): `Promise`\<`void`\>

Defined in: [src/core/services/QueueService.ts:69](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/QueueService.ts#L69)

Purge all messages from a queue

#### Parameters

##### queueUrl

`string`

URL or identifier of the queue

#### Returns

`Promise`\<`void`\>
