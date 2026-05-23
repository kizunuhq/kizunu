# Auth Surface Tasks

**Design**: `.specs/features/034-auth-surface/design.md`
**Spec**: `.specs/features/034-auth-surface/spec.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1: shared shells + error dictionaries
  T1 (AuthLayout) ──┐
  T2 (AuthBrandingPanel) ──┐
  T3 (OAuthErrorAlert + OAUTH_ERROR_COPY) [P]
  T4 (login-error-copy.ts dictionary) [P]
  T5 (OAuthSeparator) [P]

Phase 2: form components
  T6 (LoginForm rework) needs T4
  T7 (SignupForm rework) needs T4
  T8 (VerifyEmailPanel unwrap) — independent
  T9 (RegistrationDisabledNotice unwrap) — independent

Phase 3: new pages
  T10 (LoginPage with OAuth alert) needs T1, T3, T6
  T11 (SignupPage rewrap) needs T1, T7
  T12 (VerifyEmailPage rewrap) needs T1, T8
  T13 (ForgotPasswordPage + form + route) needs T1
  T14 (ResetPasswordPage + form + route) needs T1
  T15 (AcceptInvitePage rewrite) needs T1

Phase 4: tests
  T16 (ResetPasswordForm password-match unit test) needs T14

Phase 5: ship
  T17 (bun check green)
  T18 (impeccable polish pass)
  T19 (thermo-nuclear-code-quality-review)
  T20 (push, PR, CI watch, squash)
```

---

## Task Breakdown

### T1: AuthLayout replacement

**What**: Replace the centered-card layout at `apps/web/src/routes/auth/route.tsx` with a two-column split-screen: branding left, form right.

**Where**: `apps/web/src/routes/auth/route.tsx`

**Depends on**: T2 (AuthBrandingPanel)

**Reuses**: TanStack Router `Outlet`.

**Requirement**: AUTH-01, AUTH-02, AUTH-03.

**Done when**:
- [ ] Desktop renders branding (left, `hidden md:flex`) and form column (right, max-w-540, centered).
- [ ] Mobile collapses to single column; branding hides.
- [ ] Tokens compliant with DESIGN.md.

**Tests**: none (thin presentational).
**Gate**: build.

**Commit**: `feat(web): split-screen AuthLayout`

---

### T2: AuthBrandingPanel

**What**: Left-column branding component with ASCII aurora + wordmark + tagline.

**Where**: `apps/web/src/features/identity/components/auth-branding-panel.tsx`

**Depends on**: None

**Reuses**: existing `Background` ASCII aurora, `KizunuMark`.

**Requirement**: AUTH-01.

**Done when**:
- [ ] Renders aurora full-height with `accentColorVar='--kizunu-green'`, `fieldOpacity={0.16}`, `pointerTrail={false}`.
- [ ] Wordmark + positioning line anchored bottom-left over aurora.
- [ ] `hidden md:flex` so it disappears on mobile.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): add AuthBrandingPanel`

---

### T3: OAuthErrorAlert + OAUTH_ERROR_COPY [P]

**What**: Dismissible inline alert mapping OAuth error codes to copy.

**Where**:
- `apps/web/src/features/identity/components/oauth-error-alert.tsx`
- `apps/web/src/features/identity/lib/oauth-error-copy.ts`

**Depends on**: None

**Reuses**: phosphor `X` icon (close button), `Button` primitive.

**Requirement**: AUTH-15, AUTH-16.

**Done when**:
- [ ] `OAUTH_ERROR_COPY` is a `const` object + derived type per `.agents/rules/enums.md`.
- [ ] Known codes: `oauth_state`, `identity.oauth-email-conflict`, `identity.oauth-provider-missing`.
- [ ] Unknown code falls back to generic copy.
- [ ] Alert has destructive-tinted border + foreground, no background tint, `--radius`.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): add OAuthErrorAlert + error copy map`

---

### T4: login-error-copy.ts dictionary [P]

**What**: Const-object map of `ApiError.code` → `{ message, actionHref?, actionLabel? }` for login + register screens.

**Where**: `apps/web/src/features/identity/lib/login-error-copy.ts`

**Depends on**: None

**Reuses**: `ApiError` from `@kizunu/api-client`.

**Requirement**: AUTH-22, AUTH-23, AUTH-24, AUTH-25.

**Done when**:
- [ ] `LOGIN_ERROR_COPY` is a `const` object + derived type.
- [ ] Includes `identity.invalid-credentials`, `identity.email-taken`, `identity.account-locked`, `identity.registration-disabled`.
- [ ] Exports a small `mapLoginError(error: ApiError | null): { message; actionHref?; actionLabel? } | null` helper.

