# OAuth / SSO Login Tasks

**Design**: `.specs/features/025-oauth-sso-login/design.md`
**Status**: In Progress

---

## Execution Plan

### Phase 1: Schema + persistence (Sequential)

```
T1 → T2
```

### Phase 2: Port + provider + config (Sequential)

```
T2 → T3 → T4
```

### Phase 3: Domain (Sequential)

```
T4 → T5
```

### Phase 4: API surface + capability (Sequential)

```
T5 → T6 → T7
```

### Phase 5: Web (Sequential)

```
T7 → T8
```

---

## Task Breakdown

### T1: `identities` table + nullable `passwordHash` + migration

**What**: Add the `identities` schema (unique provider+providerAccountId), make `users.passwordHash` nullable, regenerate migration.
**Where**: `db/schemas/identities.ts`, `db/schemas/users.ts`, `db/schemas/index.ts`, `drizzle/*`
**Depends on**: None
**Reuses**: `defaults()`, schema index pattern
**Requirement**: OAUTH-04, OAUTH-06

**Done when**:

- [ ] `identities` created with unique `(provider, providerAccountId)`; `passwordHash` nullable
- [ ] `bun db:generate` produces migration + checksum; verify passes
- [ ] Typecheck passes

**Tests**: none (schema)
**Gate**: build

---

### T2: `IdentityRepository` + AuthenticateUseCase null-hash guard

**What**: `findByProviderAccount` / `create`; reject password login when `passwordHash` is null.
**Where**: `identity/persistence/identity.repository.ts`, `core/use-cases/authenticate.use-case.ts`
**Depends on**: T1
**Reuses**: repository pattern, existing authenticate flow
**Requirement**: OAUTH-04

**Done when**:

- [ ] Repo finds/creates identities
- [ ] Password login on a null-hash account → `InvalidCredentialsException`
- [ ] Authenticate unit test for the null-hash branch; quick gate passes

**Tests**: unit (authenticate null-hash branch)
**Gate**: quick

---

### T3: `OAuthProvider` port + registry + errors

**What**: Port, manifest, `OAuthProfile`, `OAuthProviderRegistry`, OAuth error classes.
**Where**: `identity/core/oauth/*`, `core/errors/identity.errors.ts`
**Depends on**: None
**Reuses**: `CrmConnectorRegistry`
**Requirement**: OAUTH-01

**Done when**:

- [ ] Registry resolves by id (unknown → `UnknownOAuthProviderException`), lists manifests, fails fast on dup
- [ ] Typecheck passes

**Tests**: none (registry mirrors a tested pattern; exercised via e2e/unit downstream)
**Gate**: quick

---

### T4: `GithubOAuthProvider` + config

**What**: GitHub provider (authorize URL + code exchange via fetch); `oauth.github` config; module wiring of the provider array.
**Where**: `identity/core/oauth/github-oauth-provider.ts`, `api.config.ts`, `.env.example`, `deploy/docker-compose.yml`, `identity.module.ts`
**Depends on**: T3
**Reuses**: `ConfigService`, multi-provider DI token pattern
**Requirement**: OAUTH-01, OAUTH-09

**Done when**:

- [ ] `authorizationUrl` builds the GitHub URL with client id, redirect, scope, state
- [ ] `exchangeCode` posts the code and reads the verified primary email
- [ ] Enabled only when client id + secret are set
- [ ] Typecheck passes

**Tests**: none (HTTP boundary; linking logic tested via fake provider in T5)
**Gate**: build

---

### T5: `HandleOAuthCallbackUseCase`

**What**: The account-linking decision (existing identity → link by verified email → create new, gated), then issue a session.
**Where**: `identity/core/use-cases/handle-oauth-callback.use-case.ts`
**Depends on**: T2, T3
**Reuses**: session creation, register's user provisioning, registration gate
**Requirement**: OAUTH-04, OAUTH-05, OAUTH-06, OAUTH-07, OAUTH-08

**Done when**:

- [ ] Existing identity → that user; verified-email match → link; no match → create (gated)
- [ ] Unverified provider email → `OAuthEmailUnverifiedException`; gate-on new user → `RegistrationDisabledException`
- [ ] Unit tests cover all five branches with a fake provider/repos
- [ ] Quick gate passes

**Tests**: unit
**Gate**: quick

---

### T6: `OAuthController` + module wiring

**What**: `GET /auth/oauth/:provider` (state cookie + redirect) and `/callback` (verify state, exchange, session cookie, redirect).
**Where**: `identity/http/controllers/oauth.controller.ts`, `identity.module.ts`
**Depends on**: T5
**Reuses**: cookie helpers, `@Public`, registry
**Requirement**: OAUTH-01, OAUTH-02, OAUTH-03

**Done when**:

- [ ] Begin sets a short-lived httpOnly state cookie and 302s to the provider
- [ ] Callback rejects on missing/mismatched state; on success sets the session cookie and 302s to the app
- [ ] e2e with a fake provider: begin sets state+redirects; callback good state → session + redirect; bad state → rejected
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

---

### T7: Capability flag lists providers

**What**: Extend `GET /auth/capabilities` with `oauthProviders: { id, label }[]` from enabled providers; update the contract + hook consumers.
**Where**: `api-contracts/identity/capabilities.contract.ts`, `auth.controller.ts`
**Depends on**: T4
**Reuses**: feature 022 capability endpoint
**Requirement**: OAUTH-09

**Done when**:

- [ ] Capability returns enabled provider manifests; existing `registrationEnabled` unchanged
- [ ] e2e asserts the providers array shape; typecheck across packages
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

---

### T8: Login provider buttons

**What**: Render a "Sign in with <label>" button per enabled provider on the login screen, linking to the begin route at the API origin.
**Where**: `apps/web/src/features/identity/components/oauth-buttons.tsx`, `login-form.tsx` (or login route)
**Depends on**: T7
**Reuses**: `useAuthCapabilities`, `buttonVariants`, API base url helper
**Requirement**: OAUTH-09

**Done when**:

- [ ] One button per enabled provider; none shown when empty
- [ ] Build + typecheck pass

**Tests**: none (thin; behavior covered by capability e2e)
**Gate**: build

**Commit**: `feat(api): OAuth/SSO login with GitHub behind a provider port`

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | schema | none | none | ✅ OK |
| T2 | repo + use-case branch (fat) | unit | unit | ✅ OK |
| T3 | registry (mirrors tested pattern) | none | none | ✅ OK |
| T4 | provider (HTTP boundary) | none | none | ✅ OK |
| T5 | use-case (fat) | unit | unit | ✅ OK |
| T6 | controller (thin) + wiring | e2e | e2e | ✅ OK |
| T7 | controller (thin) | e2e | e2e | ✅ OK |
| T8 | web (thin) | none | none | ✅ OK |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| ---- | ---------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | None | (folded into Phase 2) | ✅ Match |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T2, T3 | →UC | ✅ Match |
| T6 | T5 | UC→controller | ✅ Match |
| T7 | T4 | CAP→login | ✅ Match |
| T8 | T7 | login buttons | ✅ Match |
</content>
