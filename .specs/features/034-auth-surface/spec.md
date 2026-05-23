# Auth Surface Specification

## Problem Statement

The auth surface today is a flat centered card sitting on an empty page. Three
flows that the api-client already supports have no UI at all — forgot-password,
reset-password, and accept-invite (the route file is a TODO stub). The OAuth
provider buttons exist but the redirect back from the API lands at
`/auth/login?error=<code>` with no visible error treatment. The verify-email
page is functional but minimal. Error copy across the surface is generic
"something went wrong" via `getApiErrorMessage`. This is the operator's first
impression of kizunu, and it currently undersells the product.

## Goals

- [ ] Replace the centered-card auth shell with a split-screen layout — branding
      panel + ASCII aurora on one side, form on the other.
- [ ] Land the three missing flows: `/auth/forgot-password`,
      `/auth/reset-password`, and a real accept-invite form.
- [ ] Make the OAuth round-trip visible: when the API redirects back to
      `/auth/login?error=<code>`, render a clear inline error.
- [ ] Polish verify-email into the same split-screen shell with clearer states.
- [ ] Cross-link auth screens: login ↔ signup, login → forgot, etc.
- [ ] Map known `ApiError.code` values to specific copy (e.g. `identity.invalid-credentials` → "Email or password didn't match"; `identity.email-taken` → "That email is already registered") instead of leaning on the generic message helper.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Magic-link auth | Not in v0.1 (ADR-006); could land in Phase 1.6+ |
| 2FA / TOTP / backup codes | Not in v0.1 |
| OAuth callback page | The API handles the entire OAuth round-trip server-side and redirects back to `/workspace` (success) or `/auth/login?error=<code>` (failure). No client-side callback page needed. |
| Account deletion / change-email backend | Backend not yet built; the banner links to a Part 4 placeholder. |
| Sign-out screen | Sign out routes to `/auth/login`; no separate screen. |
| Resend cooldown timer UI | Existing banner uses `isSuccess` as the gate; refinement deferred. |
| Workspace creation during accept-invite | Invitation is bound to an existing workspace; no creation flow. |

---

## User Stories

### P1: Auth screens read as kizunu, not a Bootstrap template ⭐ MVP

**User Story**: As an operator first opening kizunu, I want the auth screens
to feel like the product I'm signing into — same tokens, same voice, same
ASCII aurora signature.

**Why P1**: The split-screen auth layout is the brand surface that every
later auth screen sits inside. Without it, login/signup/forgot/reset/
accept-invite/verify all individually look like generic forms.

**Acceptance Criteria**:

1. WHEN the user lands on any `/auth/**` route THEN the layout SHALL render
   in two columns at `md+` viewports: a branding panel on the left (the
   ASCII aurora `Background` component at `fieldOpacity={0.16}`, the
   wordmark, a single positioning line, all on `bg-background` per
   DESIGN.md §4.6) and the form column on the right.
2. WHEN the viewport is below `md` THEN the layout SHALL stack the form
   column above the branding (or hide branding entirely on very small
   viewports) so the form remains usable.
3. WHEN the auth layout renders THEN it SHALL use the same OKLCH spine,
   2px radii, dashed dividers, mono kicker, and no drop shadows that the
   dashboard uses (DESIGN.md compliance).
4. WHEN any auth form renders THEN it SHALL not nest inside the existing
   `Card` primitive (auth screens are full-bleed columns, not cards).

**Independent Test**: Visit `/auth/login`, confirm the split-screen layout
appears; resize to mobile, confirm the form column remains usable; confirm
the aurora is present and tinted with `--kizunu-green`.

---

### P1: Forgot-password flow lands ⭐ MVP

**User Story**: As a user who forgot their password, I want a UI to request
a reset link so I can recover my account without contacting an admin.

**Why P1**: `useRequestPasswordReset` exists in the api-client and the
backend mails the reset link (feature `020`). Without the UI, the flow is
unreachable.

**Acceptance Criteria**:

