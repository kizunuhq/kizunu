# OAuth / SSO Login Design

**Spec**: `.specs/features/025-oauth-sso-login/spec.md`
**Status**: Approved

---

## Architecture Overview

A provider-agnostic OAuth2 authorization-code flow. The provider integration sits
behind an `OAuthProvider` port resolved by a registry (mirroring
`CrmConnectorRegistry`). The controller owns the redirect + state-cookie mechanics;
the account-linking decision lives in one use-case.

```mermaid
graph TD
    LOGIN[/login provider button/] --> BEGIN[GET /auth/oauth/:provider]
    BEGIN -->|set state cookie| PROVIDER[Provider authorize URL]
    PROVIDER --> CB[GET /auth/oauth/:provider/callback]
    CB -->|verify state| EXCH[OAuthProvider.exchangeCode]
    EXCH --> UC[HandleOAuthCallbackUseCase]
    UC --> ID[(identities)]
    UC --> USERS[(users)]
    UC --> SESS[(sessions)]
    UC -->|session cookie + redirect| APP[/workspace]
    CAP[GET /auth/capabilities] --> LOGIN
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component                        | Location                                              | How to Use                          |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `CrmConnectorRegistry` pattern   | `crm/core/connector/crm-connector-registry.ts`        | Mirror for `OAuthProviderRegistry`  |
| Session creation                 | `authenticate.use-case.ts` (token + `sessions.create`)| Reuse to issue the OAuth session    |
| Workspace+membership create      | `register-user.use-case.ts` transaction               | Reuse the new-user shape            |
| `ConfigService` nested objects   | `api.config.ts`                                       | Add `oauth.github`                  |
| `@Public` + cookie helpers       | `auth.controller.ts`                                  | Begin/callback are public           |
| `GET /auth/capabilities`         | feature 022                                           | Extend with `oauthProviders`        |
| login form / `LoginForm`         | `apps/web/.../login-form.tsx`                         | Add provider buttons                |

### Integration Points

| System                  | Integration Method                                          |
| ----------------------- | ----------------------------------------------------------- |
| `RegisterUserUseCase`   | Share new-user creation (extract a small `provisionUser`)   |
| Registration gate (022) | New-user OAuth path checks `auth.registrationDisabled`      |
| `users.passwordHash`    | Becomes nullable; `AuthenticateUseCase` rejects null-hash   |

---

## Components

### `OAuthProvider` port + `OAuthProviderManifest`

- **Purpose**: provider-agnostic OAuth surface.
- **Location**: `identity/core/oauth/oauth-provider.ts`, `oauth-provider-manifest.ts`
- **Interfaces**:
  - `manifest: { id: string; label: string }`
  - `authorizationUrl(input: { state: string; redirectUri: string }): string`
  - `exchangeCode(input: { code: string; redirectUri: string }): Promise<OAuthProfile>`
- **`OAuthProfile`**: `{ providerAccountId: string; email: string; emailVerified: boolean; name: string }`

### `OAuthProviderRegistry`

- **Purpose**: resolve a provider by id; list enabled manifests.
- **Location**: `identity/core/oauth/oauth-provider-registry.ts`
- **Reuses**: `CrmConnectorRegistry` shape (multi-provider DI array, fail-fast on dup).

### `GithubOAuthProvider`

- **Purpose**: concrete GitHub provider (real `fetch` to token + user/emails endpoints).
- **Location**: `identity/core/oauth/github-oauth-provider.ts`
- **Dependencies**: `ConfigService` (clientId/secret).

### `IdentityRepository`

- **Purpose**: find/create identities.
- **Location**: `identity/persistence/identity.repository.ts`
- **Interfaces**: `findByProviderAccount(provider, providerAccountId)`, `create({ userId, provider, providerAccountId })`.

### `HandleOAuthCallbackUseCase` (the FAT core)

- **Purpose**: turn a verified profile into a signed-in user.
- **Location**: `identity/core/use-cases/handle-oauth-callback.use-case.ts`
- **Logic**:
  1. identity exists for `(provider, providerAccountId)` → that user.
  2. else require `emailVerified` (else `OAuthEmailUnverifiedException`).
  3. user with that email exists → create identity (link).
  4. else gate check (`registrationDisabled` → `RegistrationDisabledException`),
     then provision user (+ workspace + membership) + identity.
  5. issue a session; return `{ sessionToken, expiresAt }`.

### `OAuthController`

- **Purpose**: begin (redirect + state cookie) + callback (verify state, exchange, session, redirect).
- **Location**: `identity/http/controllers/oauth.controller.ts`
- **Routes**: `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback`.

### Config + capability + web

- **Config**: `oauth: { github: { clientId, clientSecret } }`; provider enabled when both set.
- **Capability**: `GET /auth/capabilities` returns `oauthProviders: { id, label }[]`.
- **Web**: provider buttons on the login screen linking to `/auth/oauth/:id` (absolute API origin).

---

## Data Models

### `identities`

```typescript
interface Identity {
  id: string
  userId: string // -> users.id, cascade
  provider: string // 'github'
  providerAccountId: string
  createdAt: Date
  updatedAt: Date
}
// unique (provider, providerAccountId)
```

### `users.passwordHash` → nullable

OAuth-only users have no password. Password login rejects a null hash.

---

## Error Handling Strategy

| Error Scenario                       | Handling                                  | User Impact                           |
| ------------------------------------ | ----------------------------------------- | ------------------------------------- |
| Unknown provider id                  | `UnknownOAuthProviderException` (422)     | 422                                   |
| State missing/mismatch               | reject callback, no session               | Redirect to login with error          |
| Provider email unverified            | `OAuthEmailUnverifiedException` (422)     | Redirect to login with error          |
| New-user OAuth while gate on         | `RegistrationDisabledException` (422)     | Redirect to login with error          |
| Provider/token exchange failure      | propagates → callback redirects to login error | Login error                       |

---

## Tech Decisions (only non-obvious ones)

| Decision               | Choice                                  | Rationale                                                          |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Provider behind a port | `OAuthProvider` + registry              | Second provider is a plugin, consistent with channel/CRM pattern   |
| Linking key            | Verified email only                     | Unverified email linking is an account-takeover vector             |
| Gate interaction       | Block new-user OAuth, allow existing    | Keeps slice 022's lock-down meaningful for the OAuth path          |
| Callback result        | 302 redirect to web + session cookie    | OAuth is a browser redirect flow, not an XHR                       |
</content>
