[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / Job

# Interface: Job

Defined in: [src/core/types/job.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L14)

## Properties

### id

> **id**: `string`

Defined in: [src/core/types/job.ts:15](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L15)

***

### name

> **name**: `string`

Defined in: [src/core/types/job.ts:16](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L16)

***

### status

> **status**: [`JobStatus`](../enumerations/JobStatus.md)

Defined in: [src/core/types/job.ts:17](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L17)

***

### image

> **image**: `string`

Defined in: [src/core/types/job.ts:18](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L18)

***

### command?

> `optional` **command**: `string`[]

Defined in: [src/core/types/job.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L19)

***

### environment

> **environment**: `Record`\<`string`, `string`\>

Defined in: [src/core/types/job.ts:20](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L20)

***

### cpu

> **cpu**: `number`

Defined in: [src/core/types/job.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L21)

***

### memory

> **memory**: `number`

Defined in: [src/core/types/job.ts:22](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L22)

***

### timeout

> **timeout**: `number`

Defined in: [src/core/types/job.ts:23](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L23)

***

### retryCount

> **retryCount**: `number`

Defined in: [src/core/types/job.ts:24](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L24)

***

### attemptsMade

> **attemptsMade**: `number`

Defined in: [src/core/types/job.ts:25](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L25)

***

### created

> **created**: `Date`

Defined in: [src/core/types/job.ts:26](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L26)

***

### started?

> `optional` **started**: `Date`

Defined in: [src/core/types/job.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L27)

***

### completed?

> `optional` **completed**: `Date`

Defined in: [src/core/types/job.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L28)

***

### exitCode?

> `optional` **exitCode**: `number`

Defined in: [src/core/types/job.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L29)

***

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [src/core/types/job.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/types/job.ts#L30)
