[**LC Platform Dev Accelerators v0.1.0**](../README.md)

***

[LC Platform Dev Accelerators](../globals.md) / AuthenticationService

# Interface: AuthenticationService

Defined in: [src/core/services/AuthenticationService.ts:8](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L8)

## Methods

### configure()

> **configure**(`config`): `Promise`\<`void`\>

Defined in: [src/core/services/AuthenticationService.ts:13](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L13)

Initialize the authentication service with provider configuration

#### Parameters

##### config

[`AuthConfig`](AuthConfig.md)

Authentication provider configuration

#### Returns

`Promise`\<`void`\>

***

### getAuthorizationUrl()

> **getAuthorizationUrl**(`redirectUri`, `scopes?`, `state?`): `Promise`\<`string`\>

Defined in: [src/core/services/AuthenticationService.ts:22](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L22)

Get the authorization URL to redirect users for login

#### Parameters

##### redirectUri

`string`

Callback URL after authentication

##### scopes?

`string`[]

Optional array of OAuth scopes to request

##### state?

`string`

Optional state parameter for CSRF protection

#### Returns

`Promise`\<`string`\>

Authorization URL

***

### exchangeCodeForTokens()

> **exchangeCodeForTokens**(`code`, `redirectUri`): `Promise`\<[`TokenSet`](TokenSet.md)\>

Defined in: [src/core/services/AuthenticationService.ts:30](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L30)

Exchange authorization code for tokens

#### Parameters

##### code

`string`

Authorization code from callback

##### redirectUri

`string`

The same redirect URI used in authorization request

#### Returns

`Promise`\<[`TokenSet`](TokenSet.md)\>

Token set including access token, ID token, and refresh token

***

### refreshAccessToken()

> **refreshAccessToken**(`refreshToken`): `Promise`\<[`TokenSet`](TokenSet.md)\>

Defined in: [src/core/services/AuthenticationService.ts:37](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L37)

Refresh an access token using a refresh token

#### Parameters

##### refreshToken

`string`

The refresh token

#### Returns

`Promise`\<[`TokenSet`](TokenSet.md)\>

New token set

***

### validateToken()

> **validateToken**(`accessToken`): `Promise`\<[`TokenClaims`](TokenClaims.md)\>

Defined in: [src/core/services/AuthenticationService.ts:44](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L44)

Validate and decode an access token

#### Parameters

##### accessToken

`string`

The access token to validate

#### Returns

`Promise`\<[`TokenClaims`](TokenClaims.md)\>

Decoded token claims if valid

***

### getUserInfo()

> **getUserInfo**(`accessToken`): `Promise`\<[`UserInfo`](UserInfo.md)\>

Defined in: [src/core/services/AuthenticationService.ts:51](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L51)

Get user information using an access token

#### Parameters

##### accessToken

`string`

The access token

#### Returns

`Promise`\<[`UserInfo`](UserInfo.md)\>

User profile information

***

### revokeToken()

> **revokeToken**(`token`): `Promise`\<`void`\>

Defined in: [src/core/services/AuthenticationService.ts:57](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L57)

Revoke a token (logout)

#### Parameters

##### token

`string`

The token to revoke (access or refresh)

#### Returns

`Promise`\<`void`\>

***

### verifyIdToken()

> **verifyIdToken**(`idToken`): `Promise`\<[`TokenClaims`](TokenClaims.md)\>

Defined in: [src/core/services/AuthenticationService.ts:64](https://github.com/stainedhead/lc-platform-dev-accelerators/blob/12c3626979e745866113de19cb4bb33222f28139/src/core/services/AuthenticationService.ts#L64)

Verify an ID token's signature and claims

#### Parameters

##### idToken

`string`

The ID token to verify

#### Returns

`Promise`\<[`TokenClaims`](TokenClaims.md)\>

Decoded token claims if valid