1. WHEN the user clicks "Forgot password?" on `/auth/login` THEN they SHALL
   navigate to `/auth/forgot-password`.
2. WHEN the user submits the forgot-password form THEN the page SHALL call
   `useRequestPasswordReset.mutate({ email })` and render a success state
   ("Check your inbox for a link to reset your password") — the success
   state does NOT disclose whether the email maps to an account (no
   account enumeration; matches the backend's posture).
3. WHEN the mutation errors with a non-business error (network, 500) THEN
   the page SHALL surface a generic "We couldn't send the reset email,
   please try again" inline.
4. WHEN the form is in flight THEN the submit button SHALL be disabled and
   show "Sending…".

**Independent Test**: Visit `/auth/forgot-password`, enter an email, submit,
confirm success state; confirm clicking "back to sign in" returns to
`/auth/login`.

---

### P1: Reset-password flow lands ⭐ MVP

**User Story**: As a user who clicked the reset link in their email, I want
to enter a new password and have it take effect immediately.

**Why P1**: `useResetPassword` exists; backend (`020`) accepts a hashed
token. Without UI, the link in the email leads to a 404.

**Acceptance Criteria**:

1. WHEN the user lands on `/auth/reset-password?token=<token>` THEN the
   form SHALL render with password + confirm-password fields.
2. WHEN the user submits matching passwords ≥ 8 chars THEN the page SHALL
   call `useResetPassword.mutate({ token, password })` and on success
   render a success state with a "Sign in" CTA routing to `/auth/login`.
3. WHEN the two password fields don't match THEN the form SHALL block
   submit with an inline "Passwords don't match" message and not call
   the mutation.
4. WHEN the password is below 8 chars THEN submit SHALL be blocked with
   an inline minimum-length message.
5. WHEN the mutation errors with a known business code (`identity.invalid-reset-token`)
   THEN the page SHALL render a specific "This reset link is invalid or
   expired" message with a CTA to `/auth/forgot-password`.
6. WHEN the token query param is missing THEN the page SHALL render the
   same invalid-link error without making any network call.

**Independent Test**: Visit `/auth/reset-password?token=fake`, attempt
submit with mismatched passwords (blocked), attempt with short password
(blocked), submit with valid password (mutation fires, error surfaces).

---

### P1: Accept-invite flow lands ⭐ MVP

**User Story**: As a user clicking an invite link, I want a real form that
accepts the invitation and lands me in the workspace.

**Why P1**: The route file is `TODO: accept invitation form` (single line of
copy + the raw token). The `useAcceptInvitation` hook exists and invalidates
the current-user query on success. Without the form, every invited member
hits a placeholder.

**Acceptance Criteria**:

1. WHEN the user lands on `/auth/accept-invite/$token` AND is not signed
   in THEN the page SHALL render a "Sign in to accept your invitation"
   prompt with a link to `/auth/login?next=/auth/accept-invite/$token` so
   the user returns after signing in.
2. WHEN the user lands signed-in THEN the page SHALL render a card
   summarising the invitation: workspace name, role badge, accept and
   decline buttons.
3. WHEN the user clicks "Accept" THEN the page SHALL call
   `useAcceptInvitation.mutate({ token })` and on success navigate to
   `/workspace` (the current-user query invalidates automatically and the
   shell re-renders with the new workspace).
4. WHEN the mutation errors with `workspace.invitation-not-found` or
   `workspace.invitation-expired` THEN the page SHALL render specific copy
   ("This invitation has expired" / "This invitation isn't valid") with
   a link back to `/workspace` if a current user exists, else
   `/auth/login`.
5. WHEN the user clicks "Decline" THEN the page SHALL navigate away
   (`/workspace` or `/auth/login`) without firing the accept mutation.
   v0.1 does not have a server-side decline endpoint; "decline" just
   means "don't accept" — the invitation expires on its own per the
   backend's TTL.

**Independent Test**: Build a fake invite token via the API, visit
`/auth/accept-invite/<token>`, confirm the accept flow lands on `/workspace`
with the new membership reflected.

---

### P1: OAuth round-trip surfaces failures ⭐ MVP

**User Story**: As a user clicking "Sign in with GitHub", I want to see a
clear error when something goes wrong (state mismatch, account-link
conflict) instead of landing back at login with no signal.

**Why P1**: The API redirects to `/auth/login?error=<code>` on failure
(see `apps/api/src/modules/identity/http/controllers/oauth.controller.ts`).
Currently no UI reads the query param.

**Acceptance Criteria**:

1. WHEN the user lands on `/auth/login?error=<code>` THEN the login screen
   SHALL render an inline alert above the form with copy mapped from the
   code (`oauth_state`, `identity.oauth-email-conflict`, …) plus a
   "Dismiss" affordance.
2. WHEN the alert dismisses THEN the query param SHALL clear (replace,
   not push, the URL) so a refresh doesn't resurface the alert.
3. WHEN the code is unknown THEN the alert SHALL render a generic
   "OAuth sign-in failed. Try again or use email and password." line.

**Independent Test**: Visit `/auth/login?error=oauth_state`, confirm the
alert appears with the mapped copy; click dismiss, confirm the URL is
clean.

---

### P2: Login + signup forms read with the new layout

**User Story**: As a returning operator signing in, I want the existing
login and signup forms to fit cleanly inside the new split-screen layout
without their old card wrappers.

**Acceptance Criteria**:

1. WHEN `/auth/login` renders THEN the form SHALL drop its outer `Card`
   wrapper; the form sits directly in the right column of the
   `AuthLayout` with the page title rendered above it via `PageHeader`.
2. WHEN `/auth/signup` renders THEN the same treatment applies; the
   `RegistrationDisabledNotice` branch (when public signup is disabled)
   SHALL render in the same column with the same `PageHeader`.
3. WHEN both screens render THEN they SHALL include cross-links: login
   shows "Don't have an account? Sign up" and "Forgot password?"; signup
   shows "Already have an account? Sign in".
4. WHEN the OAuth providers list is non-empty THEN it SHALL render below
   the form with a mono kicker separator ("[or continue with]") between
   the email/password form and the provider buttons.

**Independent Test**: Each route renders cleanly inside `AuthLayout`,
cross-links navigate correctly, OAuth buttons (when present) render below
the form.

---

### P2: Verify-email lives in the same layout

**User Story**: As a user clicking the verify-email link, I want the page
to feel cohesive with the rest of the auth flow.

**Acceptance Criteria**:

1. WHEN `/auth/verify-email` renders THEN the `VerifyEmailPanel` SHALL
   drop its outer `Card` and render inside `AuthLayout` with a
   `PageHeader` ("Verify email") on top.
2. WHEN verification succeeds THEN the page SHALL still link to
   `/workspace` (preserves existing behaviour).
3. WHEN the token is missing or invalid THEN the page SHALL link back
   to `/auth/forgot-password` (so users with a stale link can request
   another).

**Independent Test**: Visit `/auth/verify-email` with no token, confirm
the layout matches the other auth screens, confirm the link to
forgot-password.

---

### P3: Specific error copy by `ApiError.code`

**User Story**: As a user who mistyped a password or tried to sign up with
a taken email, I want a specific message that tells me what to do.

**Acceptance Criteria**:

1. WHEN `identity.invalid-credentials` returns from `useLogin` THEN the
   login form SHALL render "Email or password didn't match. Try again
   or reset your password." with a link to `/auth/forgot-password`.
2. WHEN `identity.email-taken` returns from `useRegister` THEN the
   signup form SHALL render "That email is already registered. Sign
   in instead." with a link to `/auth/login`.
3. WHEN `identity.account-locked` returns from `useLogin` (rate-limit /
   lock posture, ADR-006) THEN the login form SHALL render "Too many
   attempts. Try again in a few minutes." with no retry link.
4. WHEN any other `ApiError` returns THEN the form SHALL fall back to
   the generic `getApiErrorMessage(error)` text.

**Independent Test**: Trigger each known error from a mocked mutation;
confirm specific copy renders for each known code, generic copy for
unknown codes.

---

## Edge Cases

- WHEN the user has a live session and visits any `/auth/**` route THEN
  the layout SHALL redirect to `/workspace` (existing behaviour for
  `/auth/login` and `/auth/signup` — extend to all auth routes that don't
  legitimately apply to signed-in users).
- WHEN the user has a live session and visits `/auth/accept-invite/$token`
  THEN they SHALL NOT redirect; the accept-invite screen renders normally
  (signed-in users accept invites all the time).
- WHEN `/auth/reset-password` receives a token query param that decodes
  but is too long (>512 chars per the contract) THEN the page SHALL
  render the same invalid-link error rather than calling the mutation.
- WHEN the auth API's `webUrl` redirects back with both `error` and other
  query params THEN the page SHALL handle the `error` first; other
  params are ignored unless explicitly part of the route's
  `validateSearch`.
- WHEN `prefers-reduced-motion: reduce` is set THEN the ASCII aurora's
  animation SHALL respect the project-wide motion reset already in
  `styles.css` per DESIGN.md §9.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: AuthLayout split-screen | Design | Pending |
| AUTH-02 | P1: AuthLayout mobile collapse | Design | Pending |
| AUTH-03 | P1: AuthLayout DESIGN.md tokens | Design | Pending |
| AUTH-04 | P1: AuthLayout no-card-wrap | Design | Pending |
| AUTH-05 | P1: Forgot-password route + form | Design | Pending |
| AUTH-06 | P1: Forgot-password no-enumeration success | Design | Pending |
| AUTH-07 | P1: Forgot-password error states | Design | Pending |
| AUTH-08 | P1: Reset-password route + form | Design | Pending |
| AUTH-09 | P1: Reset-password password match validation | Design | Pending |
| AUTH-10 | P1: Reset-password invalid-token branch | Design | Pending |
| AUTH-11 | P1: Accept-invite signed-out path | Design | Pending |
| AUTH-12 | P1: Accept-invite signed-in form | Design | Pending |
| AUTH-13 | P1: Accept-invite mutation + invalidation | Design | Pending |
| AUTH-14 | P1: Accept-invite expired/not-found copy | Design | Pending |
| AUTH-15 | P1: OAuth ?error=<code> alert | Design | Pending |
| AUTH-16 | P1: OAuth alert dismiss clears URL | Design | Pending |
| AUTH-17 | P2: Login form into AuthLayout | Design | Pending |
| AUTH-18 | P2: Signup form into AuthLayout | Design | Pending |
| AUTH-19 | P2: Cross-links between auth screens | Design | Pending |
| AUTH-20 | P2: OAuth providers below form | Design | Pending |
| AUTH-21 | P2: Verify-email into AuthLayout | Design | Pending |
| AUTH-22 | P3: identity.invalid-credentials copy | Design | Pending |
| AUTH-23 | P3: identity.email-taken copy | Design | Pending |
| AUTH-24 | P3: identity.account-locked copy | Design | Pending |
| AUTH-25 | P3: Unknown-code fallback | Design | Pending |

**ID format:** `AUTH-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 25 total. All map to tasks in `tasks.md`.

---

## Success Criteria

- [ ] Every `/auth/**` route renders inside the new `AuthLayout` split
      screen.
- [ ] Forgot-password, reset-password, accept-invite work end-to-end
      against the existing api-client hooks.
- [ ] OAuth `?error=<code>` round-trip shows a dismissible alert with
      mapped copy.
- [ ] All four `ApiError.code` mappings in P3 render their specific copy.
- [ ] `bun check` is green (typecheck, CI-strict lint, all tests, all
      conformance scripts).
- [ ] `thermo-nuclear-code-quality-review` findings addressed.
- [ ] PR opened against `master`, CI green, squash-merged.
