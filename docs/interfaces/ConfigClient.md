[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / ConfigClient

# Interface: ConfigClient

Defined in: [src/core/clients/ConfigClient.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ConfigClient.ts#L12)

## Methods

### get()

> **get**(`configName`, `environment?`): `Promise`\<[`ConfigurationData`](../type-aliases/ConfigurationData.md)\>

Defined in: [src/core/clients/ConfigClient.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ConfigClient.ts#L19)

Get full configuration data

#### Parameters

##### configName

`string`

Name of the configuration

##### environment?

`string`

Optional environment/profile

#### Returns

`Promise`\<[`ConfigurationData`](../type-aliases/ConfigurationData.md)\>

Configuration data as key-value object

***

### getString()

> **getString**(`configName`, `key`, `defaultValue?`): `Promise`\<`string`\>

Defined in: [src/core/clients/ConfigClient.ts:28](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ConfigClient.ts#L28)

Get a string configuration value

#### Parameters

##### configName

`string`

Name of the configuration

##### key

`string`

Configuration key

##### defaultValue?

`string`

Default value if key not found

#### Returns

`Promise`\<`string`\>

String value

***

### getNumber()

> **getNumber**(`configName`, `key`, `defaultValue?`): `Promise`\<`number`\>

Defined in: [src/core/clients/ConfigClient.ts:37](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ConfigClient.ts#L37)

Get a number configuration value

#### Parameters

##### configName

`string`

Name of the configuration

##### key

`string`

Configuration key

##### defaultValue?

`number`

Default value if key not found

#### Returns

`Promise`\<`number`\>

Number value

***

### getBoolean()

> **getBoolean**(`configName`, `key`, `defaultValue?`): `Promise`\<`boolean`\>

Defined in: [src/core/clients/ConfigClient.ts:46](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/ConfigClient.ts#L46)

Get a boolean configuration value

#### Parameters

##### configName

`string`

Name of the configuration

##### key

`string`

Configuration key

##### defaultValue?

`boolean`

Default value if key not found

#### Returns

`Promise`\<`boolean`\>

Boolean value
