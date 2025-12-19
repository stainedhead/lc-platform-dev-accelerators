[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DocumentClient

# Interface: DocumentClient

Defined in: [src/core/clients/DocumentClient.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L12)

## Methods

### get()

> **get**(`collection`, `documentId`): `Promise`\<[`Document`](Document.md)\<`unknown`\> \| `null`\>

Defined in: [src/core/clients/DocumentClient.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L19)

Get a document by ID

#### Parameters

##### collection

`string`

Collection name

##### documentId

`string`

Document ID

#### Returns

`Promise`\<[`Document`](Document.md)\<`unknown`\> \| `null`\>

Document or null if not found

***

### put()

> **put**(`collection`, `document`): `Promise`\<`void`\>

Defined in: [src/core/clients/DocumentClient.ts:26](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L26)

Put (create or replace) a document

#### Parameters

##### collection

`string`

Collection name

##### document

[`Document`](Document.md)

Document to store (must include _id)

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`collection`, `documentId`, `updates`): `Promise`\<`void`\>

Defined in: [src/core/clients/DocumentClient.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L34)

Update specific fields of a document

#### Parameters

##### collection

`string`

Collection name

##### documentId

`string`

Document ID

##### updates

`Partial`\<[`Document`](Document.md)\>

Partial document with fields to update

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`collection`, `documentId`): `Promise`\<`void`\>

Defined in: [src/core/clients/DocumentClient.ts:41](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L41)

Delete a document

#### Parameters

##### collection

`string`

Collection name

##### documentId

`string`

Document ID

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**(`collection`, `query`): `Promise`\<[`Document`](Document.md)\<`unknown`\>[]\>

Defined in: [src/core/clients/DocumentClient.ts:49](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L49)

Query documents by criteria

#### Parameters

##### collection

`string`

Collection name

##### query

[`Query`](Query.md)

Query criteria

#### Returns

`Promise`\<[`Document`](Document.md)\<`unknown`\>[]\>

Array of matching documents

***

### batchGet()

> **batchGet**(`collection`, `documentIds`): `Promise`\<([`Document`](Document.md)\<`unknown`\> \| `null`)[]\>

Defined in: [src/core/clients/DocumentClient.ts:57](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L57)

Get multiple documents by ID

#### Parameters

##### collection

`string`

Collection name

##### documentIds

`string`[]

Array of document IDs

#### Returns

`Promise`\<([`Document`](Document.md)\<`unknown`\> \| `null`)[]\>

Array of documents (may contain nulls for not found)

***

### batchPut()

> **batchPut**(`collection`, `documents`): `Promise`\<`void`\>

Defined in: [src/core/clients/DocumentClient.ts:64](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/DocumentClient.ts#L64)

Put multiple documents at once

#### Parameters

##### collection

`string`

Collection name

##### documents

[`Document`](Document.md)\<`unknown`\>[]

Array of documents to store

#### Returns

`Promise`\<`void`\>
