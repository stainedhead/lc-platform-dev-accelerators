[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ObjectData

# Interface: ObjectData

Defined in: [src/core/types/object.ts:8](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L8)

Object Storage Types

Types for ObjectStoreService - binary object/file storage
Provider-agnostic abstractions for AWS S3, Azure Blob Storage, etc.

## Properties

### bucket

> **bucket**: `string`

Defined in: [src/core/types/object.ts:9](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L9)

***

### key

> **key**: `string`

Defined in: [src/core/types/object.ts:10](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L10)

***

### data

> **data**: `Buffer`\<`ArrayBufferLike`\> \| `ReadableStream`\<`any`\>

Defined in: [src/core/types/object.ts:11](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L11)

***

### size

> **size**: `number`

Defined in: [src/core/types/object.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L12)

***

### contentType?

> `optional` **contentType**: `string`

Defined in: [src/core/types/object.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L13)

***

### metadata?

> `optional` **metadata**: [`ObjectMetadata`](ObjectMetadata.md)

Defined in: [src/core/types/object.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L14)

***

### etag

> **etag**: `string`

Defined in: [src/core/types/object.ts:15](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L15)

***

### lastModified

> **lastModified**: `Date`

Defined in: [src/core/types/object.ts:16](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/object.ts#L16)
