# Self-host Registration Gate Tasks

**Design**: `.specs/features/022-self-host-registration-gate/design.md`
**Status**: Done

---

## Execution Plan

### Phase 1: Config + domain (Sequential)

```
T1 → T2 → T3
```

### Phase 2: API surface (Sequential — shared Routes/contract)

```
T3 → T4 → T5
```

### Phase 3: Web reflection (Sequential)

```
T5 → T6
```

---

## Task Breakdown

### T1: Add `auth.registrationDisabled` to config

**What**: Add the `auth` config object reading `DISABLE_USER_REGISTRATION` via `z.stringbool()`.
**Where**: `apps/api/src/api.config.ts`
**Depends on**: None
**Reuses**: `load()` nested-object pattern (`session`, `meta`)
**Requirement**: REGGATE-01

**Done when**:

- [ ] `config.get('auth.registrationDisabled')` is typed `boolean`
- [ ] `"false"`→false, `"true"`→true, unset→false (the stringbool correctness)
- [ ] Unit test on `load()` covers the three cases

**Tests**: unit
**Gate**: quick

---

### T2: Add `RegistrationDisabledException`

**What**: 422 business-rule error, code `identity.registration-disabled`.
**Where**: `apps/api/src/modules/identity/core/errors/identity.errors.ts`
**Depends on**: None
**Reuses**: `ApplicationException`
**Requirement**: REGGATE-02

**Done when**:

- [ ] Subclasses `ApplicationException` with status 422
- [ ] No type errors

**Tests**: none (covered via the guard's unit + e2e)
**Gate**: quick

---

### T3: Guard `RegisterUserUseCase`

**What**: Throw the gate error at the top of `execute()` before any DB access.
**Where**: `register-user.use-case.ts`
**Depends on**: T1, T2
**Reuses**: injected `ConfigService`
**Requirement**: REGGATE-02, REGGATE-03

**Done when**:

- [ ] Gate-on rejects with `RegistrationDisabledException` and touches no DB
- [ ] Unit test with a throwing `db` getter proves the no-side-effect guarantee
- [ ] Invite/accept-invite path untouched (guard lives only here)

**Tests**: unit
**Gate**: quick

---

### T4: Capability contract + `Routes` entry

**What**: `AuthCapabilitiesResponseSchema` + `Routes.auth.capabilities`.
**Where**: `packages/api-contracts/src/identity/capabilities.contract.ts`, `routes/index.ts`, `identity/index.ts`
**Depends on**: T1
**Reuses**: contract + Routes pattern
**Requirement**: REGGATE-06

**Done when**:

- [ ] Schema + inferred type exported; route declared once
- [ ] Typecheck passes across packages

**Tests**: none (contract types)
**Gate**: build

---

### T5: `GET /auth/capabilities` + api-client

**What**: Public endpoint returning `{ registrationEnabled }`; `getAuthCapabilities` + `useAuthCapabilities`.
**Where**: `auth.controller.ts`, `api-client/identity/auth.api.ts`, `use-auth-capabilities.ts`, `query-keys.ts`
**Depends on**: T4
**Reuses**: `@Public()`, `ConfigService`, `useCurrentUser` hook shape
**Requirement**: REGGATE-06

**Done when**:

- [ ] Endpoint is `@Public()` and returns the negated flag
- [ ] e2e asserts enabled/disabled + gated register returns 422
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

---

### T6: Web signup reflects the gate

**What**: `SignupForm`, `RegistrationDisabledNotice`, and the signup route branch on the flag.
**Where**: `apps/web/src/features/identity/components/*`, `routes/(auth)/signup.tsx`
**Depends on**: T5
**Reuses**: `LoginForm`, `LabeledInput`, `useRegister`, `useCurrentUser`
**Requirement**: REGGATE-04, REGGATE-05

**Done when**:

- [ ] Enabled → form; disabled → notice; both driven by `useAuthCapabilities`
- [ ] Build + typecheck pass

**Tests**: none (thin orchestration; flag wiring covered by e2e)
**Gate**: build

**Commit**: `feat(api): self-host registration gate + public capability flag`

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | config helper (fat) | unit | unit | ✅ OK |
| T2 | error class | none | none | ✅ OK |
| T3 | use-case business rule (fat) | unit | unit | ✅ OK |
| T4 | contract types | none | none | ✅ OK |
| T5 | controller (thin) | e2e | e2e | ✅ OK |
| T6 | web route (thin) | none | none | ✅ OK |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| ---- | ---------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T1, T2 | T2→T3 | ✅ Match |
| T4 | T1 | T3→T4 chain | ✅ Match |
| T5 | T4 | T4→T5 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
</content>
