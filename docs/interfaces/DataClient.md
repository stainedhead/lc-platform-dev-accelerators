[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DataClient

# Interface: DataClient

Defined in: [src/core/clients/DataClient.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DataClient.ts#L12)

## Methods

### query()

> **query**\<`T`\>(`sql`, `params?`): `Promise`\<`T`[]\>

Defined in: [src/core/clients/DataClient.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DataClient.ts#L19)

Execute a SQL query and return results

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

#### Parameters

##### sql

`string`

SQL query string

##### params?

`unknown`[]

Query parameters for prepared statements

#### Returns

`Promise`\<`T`[]\>

Array of result rows

***

### execute()

> **execute**(`sql`, `params?`): `Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

Defined in: [src/core/clients/DataClient.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DataClient.ts#L27)

Execute a SQL statement (INSERT, UPDATE, DELETE)

#### Parameters

##### sql

`string`

SQL statement

##### params?

`unknown`[]

Query parameters for prepared statements

#### Returns

`Promise`\<[`ExecuteResult`](ExecuteResult.md)\>

Execute result with affected row count

***

### transaction()

> **transaction**\<`T`\>(`fn`): `Promise`\<`T`\>

Defined in: [src/core/clients/DataClient.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DataClient.ts#L34)

Execute multiple operations in a transaction

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

(`tx`) => `Promise`\<`T`\>

Transaction function receiving a transaction context

#### Returns

`Promise`\<`T`\>

Result of the transaction function
