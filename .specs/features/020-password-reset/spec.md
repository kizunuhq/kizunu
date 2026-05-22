# Feature 020 — Password reset

Closes the last open v0.1 roadmap sub-item under **Identity & Auth**: a
self-service password reset that does not leak account existence and never
surfaces the reset token in an HTTP response.

## Why it was blocked

A reset flow that returns the token in the response is an account-takeover hole
(anyone who can hit the endpoint for an email gets a valid token). A real flow
needs an out-of-band delivery channel (email). v0.1 has no mail provider, so the
feature was deferred. This feature introduces a **minimal mail boundary** — a
`MailSender` port with a `ConsoleMailSender` that logs the message — so the token
travels out-of-band (today: the server log; later: a real SMTP/API sender swapped
behind the same port). This matches the home-grown/minimal auth posture (ADR-006).

## Requirements

- **R1 — Request reset (no enumeration).** `POST /auth/password-reset` with
  `{ email }` always responds `204`, whether or not the email maps to a user. When
  it does, a `password_reset` verification token is created (1h TTL, only its
  SHA-256 hash stored) and a reset email is sent via `MailSender` with a link
  `${appUrl}/reset-password?token=<raw>`. When it does not, nothing is created or
  sent. The endpoint is `@Public()` and IP-rate-limited like the other `auth/*`
  endpoints.
- **R2 — Confirm reset.** `POST /auth/password-reset/confirm` with
  `{ token, password }` (password `min(8).max(255)`, matching register). The raw
  token is hashed and looked up among active (unconsumed, unexpired)
  `password_reset` tokens. No match → `422` business error
  (`identity.invalid-reset-token`). On match: the user's password hash is replaced
  (argon2id via the existing `password.helper`), the token is marked consumed
  (single use), and all of that user's sessions are revoked (a reset logs out
  everywhere). `@Public()`, rate-limited.
- **R3 — Token reuse is impossible.** A consumed or expired token never validates
  (reuses `VerificationTokenRepository.findActiveByHashedToken`, which already
  filters `consumedAt IS NULL` and `expiresAt > now`).
- **R4 — Type-safe boundary.** Schemas are born in
  `@kizunu/api-contracts/identity/password-reset.contract.ts` with `Routes`
  entries; the API consumes them via `createZodDto`; `@kizunu/api-client` exposes
  `requestPasswordReset` / `confirmPasswordReset` + `use-*` hooks.

## Out of scope

- A real email transport (SMTP/provider). The port makes that a later swap; v0.1
  ships `ConsoleMailSender`. Tracked in CONCERNS.
- A reset UI screen in `apps/web` (the api-client hooks are provided; the screen
  is not part of the minimal v0.1 surface — same stance as other admin-only flows).

## Verification

- Unit (fat): `RequestPasswordResetUseCase` — sends mail + creates a token when
  the user exists; no token, no mail when it does not. `ResetPasswordUseCase` —
  rejects an unknown/expired token; on a valid token sets the new hash, consumes
  the token, and revokes the user's sessions.
- `bun check` green; `CI=1 bunx vp lint` 0/0.
