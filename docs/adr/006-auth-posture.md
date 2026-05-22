# ADR-006: v0.1 Auth Posture — Email/Password, sameSite + CORS for CSRF, IP Rate-Limit

- **Date**: 2026-05-22
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: auth, security, v0.1

## Context and Problem Statement

The v0.1 scope ([../v0.1-scope.md](../v0.1-scope.md)) left two auth questions open: magic
link vs. email/password, and the CSRF strategy. The Identity & Auth roadmap line also
lists login rate-limiting. Onboarding the first pilot forces these calls.

## Decision Drivers

- Self-hostable, minimal moving parts (no external IdP, no mail provider yet).
- The auth boundary must stay swappable without touching domain FKs (see ADR/PROJECT).
- Defense-in-depth proportionate to a 1–5 BDR pilot.

## Considered Options

- **Auth method** — A: email/password (already implemented in `RegisterUserUseCase` /
  `AuthenticateUseCase`, argon2id via `Bun.password`); B: magic link (needs a mail
  provider, which v0.1 lacks).
- **CSRF** — A: rely on `httpOnly` + `sameSite: 'lax'` cookies plus a CORS allowlist;
  B: a double-submit CSRF token mechanism.
- **Rate limit** — A: IP-level throttling via `@nestjs/throttler`; B: per-account lock
  only (already present: lock after 5 failed attempts).

## Decision Outcome

- **Email/password** (option A). The session is an opaque `httpOnly` cookie; no magic
  link in v0.1.
- **CSRF via `sameSite: 'lax'` + CORS allowlist** (option A). State-changing requests are
  cookie-authenticated and `lax` blocks cross-site cookie sends on cross-origin POSTs;
  `main.ts` now calls `enableCors({ origin: config.cors, credentials: true })` so only
  allowlisted origins may send credentialed requests. No double-submit token in v0.1.
- **IP rate-limit via `@nestjs/throttler`** (option A) in addition to the per-account
  lock: a global default (120/min) plus a stricter `@Throttle` (10/min) on `auth/login`
  and `auth/register`.

### Positive Consequences

- No mail dependency for v0.1; pilots run with password auth.
- The CSRF posture is standard for `sameSite`-lax cookie auth and adds no client coupling.
- Distributed credential stuffing across many emails is throttled at the IP layer, closing
  the gap the per-account lock left.

### Negative Consequences / Trade-offs

- `sameSite: 'lax'` + CORS is weaker than a CSRF token for same-site sub-resource attacks;
  revisit with a double-submit token if the threat model grows. Password reset (which
  needs a mail boundary) remains a separate follow-up.
- In-memory throttler storage does not share counters across replicas; move to a shared
  store (Redis) when scaling beyond a single instance.
