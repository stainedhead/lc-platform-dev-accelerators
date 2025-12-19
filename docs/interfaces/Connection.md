[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / Connection

# Interface: Connection

Defined in: [src/core/types/datastore.ts:35](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/datastore.ts#L35)

## Methods

### query()

> **query**\<`T`\>(`sql`, `params?`): `Promise`\<`T`[]\>

Defined in: [src/core/types/datastore.ts:36](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/datastore.ts#L36)

#### Type Parameters

##### T

`T`

#### Parameters

##### sql

`string`

##### params?

`unknown`[]

#### Returns

`Promise`\<`T`[]\>

***

### execute()

> **execute**(`sql`, `params?`): `Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

Defined in: [src/core/types/datastore.ts:37](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/datastore.ts#L37)

#### Parameters

##### sql

`string`

##### params?

`unknown`[]

#### Returns

`Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

***

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [src/core/types/datastore.ts:38](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/datastore.ts#L38)

#### Returns

`Promise`\<`void`\>
