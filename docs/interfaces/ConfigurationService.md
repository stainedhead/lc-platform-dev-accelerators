[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ConfigurationService

# Interface: ConfigurationService

Defined in: [src/core/services/ConfigurationService.ts:15](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L15)

## Methods

### createConfiguration()

> **createConfiguration**(`params`): `Promise`\<[`Configuration`](Configuration.md)\>

Defined in: [src/core/services/ConfigurationService.ts:21](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L21)

Create a new configuration

#### Parameters

##### params

[`CreateConfigurationParams`](CreateConfigurationParams.md)

Configuration name, content, and metadata

#### Returns

`Promise`\<[`Configuration`](Configuration.md)\>

The created configuration

***

### getConfiguration()

> **getConfiguration**(`name`, `label?`): `Promise`\<[`Configuration`](Configuration.md)\>

Defined in: [src/core/services/ConfigurationService.ts:29](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L29)

Retrieve a configuration by name and optional label

#### Parameters

##### name

`string`

Configuration name

##### label?

`string`

Optional version label (defaults to latest)

#### Returns

`Promise`\<[`Configuration`](Configuration.md)\>

The configuration content and metadata

***

### updateConfiguration()

> **updateConfiguration**(`name`, `params`): `Promise`\<[`Configuration`](Configuration.md)\>

Defined in: [src/core/services/ConfigurationService.ts:37](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L37)

Update an existing configuration

#### Parameters

##### name

`string`

Configuration name

##### params

[`UpdateConfigurationParams`](UpdateConfigurationParams.md)

New content and optional label

#### Returns

`Promise`\<[`Configuration`](Configuration.md)\>

The updated configuration

***

### deleteConfiguration()

> **deleteConfiguration**(`name`, `label?`): `Promise`\<`void`\>

Defined in: [src/core/services/ConfigurationService.ts:44](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L44)

Delete a configuration

#### Parameters

##### name

`string`

Configuration name

##### label?

`string`

Optional version label (if not specified, deletes all versions)

#### Returns

`Promise`\<`void`\>

***

### listConfigurations()

> **listConfigurations**(`label?`): `Promise`\<[`Configuration`](Configuration.md)[]\>

Defined in: [src/core/services/ConfigurationService.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L51)

List all configurations

#### Parameters

##### label?

`string`

Optional filter by label

#### Returns

`Promise`\<[`Configuration`](Configuration.md)[]\>

Array of configurations

***

### validateConfiguration()

> **validateConfiguration**(`content`, `schema`): `Promise`\<[`ValidationResult`](ValidationResult.md)\>

Defined in: [src/core/services/ConfigurationService.ts:59](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L59)

Validate configuration content against a schema

#### Parameters

##### content

`string`

Configuration content to validate

##### schema

`object`

JSON schema or validator function

#### Returns

`Promise`\<[`ValidationResult`](ValidationResult.md)\>

Validation result with any errors

***

### createProfile()

> **createProfile**(`name`, `retrievalRole?`): `Promise`\<[`ConfigurationProfile`](ConfigurationProfile.md)\>

Defined in: [src/core/services/ConfigurationService.ts:67](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L67)

Create a configuration profile for deployment

#### Parameters

##### name

`string`

Profile name

##### retrievalRole?

`string`

Optional role for retrieving configuration

#### Returns

`Promise`\<[`ConfigurationProfile`](ConfigurationProfile.md)\>

The created profile

***

### deployConfiguration()

> **deployConfiguration**(`params`): `Promise`\<`string`\>

Defined in: [src/core/services/ConfigurationService.ts:74](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/ConfigurationService.ts#L74)

Deploy a configuration to an environment

#### Parameters

##### params

[`DeployConfigurationParams`](DeployConfigurationParams.md)

Deployment parameters

#### Returns

`Promise`\<`string`\>

Deployment ID
