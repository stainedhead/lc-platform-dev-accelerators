[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / FunctionHostingService

# Interface: FunctionHostingService

Defined in: [src/core/services/FunctionHostingService.ts:25](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L25)

## Methods

### createFunction()

> **createFunction**(`params`): `Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L29)

Create a new serverless function

#### Parameters

##### params

[`CreateFunctionParams`](CreateFunctionParams.md)

#### Returns

`Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

***

### getFunction()

> **getFunction**(`functionName`): `Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L34)

Get function details by name

#### Parameters

##### functionName

`string`

#### Returns

`Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

***

### updateFunctionConfiguration()

> **updateFunctionConfiguration**(`functionName`, `params`): `Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:39](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L39)

Update function configuration (memory, timeout, environment, etc.)

#### Parameters

##### functionName

`string`

##### params

[`UpdateFunctionParams`](UpdateFunctionParams.md)

#### Returns

`Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

***

### updateFunctionCode()

> **updateFunctionCode**(`functionName`, `params`): `Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:47](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L47)

Update function code (deploy new version)

#### Parameters

##### functionName

`string`

##### params

[`UpdateFunctionCodeParams`](UpdateFunctionCodeParams.md)

#### Returns

`Promise`\<[`ServerlessFunction`](ServerlessFunction.md)\>

***

### deleteFunction()

> **deleteFunction**(`functionName`): `Promise`\<`void`\>

Defined in: [src/core/services/FunctionHostingService.ts:55](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L55)

Delete a function and its associated resources

#### Parameters

##### functionName

`string`

#### Returns

`Promise`\<`void`\>

***

### listFunctions()

> **listFunctions**(`params?`): `Promise`\<[`ListFunctionsResult`](ListFunctionsResult.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:60](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L60)

List all functions with optional pagination

#### Parameters

##### params?

[`ListFunctionsParams`](ListFunctionsParams.md)

#### Returns

`Promise`\<[`ListFunctionsResult`](ListFunctionsResult.md)\>

***

### invokeFunction()

> **invokeFunction**(`functionName`, `params?`): `Promise`\<[`InvocationResult`](InvocationResult.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:65](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L65)

Invoke a function synchronously or asynchronously

#### Parameters

##### functionName

`string`

##### params?

[`InvokeFunctionParams`](InvokeFunctionParams.md)

#### Returns

`Promise`\<[`InvocationResult`](InvocationResult.md)\>

***

### createEventSourceMapping()

> **createEventSourceMapping**(`functionName`, `params`): `Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:70](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L70)

Create an event source mapping to trigger the function

#### Parameters

##### functionName

`string`

##### params

[`CreateEventSourceParams`](CreateEventSourceParams.md)

#### Returns

`Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

***

### getEventSourceMapping()

> **getEventSourceMapping**(`mappingId`): `Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:78](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L78)

Get event source mapping details

#### Parameters

##### mappingId

`string`

#### Returns

`Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

***

### updateEventSourceMapping()

> **updateEventSourceMapping**(`mappingId`, `enabled`): `Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:83](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L83)

Enable or disable an event source mapping

#### Parameters

##### mappingId

`string`

##### enabled

`boolean`

#### Returns

`Promise`\<[`EventSourceMapping`](EventSourceMapping.md)\>

***

### deleteEventSourceMapping()

> **deleteEventSourceMapping**(`mappingId`): `Promise`\<`void`\>

Defined in: [src/core/services/FunctionHostingService.ts:88](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L88)

Delete an event source mapping

#### Parameters

##### mappingId

`string`

#### Returns

`Promise`\<`void`\>

***

### listEventSourceMappings()

> **listEventSourceMappings**(`functionName`): `Promise`\<[`EventSourceMapping`](EventSourceMapping.md)[]\>

Defined in: [src/core/services/FunctionHostingService.ts:93](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L93)

List all event source mappings for a function

#### Parameters

##### functionName

`string`

#### Returns

`Promise`\<[`EventSourceMapping`](EventSourceMapping.md)[]\>

***

### createFunctionUrl()

> **createFunctionUrl**(`functionName`, `params?`): `Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:98](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L98)

Create a function URL for HTTP access

#### Parameters

##### functionName

`string`

##### params?

[`FunctionUrlParams`](FunctionUrlParams.md)

#### Returns

`Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

***

### getFunctionUrl()

> **getFunctionUrl**(`functionName`): `Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:103](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L103)

Get function URL configuration

#### Parameters

##### functionName

`string`

#### Returns

`Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

***

### updateFunctionUrl()

> **updateFunctionUrl**(`functionName`, `params`): `Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

Defined in: [src/core/services/FunctionHostingService.ts:108](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L108)

Update function URL configuration

#### Parameters

##### functionName

`string`

##### params

[`FunctionUrlParams`](FunctionUrlParams.md)

#### Returns

`Promise`\<[`FunctionUrl`](FunctionUrl.md)\>

***

### deleteFunctionUrl()

> **deleteFunctionUrl**(`functionName`): `Promise`\<`void`\>

Defined in: [src/core/services/FunctionHostingService.ts:113](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/FunctionHostingService.ts#L113)

Delete function URL

#### Parameters

##### functionName

`string`

#### Returns

`Promise`\<`void`\>
