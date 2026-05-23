# Auth Surface Design

**Spec**: `.specs/features/034-auth-surface/spec.md`
**Status**: Draft

---

## Architecture Overview

```
routes/auth/route.tsx (AuthLayout, REPLACED)
└── AuthLayout
    ├── BrandingPanel (left column, md+)
    │   ├── ASCIIAurora (Background) at fieldOpacity=0.16
    │   ├── kizunuMark
    │   ├── positioning line (mono kicker style)
    │   └── tiny footer line ("self-hostable", "open source")
    └── form column (right, full-width on mobile)
        └── <Outlet />  (each auth route renders here)
```

The right-column child routes:

- `/auth/login` — `LoginForm` + (optional) OAuth error alert + OAuthButtons
- `/auth/signup` — `SignupForm` or `RegistrationDisabledNotice`
- `/auth/forgot-password` — new `ForgotPasswordForm` + success state
- `/auth/reset-password` — new `ResetPasswordForm` + success/error states
- `/auth/accept-invite/$token` — new `AcceptInvitePanel` (signed-in vs signed-out branches)
- `/auth/verify-email` — existing `VerifyEmailPanel`, but `Card` wrapper dropped

All form components live under `apps/web/src/features/identity/components/`.

---

## Code Reuse Analysis

### Existing Components and Hooks to Leverage

| Component / Hook | Location | How to Use |
| ---------------- | -------- | ---------- |
| `LoginForm` | `apps/web/src/features/identity/components/login-form.tsx` | Drop the `Card` wrapper; keep all logic. Add inline `ApiError.code` switch for specific copy. |
| `SignupForm` | same dir | Same treatment as LoginForm. |
| `OAuthButtons` | same dir | Already renders below the form; add a mono kicker separator above when both forms and OAuth are present. |
| `VerifyEmailPanel` | same dir | Drop the `Card` wrapper; render content directly inside AuthLayout's right column. |
| `LabeledInput` | same dir | Reuse for new forms (forgot/reset/accept-invite). |
| `RegistrationDisabledNotice` | same dir | Drop the `Card` wrapper if present (already minimal). |
| `useLogin` / `useRegister` / `useRequestPasswordReset` / `useResetPassword` / `useAcceptInvitation` / `useCurrentUser` / `useConfirmEmailVerification` / `useAuthCapabilities` | `@kizunu/api-client/...` | All used directly; no wrappers. |
| `getApiErrorMessage` | `@kizunu/web/lib/get-api-error-message` | Fallback for unknown error codes. |
| `Background` (ASCII aurora) | `apps/web/src/components/primitives/background.tsx` | Render in the BrandingPanel; `accentColorVar='--kizunu-green'`, `fieldOpacity={0.16}`, `pointerTrail={false}` (auth is passive, no pointer chase). |
| `KizunuMark` | `apps/web/src/features/marketing/components/kizunu-mark.tsx` | Render in BrandingPanel. |
| `PageHeader` | `apps/web/src/components/composed/page-header.tsx` | Title + optional kicker above each form. |
| `Card`, `CardHeader`, `CardContent` | `apps/web/src/components/primitives/card.tsx` | Dropped from auth flow per AUTH-04 (no card-of-cards inside the layout). |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| TanStack Router | `Link`, `useNavigate`, `useSearch` for the OAuth `?error=` param and reset-password `?token=` param. Routes use `validateSearch` so the search shape is typed at the boundary. |
| TanStack Query | Each mutation's `onSuccess`/`onError` callbacks drive UI state; no manual cache management beyond what `useAcceptInvitation` already does (invalidates current user). |
| ASCII aurora | Component already exists; consumed read-only. |

---

## Components

### `AuthLayout` (replacement)

- **Purpose**: Two-column layout for every `/auth/**` route — branding left, form right.
- **Location**: `apps/web/src/routes/auth/route.tsx` (replaces the current centered card layout).
- **Interfaces**: None (pure layout component rendering `<Outlet />`).
- **Behavior**:
  - Desktop (`md+`): `grid-cols-[minmax(420px,_1fr)_minmax(420px,_540px)]` — branding takes flexible left, form takes a capped right.
  - Mobile: `grid-cols-1`; branding panel hides (or shows a compact wordmark-only header).
  - Right column centers the form vertically (`flex items-center justify-center`).

### `AuthBrandingPanel`

- **Purpose**: Left-column branding with ASCII aurora background, wordmark, positioning line, footer credits.
- **Location**: `apps/web/src/features/identity/components/auth-branding-panel.tsx` (new).
- **Behavior**:
  - `Background` aurora fills the panel; `accentColorVar='--kizunu-green'`, `fieldOpacity={0.16}`.
  - Wordmark + tagline anchored bottom-left, mono kicker "[`self-hostable sales engagement`]".
  - Optional mini footer ("open source · v0.1") in mono text-xs.
  - Hides under `md` breakpoint (`hidden md:flex`).

### `LoginForm` (modified)

