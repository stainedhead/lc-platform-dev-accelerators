[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / AuthClient

# Interface: AuthClient

Defined in: [src/core/clients/AuthClient.ts:12](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/AuthClient.ts#L12)

## Methods

### validateToken()

> **validateToken**(`token`): `Promise`\<[`TokenClaims`](TokenClaims.md)\>

Defined in: [src/core/clients/AuthClient.ts:19](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/AuthClient.ts#L19)

Validate an access token and extract claims

#### Parameters

##### token

`string`

Access token (JWT)

#### Returns

`Promise`\<[`TokenClaims`](TokenClaims.md)\>

Token claims if valid

#### Throws

AuthenticationError if token is invalid

***

### getUserInfo()

> **getUserInfo**(`token`): `Promise`\<[`UserInfo`](UserInfo.md)\>

Defined in: [src/core/clients/AuthClient.ts:26](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/AuthClient.ts#L26)

Get user information from a token

#### Parameters

##### token

`string`

Access token

#### Returns

`Promise`\<[`UserInfo`](UserInfo.md)\>

User information

***

### hasScope()

> **hasScope**(`token`, `scope`): `Promise`\<`boolean`\>

Defined in: [src/core/clients/AuthClient.ts:34](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/AuthClient.ts#L34)

Check if a token has a specific scope

#### Parameters

##### token

`string`

Access token

##### scope

`string`

Scope to check

#### Returns

`Promise`\<`boolean`\>

True if token has the scope

***

### hasRole()

> **hasRole**(`token`, `role`): `Promise`\<`boolean`\>

Defined in: [src/core/clients/AuthClient.ts:42](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/8e8a9bd5c5e99cde3287922bb5b9f0ba36e55f6d/src/core/clients/AuthClient.ts#L42)

Check if a token has a specific role

#### Parameters

##### token

`string`

Access token

##### role

`string`

Role to check

#### Returns

`Promise`\<`boolean`\>

True if token has the role
