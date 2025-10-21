[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DataStoreService

# Interface: DataStoreService

Defined in: [src/core/services/DataStoreService.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L13)

## Methods

### connect()

> **connect**(`connectionString?`): `Promise`\<`void`\>

Defined in: [src/core/services/DataStoreService.ts:18](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L18)

Connect to the database
FR-026: Connect to relational database

#### Parameters

##### connectionString?

`string`

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**\<`T`\>(`sql`, `params?`): `Promise`\<`T`[]\>

Defined in: [src/core/services/DataStoreService.ts:24](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L24)

Execute a SELECT query
FR-027: Execute queries with prepared statements

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

Defined in: [src/core/services/DataStoreService.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L30)

Execute an INSERT/UPDATE/DELETE statement
FR-027: Execute statements with prepared statements

#### Parameters

##### sql

`string`

##### params?

`unknown`[]

#### Returns

`Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

***

### transaction()

> **transaction**\<`T`\>(`fn`): `Promise`\<`T`\>

Defined in: [src/core/services/DataStoreService.ts:36](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L36)

Execute operations within a transaction
FR-028: Support transactions with isolation levels

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

(`tx`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### migrate()

> **migrate**(`migrations`): `Promise`\<`void`\>

Defined in: [src/core/services/DataStoreService.ts:42](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L42)

Apply database migrations
FR-030: Apply schema migrations

#### Parameters

##### migrations

[`Migration`](Migration.md)[]

#### Returns

`Promise`\<`void`\>

***

### getConnection()

> **getConnection**(): [`Connection`](Connection.md)

Defined in: [src/core/services/DataStoreService.ts:48](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/DataStoreService.ts#L48)

Get a connection from the pool
FR-029: Connection pooling for concurrent queries

#### Returns

[`Connection`](Connection.md)
