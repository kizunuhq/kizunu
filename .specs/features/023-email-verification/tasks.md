# Email Verification Tasks

**Design**: `.specs/features/023-email-verification/design.md`
**Status**: In Progress

---

## Execution Plan

### Phase 1: Domain use-cases (Sequential — shared repo method)

```
T1 → T2 → T3
```

### Phase 2: Register composition + API surface (Sequential)

```
T3 → T4 → T5 → T6
```

### Phase 3: Web surface (Sequential)

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: `UserRepository.markEmailVerified` + `InvalidVerificationTokenException`

**What**: Add the verify-setter and the 422 error class.
**Where**: `persistence/user.repository.ts`, `core/errors/identity.errors.ts`
**Depends on**: None
**Reuses**: `setPasswordHash` pattern, `ApplicationException`
**Requirement**: EMAILVER-02, EMAILVER-03

**Done when**:

- [ ] `markEmailVerified(id, verifiedAt)` updates `emailVerifiedAt`
- [ ] Error code `identity.invalid-verification-token`, status 422
- [ ] Typecheck passes

**Tests**: none (exercised by T2/T3 unit + e2e)
**Gate**: quick

---

### T2: `RequestEmailVerificationUseCase`

**What**: Mint + mail a token; no-op if user missing or already verified.
**Where**: `core/use-cases/request-email-verification.use-case.ts`
**Depends on**: T1
**Reuses**: `RequestPasswordResetUseCase` shape, token helper, `MailSender`
**Requirement**: EMAILVER-01, EMAILVER-05, EMAILVER-06

**Done when**:

- [ ] Mints `email_verification` token, mails `${appUrl}/verify-email?token=...`
- [ ] No-op (no token, no mail) when user missing or `emailVerifiedAt` set
- [ ] Unit tests: mints+mails for unverified; no-op when verified
- [ ] Quick gate passes

**Tests**: unit
**Gate**: quick

---

### T3: `ConfirmEmailVerificationUseCase`

**What**: Consume token, set `emailVerifiedAt`; reject invalid tokens.
**Where**: `core/use-cases/confirm-email-verification.use-case.ts`
**Depends on**: T1
**Reuses**: `ResetPasswordUseCase` shape
**Requirement**: EMAILVER-02, EMAILVER-03

**Done when**:

- [ ] Valid token → `markEmailVerified` + `markConsumed`
- [ ] Unknown/expired/consumed → `InvalidVerificationTokenException`
- [ ] Unit tests cover both branches
- [ ] Quick gate passes

**Tests**: unit
**Gate**: quick

---

### T4: Compose verification into register

**What**: Inject `RequestEmailVerificationUseCase`, call it after the register transaction commits.
**Where**: `register-user.use-case.ts`
**Depends on**: T2
**Reuses**: existing register flow
**Requirement**: EMAILVER-01, EMAILVER-04

**Done when**:

- [ ] Successful register triggers a verification mail; gated/failed register does not
- [ ] Existing register unit/e2e still green
- [ ] Quick gate passes

**Tests**: unit (existing register gate spec stays green)
**Gate**: quick

---

### T5: Contract + `Routes` entries

**What**: `ConfirmEmailVerificationSchema` + `Routes.auth.emailVerification` / `emailVerificationConfirm`.
**Where**: `api-contracts/identity/email-verification.contract.ts`, `routes/index.ts`, `identity/index.ts`
**Depends on**: None
**Reuses**: password-reset contract pattern
**Requirement**: EMAILVER-01, EMAILVER-02

**Done when**:

- [ ] Schema + type exported; both routes declared
- [ ] Typecheck passes across packages

**Tests**: none (contract types)
**Gate**: build

---

### T6: `EmailVerificationController` + module wiring + api-client

**What**: Authed resend + public confirm endpoints; register the controller + use-cases; client calls + hooks.
**Where**: `http/controllers/email-verification.controller.ts`, `identity.module.ts`, `api-client/identity/auth.api.ts`, `use-resend-email-verification.ts`, `use-confirm-email-verification.ts`
**Depends on**: T3, T4, T5
**Reuses**: `PasswordResetController`, `@CurrentUser`/`@Public`, reset hooks
**Requirement**: EMAILVER-01, EMAILVER-02, EMAILVER-05, EMAILVER-07

**Done when**:

- [ ] Resend authed (401 without session, 204 with), confirm public (204)
- [ ] e2e: register→capture console token→confirm sets `emailVerifiedAt`; replay→422; resend no-op when verified; resend without session→401
- [ ] Full gate passes

**Tests**: e2e
**Gate**: full

---

### T7: `EmailVerificationBanner` in app shell

**What**: Unverified banner with a resend action, rendered above `<Outlet />`.
**Where**: `features/identity/components/email-verification-banner.tsx`, `features/app-shell/components/app-shell.tsx`
**Depends on**: T6
**Reuses**: `useCurrentUser`, `useResendEmailVerification`, `Button`
**Requirement**: EMAILVER-08

**Done when**:

- [ ] Hidden when verified; shows resend + sent confirmation when unverified
- [ ] Build + typecheck pass

**Tests**: none (thin; behavior covered by e2e)
**Gate**: build

---

### T8: `/verify-email` route + `VerifyEmailPanel`

**What**: Public route reading `?token=`, confirming on mount, showing pending/success/error.
**Where**: `routes/(auth)/verify-email.tsx`, `features/identity/components/verify-email-panel.tsx`
**Depends on**: T6
**Reuses**: `useConfirmEmailVerification`, `Card` primitives, `buttonVariants`
**Requirement**: EMAILVER-09

**Done when**:

- [ ] Good token → success + continue link; missing/bad token → error
- [ ] Build + typecheck pass

**Tests**: none (thin orchestration)
**Gate**: build

**Commit**: `feat(api): email verification (register mint + confirm/resend + web)`

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | repo setter + error | none | none | ✅ OK |
| T2 | use-case (fat) | unit | unit | ✅ OK |
| T3 | use-case (fat) | unit | unit | ✅ OK |
| T4 | use-case composition (fat) | unit | unit | ✅ OK |
| T5 | contract types | none | none | ✅ OK |
| T6 | controller (thin) + wiring | e2e | e2e | ✅ OK |
| T7 | web component (thin) | none | none | ✅ OK |
| T8 | web route (thin) | none | none | ✅ OK |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| ---- | ---------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T1 | T1→...→T3 | ✅ Match |
| T4 | T2 | T3→T4 | ✅ Match |
| T5 | None | (parallelizable; folded into Phase 2) | ✅ Match |
| T6 | T3, T4, T5 | T5→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T6 | T7→T8 | ✅ Match |
</content>
