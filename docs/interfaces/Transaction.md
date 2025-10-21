[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / Transaction

# Interface: Transaction

Defined in: [src/core/types/datastore.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/datastore.ts#L28)

## Methods

### query()

> **query**\<`T`\>(`sql`, `params?`): `Promise`\<`T`[]\>

Defined in: [src/core/types/datastore.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/datastore.ts#L29)

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

Defined in: [src/core/types/datastore.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/datastore.ts#L30)

#### Parameters

##### sql

`string`

##### params?

`unknown`[]

#### Returns

`Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

***

### commit()

> **commit**(): `Promise`\<`void`\>

Defined in: [src/core/types/datastore.ts:31](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/datastore.ts#L31)

#### Returns

`Promise`\<`void`\>

***

### rollback()

> **rollback**(): `Promise`\<`void`\>

Defined in: [src/core/types/datastore.ts:32](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/datastore.ts#L32)

#### Returns

`Promise`\<`void`\>