**Tests**: none (pure data).
**Gate**: build.

**Commit**: `feat(web): add login error copy map`

---

### T5: OAuthSeparator [P]

**What**: Horizontal mono kicker separator ("[or continue with]") between forms and OAuth buttons.

**Where**: `apps/web/src/features/identity/components/oauth-separator.tsx`

**Depends on**: None

**Reuses**: Tailwind only.

**Requirement**: AUTH-20.

**Done when**:
- [ ] Renders a horizontal dashed rule with a centered mono kicker over it.
- [ ] Only renders when consumers say to (parent decides via OAuthButtons being non-empty).

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): add OAuthSeparator`

---

### T6: Rework LoginForm

**What**: Drop `Card` wrapper. Replace generic `getApiErrorMessage` with `mapLoginError` for known codes (fallback to generic). Add cross-links beneath submit.

**Where**: `apps/web/src/features/identity/components/login-form.tsx`

**Depends on**: T4

**Reuses**: `useLogin`, `LabeledInput`, `Button`, `FieldError`, `Link`.

**Requirement**: AUTH-17, AUTH-19, AUTH-22, AUTH-24, AUTH-25.

**Done when**:
- [ ] No `Card`/`CardContent`/`CardHeader`/`CardTitle`/`CardDescription` imports.
- [ ] Renders a `PageHeader` (or inline title) above the form.
- [ ] Below submit: "Forgot password?" link, "Need an account? Sign up" link.
- [ ] Known error codes render their mapped copy; unknown falls back.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): rework LoginForm for split-screen AuthLayout`

---

### T7: Rework SignupForm

**What**: Same treatment as LoginForm. Map `identity.email-taken` and add "Already have an account? Sign in" cross-link.

**Where**: `apps/web/src/features/identity/components/signup-form.tsx`

**Depends on**: T4

**Reuses**: same set as LoginForm.

**Requirement**: AUTH-18, AUTH-19, AUTH-23, AUTH-25.

**Done when**:
- [ ] No `Card` wrappers.
- [ ] Inline title.
- [ ] Cross-link to login.
- [ ] Mapped error copy.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): rework SignupForm for split-screen AuthLayout`

---

### T8: Unwrap VerifyEmailPanel

**What**: Drop `Card` wrapper; render content inline. On error, add link to `/auth/forgot-password`.

**Where**: `apps/web/src/features/identity/components/verify-email-panel.tsx`

**Depends on**: None

**Reuses**: `useConfirmEmailVerification`, `buttonVariants`, `Link`.

**Requirement**: AUTH-21.

**Done when**:
- [ ] No `Card`-family imports.
- [ ] Pending/success/error states render flat with consistent spacing.
- [ ] Error state links to `/auth/forgot-password`.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): unwrap VerifyEmailPanel from Card`

---

### T9: Unwrap RegistrationDisabledNotice

**What**: If it has a Card wrapper, drop it so it composes cleanly inside AuthLayout's right column.

**Where**: `apps/web/src/features/identity/components/registration-disabled-notice.tsx`

**Depends on**: None

**Reuses**: existing.

**Requirement**: AUTH-18 (companion).

**Done when**:
- [ ] No `Card` wrapper (or already flat).
- [ ] Composes cleanly under `PageHeader`.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): unwrap RegistrationDisabledNotice` (skip if already flat — note in commit)

---

### T10: LoginPage with OAuth alert + new layout

**What**: Read `?error=<code>` via `useSearch`, render `OAuthErrorAlert` above form, render `OAuthSeparator` + `OAuthButtons` below. Add `validateSearch` to the route.

**Where**: `apps/web/src/routes/auth/login.tsx`

**Depends on**: T1, T3, T5, T6

**Reuses**: `LoginForm`, `OAuthButtons`, `OAuthErrorAlert`, `OAuthSeparator`, `useAuthCapabilities`, TanStack Router `useSearch`, `useNavigate`.

**Requirement**: AUTH-15, AUTH-16, AUTH-17, AUTH-19, AUTH-20.

**Done when**:
- [ ] Route `validateSearch` parses `error` (string | undefined).
- [ ] `OAuthErrorAlert` renders above form when error set; "Dismiss" clears the URL via `navigate({ replace: true, search: {} })`.
- [ ] Separator + OAuth buttons only render when `useAuthCapabilities` returns providers.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): wire OAuth error alert + cross-links into login page`

---

### T11: SignupPage rewrap

**What**: Just unwrap title rendering to fit the new layout; route guards unchanged.

**Where**: `apps/web/src/routes/auth/signup.tsx`

**Depends on**: T1, T7, T9

