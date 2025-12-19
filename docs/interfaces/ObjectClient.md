[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ObjectClient

# Interface: ObjectClient

Defined in: [src/core/clients/ObjectClient.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L13)

## Methods

### get()

> **get**(`bucket`, `key`): `Promise`\<[`ObjectData`](ObjectData.md)\>

Defined in: [src/core/clients/ObjectClient.ts:20](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L20)

Get an object from storage

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

#### Returns

`Promise`\<[`ObjectData`](ObjectData.md)\>

Object data including content and metadata

***

### put()

> **put**(`bucket`, `key`, `data`, `metadata?`): `Promise`\<`void`\>

Defined in: [src/core/clients/ObjectClient.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L29)

Put an object to storage

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

##### data

Object content (Buffer or stream)

`Buffer`\<`ArrayBufferLike`\> | `ReadableStream`\<`any`\>

##### metadata?

[`ObjectMetadata`](ObjectMetadata.md)

Optional metadata

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`bucket`, `key`): `Promise`\<`void`\>

Defined in: [src/core/clients/ObjectClient.ts:41](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L41)

Delete an object from storage

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

#### Returns

`Promise`\<`void`\>

***

### deleteBatch()

> **deleteBatch**(`bucket`, `keys`): `Promise`\<`void`\>

Defined in: [src/core/clients/ObjectClient.ts:48](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L48)

Delete multiple objects at once

#### Parameters

##### bucket

`string`

Bucket name

##### keys

`string`[]

Array of object keys

#### Returns

`Promise`\<`void`\>

***

### list()

> **list**(`bucket`, `prefix?`, `options?`): `Promise`\<[`ObjectInfo`](ObjectInfo.md)[]\>

Defined in: [src/core/clients/ObjectClient.ts:57](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L57)

List objects in a bucket

#### Parameters

##### bucket

`string`

Bucket name

##### prefix?

`string`

Optional prefix filter

##### options?

[`ListOptions`](ListOptions.md)

Optional list parameters

#### Returns

`Promise`\<[`ObjectInfo`](ObjectInfo.md)[]\>

Array of object info

***

### exists()

> **exists**(`bucket`, `key`): `Promise`\<`boolean`\>

Defined in: [src/core/clients/ObjectClient.ts:65](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L65)

Check if an object exists

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

#### Returns

`Promise`\<`boolean`\>

True if object exists

***

### getMetadata()

> **getMetadata**(`bucket`, `key`): `Promise`\<[`ObjectMetadata`](ObjectMetadata.md)\>

Defined in: [src/core/clients/ObjectClient.ts:73](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L73)

Get object metadata without downloading content

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

#### Returns

`Promise`\<[`ObjectMetadata`](ObjectMetadata.md)\>

Object metadata

***

### getSignedUrl()

> **getSignedUrl**(`bucket`, `key`, `operation`, `expiresIn?`): `Promise`\<`string`\>

Defined in: [src/core/clients/ObjectClient.ts:83](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ObjectClient.ts#L83)

Generate a pre-signed URL for temporary access

#### Parameters

##### bucket

`string`

Bucket name

##### key

`string`

Object key

##### operation

'get' for download, 'put' for upload

`"get"` | `"put"`

##### expiresIn?

`number`

URL expiration in seconds (default: 3600)

#### Returns

`Promise`\<`string`\>

Pre-signed URL
