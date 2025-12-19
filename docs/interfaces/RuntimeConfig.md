[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / RuntimeConfig

# Interface: RuntimeConfig

Defined in: [src/core/types/runtime.ts:16](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L16)

Configuration for LCAppRuntime
Used by hosted applications to access cloud services at runtime

## Properties

### provider

> **provider**: [`ProviderType`](../enumerations/ProviderType.md)

Defined in: [src/core/types/runtime.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L17)

***

### region?

> `optional` **region**: `string`

Defined in: [src/core/types/runtime.ts:18](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L18)

***

### credentials?

> `optional` **credentials**: `object`

Defined in: [src/core/types/runtime.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L19)

#### accessKeyId?

> `optional` **accessKeyId**: `string`

#### secretAccessKey?

> `optional` **secretAccessKey**: `string`

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [src/core/types/runtime.ts:26](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L26)

Optional endpoint override for testing (e.g., LocalStack)

***

### options?

> `optional` **options**: `Record`\<`string`, `unknown`\>

Defined in: [src/core/types/runtime.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/types/runtime.ts#L30)

Additional provider-specific options
