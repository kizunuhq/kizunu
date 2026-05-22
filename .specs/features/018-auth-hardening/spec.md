# Auth Hardening Specification

Closes the Identity & Auth security primitives (feature 018, ADR-006):

- **Login rate-limit**: `@nestjs/throttler` — global 120/min default + a stricter
  10/min `@Throttle` on `auth/login` and `auth/register` (complements the per-account
  lock). e2e proves repeated logins return 429.
- **CORS**: `main.ts` enables CORS with credentials for the configured allowlist
  (closing the dead `cors` config and enabling SPA cookie auth).
- **Auth method + CSRF posture**: email/password; CSRF via `sameSite`-lax + CORS
  allowlist (no token in v0.1). Recorded in ADR-006.

Password reset remains open (needs a mail boundary — CONCERNS). Verified via `bun check`
+ the throttle e2e.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-H-01 | IP login rate-limit | Tasks | Verified |
| AUTH-H-02 | Enable CORS | Tasks | Verified |
| AUTH-H-03 | Settle auth method + CSRF posture (ADR-006) | Tasks | Verified |