**Done when**:
- [ ] Page composes `SignupForm` (or `RegistrationDisabledNotice`) directly under `AuthLayout` outlet.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): adjust signup page for new layout`

---

### T12: VerifyEmailPage rewrap

**What**: Tiny page edit — pass-through unchanged, but verify no double-Card wrap remains.

**Where**: `apps/web/src/routes/auth/verify-email.tsx`

**Depends on**: T1, T8

**Done when**:
- [ ] No structural changes needed beyond what T8 ships.

**Tests**: none.
**Gate**: build.

**Commit**: (likely folded into T8)

---

### T13: ForgotPasswordPage + ForgotPasswordForm + route

**What**: New route + form for the forgot-password flow.

**Where**:
- `apps/web/src/routes/auth/forgot-password.tsx`
- `apps/web/src/features/identity/components/forgot-password-form.tsx`

**Depends on**: T1

**Reuses**: `useRequestPasswordReset`, `LabeledInput`, `Button`, `Link`.

**Requirement**: AUTH-05, AUTH-06, AUTH-07.

**Done when**:
- [ ] Form posts to `useRequestPasswordReset.mutate({ email })`.
- [ ] Success state renders no-enumeration copy and a link back to login.
- [ ] Inline error on non-business errors.

**Tests**: none.
**Gate**: build.

**Commit**: `feat(web): add forgot-password page + form`

---

### T14: ResetPasswordPage + ResetPasswordForm + route

**What**: New route + form for the reset-password flow. Validates token in search; rejects missing/over-length tokens before any network call.

**Where**:
- `apps/web/src/routes/auth/reset-password.tsx`
- `apps/web/src/features/identity/components/reset-password-form.tsx`

**Depends on**: T1

**Reuses**: `useResetPassword`, `LabeledInput`, `Button`, `Link`.

**Requirement**: AUTH-08, AUTH-09, AUTH-10.

**Done when**:
- [ ] Route `validateSearch` parses `token` (string | undefined).
- [ ] Missing/over-length token → invalid-link panel.
- [ ] Form validates `password.length >= 8` and `password === confirmPassword` before mutating.
- [ ] On success: success panel with "Sign in" CTA.
- [ ] `identity.invalid-reset-token` → invalid-link panel with link to forgot-password.

**Tests**: T16 covers the password-match branch.
**Gate**: build.

**Commit**: `feat(web): add reset-password page + form`

---

### T15: AcceptInvitePanel + page rewrite

**What**: Replace the stub at `apps/web/src/routes/auth/accept-invite.$token.tsx` with a real flow.

**Where**:
- `apps/web/src/routes/auth/accept-invite.$token.tsx`
- `apps/web/src/features/identity/components/accept-invite-panel.tsx`

**Depends on**: T1

**Reuses**: `useAcceptInvitation`, `useCurrentUser`, `Button`, `Link`.

**Requirement**: AUTH-11, AUTH-12, AUTH-13, AUTH-14.

**Done when**:
- [ ] Signed-out branch renders a sign-in prompt with `?next=` preservation.
- [ ] Signed-in branch renders Accept/Decline; Accept fires `useAcceptInvitation`.
- [ ] Specific copy for `workspace.invitation-not-found` and `workspace.invitation-expired`.
- [ ] On success: navigate to `/workspace`.

**Tests**: none (thin).
**Gate**: build.

**Commit**: `feat(web): land real accept-invite flow`

---

### T16: ResetPasswordForm unit test (password-match branch)

**What**: Vitest jsdom test covering: matching short password (blocked), mismatched passwords (blocked), valid match (mutation fires).

**Where**: `apps/web/src/features/identity/components/__test__/reset-password-form.spec.tsx`

**Depends on**: T14

**Reuses**: existing test patterns; mock `useResetPassword` via `vi.mock`.

**Requirement**: AUTH-09 (fat — multi-branch validation logic).

**Done when**:
- [ ] 3 tests cover the three branches.
- [ ] `bunx vp test --project web` passes.

**Tests**: web (jsdom).
**Gate**: quick (`bunx vp test --project web`).

**Commit**: `test(web): cover ResetPasswordForm password-match branches`

---

### T17: Full `bun check`

**Done when**: `bun check` exits 0.

**Gate**: build.

---

### T18: impeccable polish pass

**What**: Invoke impeccable to audit the auth screens against DESIGN.md, apply tweaks.

**Done when**: findings applied; `bun check` still green.

---

### T19: thermo-nuclear-code-quality-review

**What**: Invoke the skill on the diff, address findings.

**Done when**: review clean.

---

### T20: PR + CI + squash

**Done when**: PR opened, CI green, branch squash-merged to master.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1-T15 | web components/pages (thin) | none | none | ✅ |
| T16 | web fat (multi-branch validation) | web (jsdom) | web | ✅ |
