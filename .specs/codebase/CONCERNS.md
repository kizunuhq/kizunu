# Concerns

Evidence-backed warnings, prioritized by risk. Each item cites a file and a fix approach. Absence of an item means no evidence was found, not a guarantee.

## High

### Core v0.1 scope is largely unbuilt
**Evidence:** `apps/api/src/modules/` has `identity`, `workspace`, and now `channel` (feature `002`: the frozen `ChannelPlugin` port + registry and `ChannelAccount`/`ChannelAccess` CRUD, proven with a fake plugin). Still missing: the Meta/WhatsApp plugin + inbound webhook (feature `003`), CRM connector (Pipedrive), `Cadence`/`Step`/`Template`, `Lead`/`LeadJourney`/`TouchAttempt`, `EntryTrigger`, and the scheduler/inbound engine (`docs/v0.1-scope.md`).
**Impact:** The pilot contract (the one thing v0.1 must do) cannot run. The frozen plugin/connector contracts are the riskiest design surface and are unvalidated against real APIs. The web app is likewise a skeleton — routes are TODO placeholders (`docs/web-structure.md` maps the intended layout; `components/primitives/` now holds the shadcn baseline, but no real screens yet).
**Fix:** Sequence per ROADMAP.md — channel plugin contract first (engine depends on it), then CRM connector, cadence aggregate, engine. Validate `ChannelPlugin.validate → Decision` against the real Meta 24h-window/HSM behavior early. For UI, build screens shadcn-first per `.agents/rules/react.md` §0.

_(Resolved) CORS, login rate-limit, and CSRF posture — addressed in feature `018` /
ADR-006: `main.ts` now `enableCors`s the configured allowlist with credentials;
`@nestjs/throttler` adds a global default + a stricter `auth/login`+`auth/register`
limit; CSRF is `sameSite: 'lax'` + the CORS allowlist (documented, no token in v0.1)._

## Medium

### Mail is delivered by a console logger, not a real provider
**Evidence:** Password reset (feature `020`) sends via the `MailSender` port, bound in v0.1 to `ConsoleMailSender` (`apps/api/src/modules/identity/core/mail/`), which logs the message instead of delivering it. `INTEGRATIONS.md` still shows no mail provider.
**Impact:** The reset flow is correct and secure (single-use hashed token, out-of-band, never in a response, revokes all sessions on confirm), but a real user cannot receive the email — an operator must read the server log for the link. Not pilot-deliverable as-is.
**Fix:** Implement an SMTP/API `MailSender` and bind it behind the existing port (no caller changes). The invitation flow (which still returns its token in the response) should move onto the same boundary at that point.

_(Resolved) Provider credentials are stored unencrypted — addressed in feature
`030`: `EncryptedCredentialsService` (AES-256-GCM, key from
`APP_CREDENTIALS_ENCRYPTION_KEY`) wraps every write/read of
`channel_accounts.credentials` and `connector_accounts.credentials` inside the
two persistence repos. Pre-030 plaintext rows continue to read transparently
(decrypt passes non-envelope JSON through unchanged) so existing deployments
upgrade without a data migration. Tampering throws
`CredentialsDecryptionFailedException` (500). v0.1 ships a single key; rotation
/ KMS lands later (envelope reserves `v: 1` for key-version)._

### CRM webhook authenticates only by an unguessable URL
**Evidence:** `POST /webhooks/crm/:connectorAccountId` (`crm-webhook.controller.ts`, feature `008`) is `@Public` and trusts the connector-account UUID in the path as the shared secret; there is no signature/HMAC verification of the payload.
**Impact:** Anyone who learns a connector-account id could post forged stage-entered events and start journeys. Pilot risk is low (id is a random UUIDv7, not exposed), but it is not defense-in-depth. Event-key idempotency is also journey-level only (no `processed_events` table), so redeliveries with distinct keys are not deduped.
**Fix:** Add per-connector webhook secret/HMAC verification when hardening, and a `processed_events` idempotency table keyed by `NormalizedEvent.idempotencyKey`.

### Inbox has no backend (inbound messages are not stored)
**Evidence:** `MarkReplyUseCase` (feature `010`) transitions the journey to `replied` and runs `onReply`, but the inbound message body/sender is never persisted; there is no conversations/messages table or API.
**Impact:** The roadmap's BDR "inbox (filter by instance / my leads)" UI cannot be built — there is no data source. Only the reply *signal* is consumed, not the content.
**Fix:** Add an inbound-message/conversation store written by the Meta webhook + a read API, then the inbox screen. Out of v0.1 minimal core.

### Dispatcher gaps: owner mapping, sendingWindow, template variables
**Evidence:** The dispatcher (feature `009`) resolves the send channel by `lead.ownerUserId`, but ingestion never maps the CRM owner (`ownerExternalId`) to a Kizunu user, so `ownerUserId` is null and every journey hits `error_state` (no channel) until owner mapping exists. It also ignores the cadence `sendingWindow` (dispatch is gated only by `nextTouchAt`), and sends templates without resolving `variables` values.
**Impact:** The pilot cannot actually deliver touches until CRM-owner → user mapping is built; messages may go out off-hours; templated messages send without filled variables (Meta rejects if it expects parameters).
**Fix:** Add an owner-identity mapping (e.g. per-membership external id per connector) consumed at ingestion to set `ownerUserId`; add `sendingWindow` (timezone/days/hours) to the cadence and honor it in `dispatchOne`; add a template-variable resolver from lead fields.

### Migrations run on every API boot
**Evidence:** `main.ts` `runMigrations()` runs before `bootstrap()` on every start.
**Impact:** Convenient for single-instance/dev, but multiple replicas starting concurrently can race on `drizzle-kit`'s migration table; a long migration also blocks readiness. Not a problem at pilot scale, a problem at deploy scale.
**Fix:** For multi-replica deploys, move migrations to a dedicated pre-deploy step (`bun db:migrate`) and drop the boot-time call, or guard with an advisory lock.

### Email verification flow is scaffolded but inert
**Evidence:** `verification_tokens` supports an `email_verification` type, but no request/confirm use case consumes it (unlike `password_reset`, built in feature `020`, and `invitation`). `users.emailVerifiedAt` is never set after registration.
**Impact:** Email verification (an auth primitive the scope mentions) is not usable end to end; registered emails are trusted without proof of ownership.
**Fix:** Add request/confirm-email-verification use cases reusing the `MailSender` port (feature `020`) and `VerificationTokenRepository`; set `emailVerifiedAt` on confirm.

## Low

### Test coverage is concentrated and shallow at the edges
**Evidence:** Strong unit specs for identity/workspace use cases, but `integration/` and `e2e/` hold only harness smoke tests (`db-connectivity.spec.ts`, `health.spec.ts`); no e2e for `auth`/`workspace` controllers or guards, no repository integration tests, no frontend tests at all (`apps/web` has no test setup).
**Impact:** Wiring regressions (guard, pipe, cookie, DB query) would not be caught.
**Fix:** As features land, add e2e for each controller and integration tests for repositories with real query logic — routed through the `generate-tests` skill so thin paths get e2e and fat logic gets focused tests (see `TESTING.md`).

### `cookieSecure` defaults to false
**Evidence:** `api.config.ts` `session.cookieSecure` defaults `false`.
**Impact:** Correct for local dev; if `APP_SESSION_COOKIE_SECURE` is not set in production the session cookie can travel over plain HTTP.
**Fix:** Ensure prod env sets it true; consider deriving from `env === 'production'`.
