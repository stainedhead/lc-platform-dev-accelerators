[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / SecretsClient

# Interface: SecretsClient

Defined in: [src/core/clients/SecretsClient.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/SecretsClient.ts#L12)

## Methods

### get()

> **get**(`secretName`, `version?`): `Promise`\<[`SecretValue`](../type-aliases/SecretValue.md)\>

Defined in: [src/core/clients/SecretsClient.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/SecretsClient.ts#L19)

Get a secret value

#### Parameters

##### secretName

`string`

Name of the secret

##### version?

`string`

Optional version ID or stage

#### Returns

`Promise`\<[`SecretValue`](../type-aliases/SecretValue.md)\>

Secret value (string or object)

***

### getJson()

> **getJson**\<`T`\>(`secretName`, `version?`): `Promise`\<`T`\>

Defined in: [src/core/clients/SecretsClient.ts:27](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/SecretsClient.ts#L27)

Get a secret value as parsed JSON

#### Type Parameters

##### T

`T` = `unknown`

#### Parameters

##### secretName

`string`

Name of the secret

##### version?

`string`

Optional version ID or stage

#### Returns

`Promise`\<`T`\>

Parsed JSON object
