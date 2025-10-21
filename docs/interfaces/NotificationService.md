[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / NotificationService

# Interface: NotificationService

Defined in: [src/core/services/NotificationService.ts:15](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L15)

## Methods

### createTopic()

> **createTopic**(`name`): `Promise`\<[`Topic`](Topic.md)\>

Defined in: [src/core/services/NotificationService.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L21)

Create a new notification topic

#### Parameters

##### name

`string`

Topic name

#### Returns

`Promise`\<[`Topic`](Topic.md)\>

The created topic

***

### getTopic()

> **getTopic**(`topicArn`): `Promise`\<[`Topic`](Topic.md)\>

Defined in: [src/core/services/NotificationService.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L28)

Get topic details

#### Parameters

##### topicArn

`string`

Topic ARN or name

#### Returns

`Promise`\<[`Topic`](Topic.md)\>

Topic metadata including subscriptions

***

### deleteTopic()

> **deleteTopic**(`topicArn`): `Promise`\<`void`\>

Defined in: [src/core/services/NotificationService.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L34)

Delete a topic and all its subscriptions

#### Parameters

##### topicArn

`string`

Topic ARN or name

#### Returns

`Promise`\<`void`\>

***

### publishToTopic()

> **publishToTopic**(`topicArn`, `message`): `Promise`\<`string`\>

Defined in: [src/core/services/NotificationService.ts:42](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L42)

Publish a message to a topic

#### Parameters

##### topicArn

`string`

Topic ARN or name

##### message

[`NotificationMessage`](NotificationMessage.md)

Message to publish

#### Returns

`Promise`\<`string`\>

Message ID

***

### subscribe()

> **subscribe**(`topicArn`, `protocol`, `endpoint`): `Promise`\<[`Subscription`](Subscription.md)\>

Defined in: [src/core/services/NotificationService.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L51)

Subscribe to a topic

#### Parameters

##### topicArn

`string`

Topic ARN or name

##### protocol

[`Protocol`](../type-aliases/Protocol.md)

Subscription protocol (email, sms, http, etc.)

##### endpoint

`string`

Destination endpoint (email address, phone number, URL)

#### Returns

`Promise`\<[`Subscription`](Subscription.md)\>

The created subscription

***

### unsubscribe()

> **unsubscribe**(`subscriptionId`): `Promise`\<`void`\>

Defined in: [src/core/services/NotificationService.ts:57](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L57)

Unsubscribe from a topic

#### Parameters

##### subscriptionId

`string`

Subscription ID

#### Returns

`Promise`\<`void`\>

***

### confirmSubscription()

> **confirmSubscription**(`subscriptionId`, `token`): `Promise`\<`void`\>

Defined in: [src/core/services/NotificationService.ts:64](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L64)

Confirm a subscription (typically after receiving confirmation message)

#### Parameters

##### subscriptionId

`string`

Subscription ID

##### token

`string`

Confirmation token

#### Returns

`Promise`\<`void`\>

***

### listTopics()

> **listTopics**(): `Promise`\<[`Topic`](Topic.md)[]\>

Defined in: [src/core/services/NotificationService.ts:70](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L70)

List all topics

#### Returns

`Promise`\<[`Topic`](Topic.md)[]\>

Array of topics

***

### listSubscriptions()

> **listSubscriptions**(`topicArn`): `Promise`\<[`Subscription`](Subscription.md)[]\>

Defined in: [src/core/services/NotificationService.ts:77](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L77)

List subscriptions for a topic

#### Parameters

##### topicArn

`string`

Topic ARN or name

#### Returns

`Promise`\<[`Subscription`](Subscription.md)[]\>

Array of subscriptions

***

### sendEmail()

> **sendEmail**(`params`): `Promise`\<`string`\>

Defined in: [src/core/services/NotificationService.ts:84](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L84)

Send an email directly (without using topics)

#### Parameters

##### params

[`EmailParams`](EmailParams.md)

Email parameters

#### Returns

`Promise`\<`string`\>

Message ID

***

### sendSMS()

> **sendSMS**(`params`): `Promise`\<`string`\>

Defined in: [src/core/services/NotificationService.ts:91](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/NotificationService.ts#L91)

Send an SMS message directly (without using topics)

#### Parameters

##### params

[`SMSParams`](SMSParams.md)

SMS parameters

#### Returns

`Promise`\<`string`\>

Message ID
