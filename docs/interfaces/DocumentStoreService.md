[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / DocumentStoreService

# Interface: DocumentStoreService

Defined in: [src/core/services/DocumentStoreService.ts:8](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L8)

## Methods

### createCollection()

> **createCollection**(`name`, `options?`): `Promise`\<[`Collection`](Collection.md)\>

Defined in: [src/core/services/DocumentStoreService.ts:15](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L15)

Create a new collection

#### Parameters

##### name

`string`

Collection name

##### options?

[`CollectionOptions`](CollectionOptions.md)

Optional collection configuration (indexes, TTL)

#### Returns

`Promise`\<[`Collection`](Collection.md)\>

The created collection

***

### getCollection()

> **getCollection**(`name`): `Promise`\<[`Collection`](Collection.md)\>

Defined in: [src/core/services/DocumentStoreService.ts:22](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L22)

Get collection details

#### Parameters

##### name

`string`

Collection name

#### Returns

`Promise`\<[`Collection`](Collection.md)\>

Collection metadata

***

### deleteCollection()

> **deleteCollection**(`name`): `Promise`\<`void`\>

Defined in: [src/core/services/DocumentStoreService.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L28)

Delete a collection and all its documents

#### Parameters

##### name

`string`

Collection name

#### Returns

`Promise`\<`void`\>

***

### insertDocument()

> **insertDocument**\<`T`\>(`collectionName`, `document`): `Promise`\<[`Document`](Document.md)\<`T`\>\>

Defined in: [src/core/services/DocumentStoreService.ts:36](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L36)

Insert a document into a collection

#### Type Parameters

##### T

`T`

#### Parameters

##### collectionName

`string`

Collection name

##### document

`T`

Document to insert (without _id, will be generated)

#### Returns

`Promise`\<[`Document`](Document.md)\<`T`\>\>

The inserted document with generated _id

***

### findById()

> **findById**\<`T`\>(`collectionName`, `id`): `Promise`\<[`Document`](Document.md)\<`T`\> \| `null`\>

Defined in: [src/core/services/DocumentStoreService.ts:44](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L44)

Find a document by ID

#### Type Parameters

##### T

`T`

#### Parameters

##### collectionName

`string`

Collection name

##### id

`string`

Document ID

#### Returns

`Promise`\<[`Document`](Document.md)\<`T`\> \| `null`\>

The document if found

***

### find()

> **find**\<`T`\>(`collectionName`, `query`, `limit?`): `Promise`\<[`Document`](Document.md)\<`T`\>[]\>

Defined in: [src/core/services/DocumentStoreService.ts:53](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L53)

Find documents matching a query

#### Type Parameters

##### T

`T`

#### Parameters

##### collectionName

`string`

Collection name

##### query

[`Query`](Query.md)

Query filter

##### limit?

`number`

Optional limit on number of results

#### Returns

`Promise`\<[`Document`](Document.md)\<`T`\>[]\>

Array of matching documents

***

### updateDocument()

> **updateDocument**\<`T`\>(`collectionName`, `id`, `update`): `Promise`\<[`Document`](Document.md)\<`T`\>\>

Defined in: [src/core/services/DocumentStoreService.ts:62](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L62)

Update a document by ID

#### Type Parameters

##### T

`T`

#### Parameters

##### collectionName

`string`

Collection name

##### id

`string`

Document ID

##### update

`Partial`\<`T`\>

Partial document with fields to update

#### Returns

`Promise`\<[`Document`](Document.md)\<`T`\>\>

The updated document

***

### deleteDocument()

> **deleteDocument**(`collectionName`, `id`): `Promise`\<`void`\>

Defined in: [src/core/services/DocumentStoreService.ts:69](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L69)

Delete a document by ID

#### Parameters

##### collectionName

`string`

Collection name

##### id

`string`

Document ID

#### Returns

`Promise`\<`void`\>

***

### listCollections()

> **listCollections**(): `Promise`\<`string`[]\>

Defined in: [src/core/services/DocumentStoreService.ts:75](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L75)

List all collections

#### Returns

`Promise`\<`string`[]\>

Array of collection names

***

### count()

> **count**(`collectionName`, `query?`): `Promise`\<`number`\>

Defined in: [src/core/services/DocumentStoreService.ts:83](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/DocumentStoreService.ts#L83)

Count documents matching a query

#### Parameters

##### collectionName

`string`

Collection name

##### query?

[`Query`](Query.md)

Optional query filter

#### Returns

`Promise`\<`number`\>

Count of matching documents
