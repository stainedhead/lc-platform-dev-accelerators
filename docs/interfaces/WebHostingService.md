[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / WebHostingService

# Interface: WebHostingService

Defined in: [src/core/services/WebHostingService.ts:18](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L18)

## Methods

### deployApplication()

> **deployApplication**(`params`): `Promise`\<[`Deployment`](Deployment.md)\>

Defined in: [src/core/services/WebHostingService.ts:23](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L23)

Deploy a containerized application
FR-001: Deploy containerized applications with auto-scaling

#### Parameters

##### params

[`DeployApplicationParams`](DeployApplicationParams.md)

#### Returns

`Promise`\<[`Deployment`](Deployment.md)\>

***

### getDeployment()

> **getDeployment**(`deploymentId`): `Promise`\<[`Deployment`](Deployment.md)\>

Defined in: [src/core/services/WebHostingService.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L29)

Get deployment status and details
FR-002: Get application URL and deployment status

#### Parameters

##### deploymentId

`string`

#### Returns

`Promise`\<[`Deployment`](Deployment.md)\>

***

### updateApplication()

> **updateApplication**(`deploymentId`, `params`): `Promise`\<[`Deployment`](Deployment.md)\>

Defined in: [src/core/services/WebHostingService.ts:35](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L35)

Update a running application (rolling update)
FR-003: Update application with zero downtime

#### Parameters

##### deploymentId

`string`

##### params

[`UpdateApplicationParams`](UpdateApplicationParams.md)

#### Returns

`Promise`\<[`Deployment`](Deployment.md)\>

***

### deleteApplication()

> **deleteApplication**(`deploymentId`): `Promise`\<`void`\>

Defined in: [src/core/services/WebHostingService.ts:41](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L41)

Delete an application deployment
FR-004: Delete application and clean up resources

#### Parameters

##### deploymentId

`string`

#### Returns

`Promise`\<`void`\>

***

### getApplicationUrl()

> **getApplicationUrl**(`deploymentId`): `Promise`\<`string`\>

Defined in: [src/core/services/WebHostingService.ts:47](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L47)

Get the public URL for an application
FR-002: Retrieve application URL

#### Parameters

##### deploymentId

`string`

#### Returns

`Promise`\<`string`\>

***

### scaleApplication()

> **scaleApplication**(`deploymentId`, `params`): `Promise`\<`void`\>

Defined in: [src/core/services/WebHostingService.ts:53](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/WebHostingService.ts#L53)

Scale application instances
FR-005: Scale min/max instances

#### Parameters

##### deploymentId

`string`

##### params

[`ScaleParams`](ScaleParams.md)

#### Returns

`Promise`\<`void`\>
