[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / SecretsService

# Interface: SecretsService

Defined in: [src/core/services/SecretsService.ts:14](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L14)

## Methods

### createSecret()

> **createSecret**(`params`): `Promise`\<[`Secret`](Secret.md)\>

Defined in: [src/core/services/SecretsService.ts:20](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L20)

Create a new secret

#### Parameters

##### params

[`CreateSecretParams`](CreateSecretParams.md)

Secret name, value, and optional configuration

#### Returns

`Promise`\<[`Secret`](Secret.md)\>

The created secret metadata

***

### getSecretValue()

> **getSecretValue**(`secretName`): `Promise`\<[`SecretValue`](../type-aliases/SecretValue.md)\>

Defined in: [src/core/services/SecretsService.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L27)

Retrieve the current value of a secret

#### Parameters

##### secretName

`string`

Name or ARN of the secret

#### Returns

`Promise`\<[`SecretValue`](../type-aliases/SecretValue.md)\>

The secret value (string or binary)

***

### updateSecret()

> **updateSecret**(`secretName`, `params`): `Promise`\<[`Secret`](Secret.md)\>

Defined in: [src/core/services/SecretsService.ts:35](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L35)

Update an existing secret's value

#### Parameters

##### secretName

`string`

Name or ARN of the secret

##### params

[`UpdateSecretParams`](UpdateSecretParams.md)

New value and optional version stage

#### Returns

`Promise`\<[`Secret`](Secret.md)\>

The updated secret metadata

***

### deleteSecret()

> **deleteSecret**(`secretName`, `forceDelete?`): `Promise`\<`void`\>

Defined in: [src/core/services/SecretsService.ts:42](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L42)

Delete a secret (may support recovery period)

#### Parameters

##### secretName

`string`

Name or ARN of the secret

##### forceDelete?

`boolean`

If true, delete immediately without recovery period

#### Returns

`Promise`\<`void`\>

***

### listSecrets()

> **listSecrets**(): `Promise`\<[`Secret`](Secret.md)[]\>

Defined in: [src/core/services/SecretsService.ts:48](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L48)

List all secrets

#### Returns

`Promise`\<[`Secret`](Secret.md)[]\>

Array of secret metadata (without values)

***

### rotateSecret()

> **rotateSecret**(`secretName`, `config`): `Promise`\<[`Secret`](Secret.md)\>

Defined in: [src/core/services/SecretsService.ts:56](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L56)

Configure automatic rotation for a secret

#### Parameters

##### secretName

`string`

Name or ARN of the secret

##### config

[`RotationConfig`](RotationConfig.md)

Rotation schedule and function

#### Returns

`Promise`\<[`Secret`](Secret.md)\>

The updated secret metadata

***

### tagSecret()

> **tagSecret**(`secretName`, `tags`): `Promise`\<`void`\>

Defined in: [src/core/services/SecretsService.ts:63](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/services/SecretsService.ts#L63)

Tag a secret with metadata

#### Parameters

##### secretName

`string`

Name or ARN of the secret

##### tags

`Record`\<`string`, `string`\>

Key-value pairs to attach

#### Returns

`Promise`\<`void`\>
