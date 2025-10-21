[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ObjectStoreService

# Interface: ObjectStoreService

Defined in: [src/core/services/ObjectStoreService.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L19)

## Methods

### createBucket()

> **createBucket**(`name`, `options?`): `Promise`\<`void`\>

Defined in: [src/core/services/ObjectStoreService.ts:24](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L24)

Create a storage bucket
FR-031: Create buckets with versioning and encryption

#### Parameters

##### name

`string`

##### options?

[`BucketOptions`](BucketOptions.md)

#### Returns

`Promise`\<`void`\>

***

### putObject()

> **putObject**(`bucket`, `key`, `data`, `metadata?`): `Promise`\<`void`\>

Defined in: [src/core/services/ObjectStoreService.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L30)

Upload an object to storage
FR-032: Upload objects with metadata and tags

#### Parameters

##### bucket

`string`

##### key

`string`

##### data

`Buffer`\<`ArrayBufferLike`\> | `ReadableStream`\<`any`\>

##### metadata?

[`ObjectMetadata`](ObjectMetadata.md)

#### Returns

`Promise`\<`void`\>

***

### getObject()

> **getObject**(`bucket`, `key`): `Promise`\<[`ObjectData`](ObjectData.md)\>

Defined in: [src/core/services/ObjectStoreService.ts:41](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L41)

Download an object from storage
FR-033: Download objects with streaming support

#### Parameters

##### bucket

`string`

##### key

`string`

#### Returns

`Promise`\<[`ObjectData`](ObjectData.md)\>

***

### deleteObject()

> **deleteObject**(`bucket`, `key`): `Promise`\<`void`\>

Defined in: [src/core/services/ObjectStoreService.ts:47](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L47)

Delete an object from storage
FR-034: Delete objects

#### Parameters

##### bucket

`string`

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### listObjects()

> **listObjects**(`bucket`, `prefix?`): `Promise`\<[`ObjectInfo`](ObjectInfo.md)[]\>

Defined in: [src/core/services/ObjectStoreService.ts:53](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L53)

List objects in a bucket
FR-035: List objects with prefix filtering

#### Parameters

##### bucket

`string`

##### prefix?

`string`

#### Returns

`Promise`\<[`ObjectInfo`](ObjectInfo.md)[]\>

***

### generatePresignedUrl()

> **generatePresignedUrl**(`bucket`, `key`, `expires?`): `Promise`\<`string`\>

Defined in: [src/core/services/ObjectStoreService.ts:59](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L59)

Generate a presigned URL for temporary access
FR-036: Generate presigned URLs (default 1 hour expiration)

#### Parameters

##### bucket

`string`

##### key

`string`

##### expires?

`number`

#### Returns

`Promise`\<`string`\>

***

### copyObject()

> **copyObject**(`source`, `destination`): `Promise`\<`void`\>

Defined in: [src/core/services/ObjectStoreService.ts:65](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/ObjectStoreService.ts#L65)

Copy an object between locations
FR-034: Copy objects within or across buckets

#### Parameters

##### source

[`ObjectLocation`](ObjectLocation.md)

##### destination

[`ObjectLocation`](ObjectLocation.md)

#### Returns

`Promise`\<`void`\>
