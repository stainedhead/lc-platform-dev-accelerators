[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / EventBusService

# Interface: EventBusService

Defined in: [src/core/services/EventBusService.ts:8](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L8)

## Methods

### createEventBus()

> **createEventBus**(`name`): `Promise`\<[`EventBus`](EventBus.md)\>

Defined in: [src/core/services/EventBusService.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L14)

Create a new event bus

#### Parameters

##### name

`string`

Event bus name

#### Returns

`Promise`\<[`EventBus`](EventBus.md)\>

The created event bus

***

### getEventBus()

> **getEventBus**(`name`): `Promise`\<[`EventBus`](EventBus.md)\>

Defined in: [src/core/services/EventBusService.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L21)

Get event bus details

#### Parameters

##### name

`string`

Event bus name

#### Returns

`Promise`\<[`EventBus`](EventBus.md)\>

Event bus metadata

***

### deleteEventBus()

> **deleteEventBus**(`name`): `Promise`\<`void`\>

Defined in: [src/core/services/EventBusService.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L27)

Delete an event bus

#### Parameters

##### name

`string`

Event bus name

#### Returns

`Promise`\<`void`\>

***

### publishEvent()

> **publishEvent**(`busName`, `event`): `Promise`\<`string`\>

Defined in: [src/core/services/EventBusService.ts:35](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L35)

Publish an event to the event bus

#### Parameters

##### busName

`string`

Event bus name

##### event

[`Event`](Event.md)

Event to publish

#### Returns

`Promise`\<`string`\>

Event ID

***

### createRule()

> **createRule**(`busName`, `params`): `Promise`\<[`Rule`](Rule.md)\>

Defined in: [src/core/services/EventBusService.ts:43](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L43)

Create a rule to route events to targets

#### Parameters

##### busName

`string`

Event bus name

##### params

[`RuleParams`](RuleParams.md)

Rule configuration

#### Returns

`Promise`\<[`Rule`](Rule.md)\>

The created rule

***

### getRule()

> **getRule**(`busName`, `ruleName`): `Promise`\<[`Rule`](Rule.md)\>

Defined in: [src/core/services/EventBusService.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L51)

Get rule details

#### Parameters

##### busName

`string`

Event bus name

##### ruleName

`string`

Rule name

#### Returns

`Promise`\<[`Rule`](Rule.md)\>

Rule configuration

***

### updateRule()

> **updateRule**(`busName`, `ruleName`, `params`): `Promise`\<[`Rule`](Rule.md)\>

Defined in: [src/core/services/EventBusService.ts:60](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L60)

Update an existing rule

#### Parameters

##### busName

`string`

Event bus name

##### ruleName

`string`

Rule name

##### params

[`RuleParams`](RuleParams.md)

Updated rule configuration

#### Returns

`Promise`\<[`Rule`](Rule.md)\>

The updated rule

***

### deleteRule()

> **deleteRule**(`busName`, `ruleName`): `Promise`\<`void`\>

Defined in: [src/core/services/EventBusService.ts:67](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L67)

Delete a rule

#### Parameters

##### busName

`string`

Event bus name

##### ruleName

`string`

Rule name

#### Returns

`Promise`\<`void`\>

***

### addTarget()

> **addTarget**(`busName`, `ruleName`, `target`): `Promise`\<`void`\>

Defined in: [src/core/services/EventBusService.ts:75](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L75)

Add a target to a rule

#### Parameters

##### busName

`string`

Event bus name

##### ruleName

`string`

Rule name

##### target

[`Target`](Target.md)

Target configuration

#### Returns

`Promise`\<`void`\>

***

### removeTarget()

> **removeTarget**(`busName`, `ruleName`, `targetId`): `Promise`\<`void`\>

Defined in: [src/core/services/EventBusService.ts:83](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L83)

Remove a target from a rule

#### Parameters

##### busName

`string`

Event bus name

##### ruleName

`string`

Rule name

##### targetId

`string`

Target ID to remove

#### Returns

`Promise`\<`void`\>

***

### listRules()

> **listRules**(`busName`): `Promise`\<[`Rule`](Rule.md)[]\>

Defined in: [src/core/services/EventBusService.ts:90](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/EventBusService.ts#L90)

List all rules for an event bus

#### Parameters

##### busName

`string`

Event bus name

#### Returns

`Promise`\<[`Rule`](Rule.md)[]\>

Array of rules