- Drop the outer `Card`. Render fields, error alert, submit, and cross-links inline.
- Map known `ApiError.code`s to specific copy via a small `mapLoginError(error)` helper local to the file.
- Add cross-links section below submit: "Forgot password?" → `/auth/forgot-password`, "Need an account? Sign up" → `/auth/signup`.

### `SignupForm` (modified)

- Same treatment as LoginForm. Map `identity.email-taken` to specific copy.
- Add cross-link: "Already have an account? Sign in" → `/auth/login`.

### `LoginPage` (modified)

- Reads search param via `useSearch({ from: '/auth/login' })` for `error`.
- Renders an inline `OAuthErrorAlert` above the form when `error` is set.
- The alert has a "Dismiss" button that calls `navigate({ to: '/auth/login', search: {}, replace: true })` to clear the URL.
- Below the form: `OAuthSeparator` (mono kicker `[or continue with]`) then `OAuthButtons`.

### `OAuthErrorAlert`

- **Purpose**: Inline alert above the login form, rendered when `?error=<code>` is set.
- **Location**: `apps/web/src/features/identity/components/oauth-error-alert.tsx` (new).
- **Interfaces**:
  - `<OAuthErrorAlert code={string} onDismiss={() => void} />`
- **Behavior**:
  - Maps code → copy via a const-object dictionary (`OAUTH_ERROR_COPY`).
  - Unknown code falls back to generic copy.
  - Renders with a destructive-tinted border + foreground, `--radius`, no drop shadow.

### `OAuthSeparator`

- Tiny inline component: a horizontal `border-border border-dashed` with a centered mono kicker `[or continue with]` over it. Only shown when both email/password form and OAuth providers are present.

### `ForgotPasswordPage` + `ForgotPasswordForm`

- **Locations**:
  - `apps/web/src/routes/auth/forgot-password.tsx` (new route)
  - `apps/web/src/features/identity/components/forgot-password-form.tsx` (new component)
- **Behavior**:
  - Page renders the form when `!success`, success state when the mutation completes.
  - Success state: an inline confirmation panel with text "If that email is on file, we sent a reset link." and a link back to `/auth/login`. Identical copy whether or not the account exists (no enumeration).
  - Wired to `useRequestPasswordReset`.

### `ResetPasswordPage` + `ResetPasswordForm`

- **Locations**:
  - `apps/web/src/routes/auth/reset-password.tsx` (new route, with `validateSearch` for the `token` param)
  - `apps/web/src/features/identity/components/reset-password-form.tsx` (new component)
- **Behavior**:
  - Page reads `token` via `useSearch`. If missing or `> 512` chars, renders invalid-link panel without calling the mutation.
  - Form has `password` + `confirmPassword` fields. Submit blocked when they don't match or password < 8 chars (inline `FieldError`).
  - Wired to `useResetPassword.mutate({ token, password })`.
  - Maps `identity.invalid-reset-token` to "This reset link is invalid or expired" + CTA to `/auth/forgot-password`.

### `AcceptInvitePage` + `AcceptInvitePanel`

- **Locations**:
  - `apps/web/src/routes/auth/accept-invite.$token.tsx` (replace stub)
  - `apps/web/src/features/identity/components/accept-invite-panel.tsx` (new component)
- **Behavior**:
  - Page resolves `token` from route params. Reads `useCurrentUser` to branch on signed-in.
  - Signed-out branch: renders a "Sign in to accept your invitation" prompt with a link to `/auth/login?next=/auth/accept-invite/<token>`.
  - Signed-in branch: renders the panel with workspace name (derived from `useAcceptInvitation`'s response on success — pre-accept, we can't know the workspace; show a generic "You've been invited to join a workspace on kizunu" header instead until accepted) and Accept/Decline buttons.
  - Accept → `useAcceptInvitation.mutate({ token }, { onSuccess: () => navigate({ to: '/workspace' }) })`.
  - Decline → `navigate({ to: '/workspace' })` if signed-in, `/auth/login` otherwise.
  - Maps `workspace.invitation-not-found` and `workspace.invitation-expired` to specific copy.

  **Note on the workspace name preview**: pre-accept we don't have it. Two options:
  (a) accept the limitation and show generic copy until acceptance succeeds; (b) add a new
  preview endpoint to the API. (a) is in scope for this feature; (b) is a follow-up.

### `VerifyEmailPanel` (modified)

- Drop the `Card` wrapper. Same content (`useConfirmEmailVerification` + state machine), but flat inside the layout.
- The "Continue" CTA on success → `/workspace` (preserved).
- On error: add a secondary link back to `/auth/forgot-password` (per AUTH-21).

### `AuthCrossLink`

- A small shared component for the row of cross-links between auth screens (login → forgot, login → signup, signup → login, etc.). Inline link styling, `text-muted-foreground hover:text-foreground`.
- **Location**: `apps/web/src/features/identity/components/auth-cross-link.tsx` (new) — or inline if it stays trivially small.

### Error mappers

Two const-object dictionaries:

- `LOGIN_ERROR_COPY`: maps known login error codes to `{ title, body, actionHref?, actionLabel? }`.
- `OAUTH_ERROR_COPY`: maps known OAuth error codes to `{ title, body }`.

