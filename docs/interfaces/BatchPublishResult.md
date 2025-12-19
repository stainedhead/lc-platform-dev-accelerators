[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / BatchPublishResult

# Interface: BatchPublishResult

Defined in: [src/core/types/runtime.ts:79](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L79)

Result of batch publish operations

## Properties

### successful

> **successful**: `object`[]

Defined in: [src/core/types/runtime.ts:80](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L80)

#### id

> **id**: `string`

#### eventId?

> `optional` **eventId**: `string`

***

### failed

> **failed**: `object`[]

Defined in: [src/core/types/runtime.ts:84](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L84)

#### id

> **id**: `string`

#### code

> **code**: `string`

#### message

> **message**: `string`
