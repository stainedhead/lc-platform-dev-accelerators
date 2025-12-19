[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / BatchService

# Interface: BatchService

Defined in: [src/core/services/BatchService.ts:8](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L8)

## Methods

### submitJob()

> **submitJob**(`params`): `Promise`\<[`Job`](Job.md)\>

Defined in: [src/core/services/BatchService.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L14)

Submit a batch job for execution

#### Parameters

##### params

[`JobParams`](JobParams.md)

Job configuration parameters

#### Returns

`Promise`\<[`Job`](Job.md)\>

The created job with ID and initial status

***

### getJob()

> **getJob**(`jobId`): `Promise`\<[`Job`](Job.md)\>

Defined in: [src/core/services/BatchService.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L21)

Get the current status and details of a job

#### Parameters

##### jobId

`string`

Unique identifier of the job

#### Returns

`Promise`\<[`Job`](Job.md)\>

Job details including status, progress, and results

***

### cancelJob()

> **cancelJob**(`jobId`): `Promise`\<`void`\>

Defined in: [src/core/services/BatchService.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L27)

Cancel a running or pending job

#### Parameters

##### jobId

`string`

Unique identifier of the job to cancel

#### Returns

`Promise`\<`void`\>

***

### listJobs()

> **listJobs**(`status?`): `Promise`\<[`Job`](Job.md)[]\>

Defined in: [src/core/services/BatchService.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L34)

List all jobs, optionally filtered by status

#### Parameters

##### status?

[`JobStatus`](../enumerations/JobStatus.md)

Optional status filter

#### Returns

`Promise`\<[`Job`](Job.md)[]\>

Array of jobs matching the filter

***

### scheduleJob()

> **scheduleJob**(`params`): `Promise`\<[`ScheduledJob`](ScheduledJob.md)\>

Defined in: [src/core/services/BatchService.ts:41](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L41)

Schedule a job to run on a recurring basis

#### Parameters

##### params

[`ScheduleJobParams`](ScheduleJobParams.md)

Scheduling configuration including cron expression

#### Returns

`Promise`\<[`ScheduledJob`](ScheduledJob.md)\>

The created scheduled job

***

### deleteScheduledJob()

> **deleteScheduledJob**(`scheduleId`): `Promise`\<`void`\>

Defined in: [src/core/services/BatchService.ts:47](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L47)

Remove a scheduled job

#### Parameters

##### scheduleId

`string`

Unique identifier of the scheduled job

#### Returns

`Promise`\<`void`\>

***

### listScheduledJobs()

> **listScheduledJobs**(): `Promise`\<[`ScheduledJob`](ScheduledJob.md)[]\>

Defined in: [src/core/services/BatchService.ts:53](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/BatchService.ts#L53)

List all scheduled jobs

#### Returns

`Promise`\<[`ScheduledJob`](ScheduledJob.md)[]\>

Array of all scheduled jobs