**Location**: `apps/web/src/features/identity/lib/login-error-copy.ts` and
`oauth-error-copy.ts` (new). Each file follows the `const X = {...} as const` +
derived-type pattern per `.agents/rules/enums.md`.

---

## Data Models (not applicable)

No new backend models. The reset-password and forgot-password contracts already exist (`packages/api-contracts/src/identity/password-reset.contract.ts`). The accept-invitation contract already exists (`packages/api-contracts/src/workspace/accept-invitation.contract.ts`).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| `useLogin` returns `identity.invalid-credentials` | Inline alert with mapped copy + "Forgot password?" link | User sees specific guidance, not generic message |
| `useLogin` returns `identity.account-locked` | Inline alert with mapped copy, no retry link | User waits |
| `useRegister` returns `identity.email-taken` | Inline alert with mapped copy + "Sign in" link | User signs in instead |
| `useRequestPasswordReset` errors | Generic "couldn't send" message; success state still claims "if on file" to prevent enumeration | User retries |
| `useResetPassword` returns `identity.invalid-reset-token` | Invalid-link panel + CTA to forgot-password | User requests a new link |
| `useAcceptInvitation` returns `workspace.invitation-not-found` | "This invitation isn't valid" + CTA to workspace (signed-in) or login | User goes elsewhere |
| `useAcceptInvitation` returns `workspace.invitation-expired` | "This invitation has expired" + CTA to workspace or login | Same |
| OAuth `?error=oauth_state` | Inline alert "OAuth sign-in failed (state mismatch). Try again." | User retries |
| OAuth `?error=identity.oauth-email-conflict` | Inline alert "An account with that email already exists. Sign in with your password first to link." | User signs in via password |
| Unknown error code on any mutation | `getApiErrorMessage(error)` fallback | Generic message |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Branding panel position | Left, full-height, aurora background | Matches the marketing/landing aesthetic; the form column being right is the dominant SaaS-auth posture and works for both LTR languages and the visual gravity of the kizunu wordmark. |
| Auth route guard | Redirect signed-in users from login/signup/forgot/reset/verify to `/workspace` | Existing behaviour for login+signup is extended uniformly. `accept-invite` is the explicit exception (signed-in users accept invites). |
| Reset-password password match | Client-side check before mutation | Saves a server roundtrip; the mutation contract only requires `password >= 8`, so the confirm field is a UX concern. |
| OAuth error dismiss | `navigate({ to: ..., search: {} })` with `replace: true` | Removes the `?error=` query without pushing a history entry. |
| Accept-invite workspace name preview | Show generic copy pre-accept | New API endpoint to look up an invitation by token (without consuming it) would expand surface for marginal benefit. Document as a future enhancement. |
| OAuth callback page | NOT BUILT | The API redirects directly to `/workspace` or `/auth/login?error=...`. No separate callback page is needed; spec correctly out-of-scopes it. |
| ASCII aurora `pointerTrail` | `false` on auth pages | The aurora is decorative here; pointer-chase would steal attention from the form. |

---

## Visual design notes (handed off to `impeccable` during Execute)

- The branding panel sets the auth-screen identity: ASCII aurora at higher intensity (0.16) than the dashboard (which doesn't show aurora at all by default). One accent color across the auth surface — `--kizunu-green`.
- The form column is narrow (max-width ~540px) and centered vertically. Forms are full-width within that column.
- Each form gets a `PageHeader` ("Sign in to kizunu", "Create your account", "Reset your password", etc.) with an optional mono kicker for context ("[Welcome back]", "[Reset link sent]", etc.).
- Cross-links sit below the submit button, separated by a small spacing rhythm — text-sm text-muted-foreground, underlined on hover.
- Error alerts use `--destructive` border + foreground, `--radius`, **no background tint** (destructive backgrounds violate the no-status-pill-with-bg rule in DESIGN.md §7 — destructive is conveyed via the border + foreground color only).

`impeccable` decides the exact spacing rhythm, the mono kicker copy, the branding tagline wording, and the position of the kizunu wordmark within the branding panel.

---

## Test Strategy

- All new screens and components are thin presentational over fat api-client hooks. Per TESTING.md "Web components / hooks (thin) → none (browser e2e covers them)" — no dedicated tests.
- The two error-mapping dictionaries (`LOGIN_ERROR_COPY`, `OAUTH_ERROR_COPY`) are pure data; not tested directly. Their consumers (`mapLoginError`, the inline alert) are thin lookups.
- The password-match validation in `ResetPasswordForm` is fat (multi-branch input → block submit). One small unit test file confirms the branch behavior.
- No backend changes, so no integration/e2e tasks.

---

## Migration / Rollout

- Single PR. No feature flag. Auth routes are independent of dashboard routes, so the swap is localized.
- The route file (`apps/web/src/routes/auth/route.tsx`) is replaced; the centered-card design dies in one commit.
- `accept-invite.$token.tsx` is replaced (stub → real form) in one commit.
- New routes (`forgot-password.tsx`, `reset-password.tsx`) added with TanStack Router auto-regen.
