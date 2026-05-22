# Concerns

Evidence-backed warnings, prioritized by risk. Each item cites a file and a fix approach. Absence of an item means no evidence was found, not a guarantee.

## High

### Core v0.1 scope is largely unbuilt
**Evidence:** `apps/api/src/modules/` has `identity`, `workspace`, and now `channel` (feature `002`: the frozen `ChannelPlugin` port + registry and `ChannelAccount`/`ChannelAccess` CRUD, proven with a fake plugin). Still missing: the Meta/WhatsApp plugin + inbound webhook (feature `003`), CRM connector (Pipedrive), `Cadence`/`Step`/`Template`, `Lead`/`LeadJourney`/`TouchAttempt`, `EntryTrigger`, and the scheduler/inbound engine (`docs/v0.1-scope.md`).
**Impact:** The pilot contract (the one thing v0.1 must do) cannot run. The frozen plugin/connector contracts are the riskiest design surface and are unvalidated against real APIs. The web app is likewise a skeleton — routes are TODO placeholders (`docs/web-structure.md` maps the intended layout; `components/primitives/` now holds the shadcn baseline, but no real screens yet).
**Fix:** Sequence per ROADMAP.md — channel plugin contract first (engine depends on it), then CRM connector, cadence aggregate, engine. Validate `ChannelPlugin.validate → Decision` against the real Meta 24h-window/HSM behavior early. For UI, build screens shadcn-first per `.agents/rules/react.md` §0.

### CORS is configured but never enabled
**Evidence:** `api.config.ts` parses `APP_CORS_ORIGINS` into `cors`, but `main.ts` never calls `app.enableCors(...)`. The web client uses `credentials: 'include'` (`apps/web/src/lib/api-client.ts`) and runs on a different origin (`:3000` vs API `:3001`).
**Impact:** Cross-origin cookie auth from the SPA will be blocked by the browser in any non-proxied setup; the parsed `cors` config is dead.
**Fix:** Call `application.enableCors({ origin: config.get('cors'), credentials: true })` in `bootstrap()`.

## Medium

### No login rate-limiting at the IP/request layer
**Evidence:** Protection is per-account only (`AuthenticateUseCase` locks after `MAX_FAILED_ATTEMPTS = 5`). No `@nestjs/throttler` or middleware (grep for `Throttler`/`rate` found none).
**Impact:** Distributed credential stuffing across many emails, or enumeration via the register endpoint, is unthrottled. Listed as an open primitive in `.specs/project/STATE.md`.
**Fix:** Add request throttling (e.g. `@nestjs/throttler`) on `auth/*`, keyed by IP, in addition to the existing per-account lock.

### No CSRF protection for cookie-based mutations
**Evidence:** Auth is an `httpOnly` cookie with `sameSite: 'lax'` (`auth.controller.ts`); no CSRF token mechanism.
**Impact:** `lax` blocks cross-site cookies on most cross-origin POSTs, so risk is limited, but state-changing endpoints have no defense-in-depth. Flagged as an open primitive in STATE.
**Fix:** Decide on CSRF strategy when the auth method is finalized (double-submit token, or rely on `sameSite` + CORS allowlist). Document the decision.

### Provider credentials are stored unencrypted
**Evidence:** `channel_accounts.credentials` and `connector_accounts.credentials` are plaintext `jsonb` columns (`apps/api/src/db/schemas/`); features `002`/`004` validate the shape against the plugin/connector `configSchema` but do not encrypt at rest. These hold a Meta system token and a Pipedrive API token respectively (`docs/v0.1-scope.md`).
**Impact:** A database read (backup, dump, compromised replica) exposes live provider tokens. Read endpoints already exclude `credentials`, so the exposure is at-rest only.
**Fix:** Encrypt `credentials` at rest (app-level envelope encryption with a KMS/managed key, or `pgcrypto`) before real tokens are used in production. Keep decryption inside the persistence boundary so use-cases stay unaware.

### CRM webhook authenticates only by an unguessable URL
**Evidence:** `POST /webhooks/crm/:connectorAccountId` (`crm-webhook.controller.ts`, feature `008`) is `@Public` and trusts the connector-account UUID in the path as the shared secret; there is no signature/HMAC verification of the payload.
**Impact:** Anyone who learns a connector-account id could post forged stage-entered events and start journeys. Pilot risk is low (id is a random UUIDv7, not exposed), but it is not defense-in-depth. Event-key idempotency is also journey-level only (no `processed_events` table), so redeliveries with distinct keys are not deduped.
**Fix:** Add per-connector webhook secret/HMAC verification when hardening, and a `processed_events` idempotency table keyed by `NormalizedEvent.idempotencyKey`.

### Dispatcher gaps: owner mapping, sendingWindow, template variables
**Evidence:** The dispatcher (feature `009`) resolves the send channel by `lead.ownerUserId`, but ingestion never maps the CRM owner (`ownerExternalId`) to a Kizunu user, so `ownerUserId` is null and every journey hits `error_state` (no channel) until owner mapping exists. It also ignores the cadence `sendingWindow` (dispatch is gated only by `nextTouchAt`), and sends templates without resolving `variables` values.
**Impact:** The pilot cannot actually deliver touches until CRM-owner → user mapping is built; messages may go out off-hours; templated messages send without filled variables (Meta rejects if it expects parameters).
**Fix:** Add an owner-identity mapping (e.g. per-membership external id per connector) consumed at ingestion to set `ownerUserId`; add `sendingWindow` (timezone/days/hours) to the cadence and honor it in `dispatchOne`; add a template-variable resolver from lead fields.

### Migrations run on every API boot
**Evidence:** `main.ts` `runMigrations()` runs before `bootstrap()` on every start.
**Impact:** Convenient for single-instance/dev, but multiple replicas starting concurrently can race on `drizzle-kit`'s migration table; a long migration also blocks readiness. Not a problem at pilot scale, a problem at deploy scale.
**Fix:** For multi-replica deploys, move migrations to a dedicated pre-deploy step (`bun db:migrate`) and drop the boot-time call, or guard with an advisory lock.

### Email-dependent flows are scaffolded but inert
**Evidence:** `verification_tokens` table + `VerificationTokenType` (`email_verification`, `password_reset`, `invitation`) exist, but only invitation accept has a use case; no password-reset/email-verification flows and no email-sending integration (`INTEGRATIONS.md` shows no mail provider).
**Impact:** Password reset and email verification (auth primitives the scope expects) are not usable end to end.
**Fix:** Add a mail boundary + the reset/verify use cases when closing out the auth feature; keep the boundary swappable.

## Low

### Test coverage is concentrated and shallow at the edges
**Evidence:** Strong unit specs for identity/workspace use cases, but `integration/` and `e2e/` hold only harness smoke tests (`db-connectivity.spec.ts`, `health.spec.ts`); no e2e for `auth`/`workspace` controllers or guards, no repository integration tests, no frontend tests at all (`apps/web` has no test setup).
**Impact:** Wiring regressions (guard, pipe, cookie, DB query) would not be caught.
**Fix:** As features land, add e2e for each controller and integration tests for repositories with real query logic — routed through the `generate-tests` skill so thin paths get e2e and fat logic gets focused tests (see `TESTING.md`).

### `cookieSecure` defaults to false
**Evidence:** `api.config.ts` `session.cookieSecure` defaults `false`.
**Impact:** Correct for local dev; if `APP_SESSION_COOKIE_SECURE` is not set in production the session cookie can travel over plain HTTP.
**Fix:** Ensure prod env sets it true; consider deriving from `env === 'production'`.
