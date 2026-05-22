# Email Verification Specification

## Problem Statement

A registered user's email is never proven to belong to them. Kizunu has the
infrastructure to fix this — the `verification_tokens` table already carries an
`email_verification` type, `users.emailVerifiedAt` exists, and the `MailSender`
boundary (v0.1 `ConsoleMailSender`) already delivers out-of-band tokens for
password reset — but nothing mints or confirms a verification token. This slice
wires that flow end to end.

## Goals

- [ ] On register, mint a single-use hashed `email_verification` token and mail a
      verify link out-of-band — never in the HTTP response (mirrors slice `020`).
- [ ] A confirm endpoint consumes the token and sets `users.emailVerifiedAt`.
- [ ] A resend endpoint lets a signed-in, unverified user request a fresh link.
- [ ] The web app surfaces an unverified state with a resend action and a verify
      route that the email link targets.

## Settled Decisions (gray areas resolved in Specify)

| Decision            | Choice                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| Enforcement posture | **Soft** for v0.1: register still issues a session; login is never blocked on unverified email. Nothing in the pilot flow is gated yet — verification is exposed (banner + `emailVerifiedAt` in `me`) for later hard-gating without breaking the v0.1 contract. |
| Resend throttling   | Endpoint-level IP throttle (`AUTH_THROTTLE`, as password reset) + the request use-case is a no-op when the user is missing or already verified. |
| Resend identity     | **Authenticated** (current session user) — no email in the body, so no account-enumeration surface; fits the soft posture where the user is logged in post-signup. |
| Confirm auth        | `@Public()` + token in body — the link is followed possibly while logged out; the token authorizes.     |

## Out of Scope

| Feature                                  | Reason                                                       |
| ---------------------------------------- | ------------------------------------------------------------ |
| Hard login block until verified          | Soft posture for v0.1; would break the register→session flow |
| Real SMTP transport                      | `ConsoleMailSender` for v0.1; real transport tracked in CONCERNS |
| Gating any feature on verification       | No concrete v0.1 capability to gate; deferred                |

---

## User Stories

### P1: Verify a new email ⭐ MVP

**User Story**: As a new user, I want to confirm my email via a link so that my
account's email is proven.

**Acceptance Criteria**:

1. WHEN a user registers THEN the system SHALL mint a single-use hashed
   `email_verification` token and mail a `${appUrl}/verify-email?token=...` link,
   never returning the raw token in the HTTP response.
2. WHEN the verify endpoint receives a valid, unconsumed, unexpired token THEN the
   system SHALL set `users.emailVerifiedAt` and consume the token.
3. WHEN the token is unknown, expired, or already consumed THEN the system SHALL
   throw a `422` `identity.invalid-verification-token` error and change nothing.
4. WHEN registration fails the gate or validation THEN no verification mail SHALL
   be sent (verification follows a committed registration).

**Independent Test**: register, capture the mailed token via the console sender in
e2e, POST it to confirm, observe `me.emailVerifiedAt` set; replay the token → 422.

---

### P1: Resend verification ⭐ MVP

**User Story**: As a signed-in unverified user, I want to resend the verification
email so that I can recover from a lost or expired link.

**Acceptance Criteria**:

1. WHEN a signed-in unverified user requests a resend THEN the system SHALL mint a
   fresh token and mail a new link, responding `204`.
2. WHEN the requesting user is already verified THEN the resend SHALL be a no-op
   and still respond `204` (no error, no new token).
3. WHEN resend is called without a session THEN the system SHALL respond `401`.

**Independent Test**: register, resend → 204 and a second token minted; confirm
once, resend again → 204 with no new token.

---

### P2: Web verification surface

**User Story**: As a user, I want the app to show my unverified state with a
resend action and to confirm the link I click.

**Acceptance Criteria**:

1. WHEN a signed-in user is unverified THEN the app shell SHALL show a banner with
   a resend action; verified users SHALL see no banner.
2. WHEN `/verify-email?token=...` loads THEN it SHALL confirm the token and show a
   success or an error state.

**Independent Test**: toggle `emailVerifiedAt`, observe banner; load the verify
route with a good/bad token.

---

## Edge Cases

- WHEN two verification tokens are minted (register then resend) THEN both SHALL be
  independently valid until consumed or expired (existing single-use semantics).
- WHEN confirm succeeds THEN re-confirming with the same token SHALL fail `422`
  (token consumed).

---

## Requirement Traceability

| Requirement ID | Story                       | Phase | Status  |
| -------------- | --------------------------- | ----- | ------- |
| EMAILVER-01    | P1: Verify a new email      | -     | Pending |
| EMAILVER-02    | P1: Verify a new email      | -     | Pending |
| EMAILVER-03    | P1: Verify a new email      | -     | Pending |
| EMAILVER-04    | P1: Verify a new email      | -     | Pending |
| EMAILVER-05    | P1: Resend verification     | -     | Pending |
| EMAILVER-06    | P1: Resend verification     | -     | Pending |
| EMAILVER-07    | P1: Resend verification     | -     | Pending |
| EMAILVER-08    | P2: Web verification surface| -     | Pending |
| EMAILVER-09    | P2: Web verification surface| -     | Pending |

**Coverage:** 9 total. Design skipped — mirrors the password-reset slice (`020`):
two use-cases, a dedicated controller, contracts + api-client hooks, reusing the
`verification_tokens` table, `MailSender`, and `users.emailVerifiedAt`.

---

## Success Criteria

- [ ] Register sends a verification email; confirm sets `emailVerifiedAt`; replay 422.
- [ ] Authenticated resend works and is a no-op when already verified.
- [ ] Web shows an unverified banner + a working `/verify-email` route.
- [ ] `bun check` green; lint clean under CI strictness.
</content>
