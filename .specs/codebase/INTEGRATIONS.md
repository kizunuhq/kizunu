# External Integrations

**State:** Only PostgreSQL is wired today. The v0.1 contract's external integrations — Meta Cloud API (WhatsApp) and Pipedrive — are designed (frozen contracts in `docs/v0.1-scope.md`) but **not yet implemented**. They are documented here as planned so feature work has a target.

## Datastore — PostgreSQL

**Purpose:** System of record for all domain entities.
**Implementation:** `@kizunu/nestjs-shared` `DrizzleService` (single `pg.Pool` → `drizzle(..., { casing: 'snake_case' })`), provided globally by `PersistenceModule` from `config.get('database.url')`.
**Configuration:** `APP_DATABASE_URL` (must start with `postgresql://`), validated in `apps/api/src/api.config.ts`. Local/CI lifecycle via `scripts/db.ts` + Docker Compose (`deploy/`). Migrations run at API boot (`main.ts` `runMigrations()`) and via `drizzle-kit` (`bun db:migrate`); migration table `__kizunu_migrations__`.
**Authentication:** connection-string credentials.

## Authentication / Sessions (internal, no external IdP)

**Purpose:** Home-grown auth — no external auth library by deliberate choice (keeps `Workspace`/`Membership` in domain tables; see PROJECT.md and `docs/adr/`).
**Implementation:** opaque session token (random, stored hashed in `sessions`) issued by `AuthenticateUseCase`; `httpOnly` cookie set by `AuthController.setSessionCookie`; global `AuthGuard` validates per request. Passwords hashed with argon2id via `Bun.password` (`core/crypto/password.helper.ts`).
**Configuration:** `APP_SESSION_COOKIE_NAME` (`kizunu_session`), `APP_SESSION_TTL_DAYS` (30), `APP_SESSION_COOKIE_SECURE` (false by default — see CONCERNS).

## Web → API

**Purpose:** The SPA consumes the same REST API.
**Implementation:** `apps/web/src/lib/api-client.ts` (`apiFetch`, `credentials: 'include'`, `ApiClientError` mirroring `{ code, message, context }`); TanStack Query hooks (`hooks/use-session.ts`).
**Configuration:** `VITE_API_URL` (default `http://localhost:3001`).

---

## Planned (v0.1 — not yet built)

The shape of the items below is fixed by accepted ADRs (index: `docs/adr/README.md`) — notably ADR 004 (Meta CoEx channel) and ADR 005 (DB-poller scheduler). ADRs are immutable; supersede rather than edit.

### Channel plugin — Meta Cloud API / WhatsApp (Coexistence)

**Purpose:** Outbound WhatsApp touches + inbound replies; per-BDR numbers.
**Planned location:** monorepo channel-plugin module (not a separate process — ADR 004 *Meta Cloud API (Coexistence) as the v0.1 WhatsApp Channel*).
**Contract:** `ChannelPlugin { manifest, send, parseInbound, validate → Decision }`; Meta specifics (24h window, HSM templates, `waba_id`/`phone_number_id`/system token) stay inside the plugin.
**Auth:** system token in `ChannelAccount.credentials`.

### CRM connector — Pipedrive

**Purpose:** Inbound stage-change events normalized to internal vocabulary; outbound Activity / move-stage / mark-lost.
**Contract:** `CRMConnector { parseWebhook, fetchLead, logActivity, moveStage, markLost, setField }`; per-workspace API token.
**Rate limits:** ~100 req / 10s → throttled outbound queue, exponential backoff (max 3) → `error_state`.

## Webhooks (planned)

- **Pipedrive `deal.updated`** — filtered by `stage_id` transition; idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`.
- **Meta inbound** — single app-level webhook with `hub.verify_token` verification; plugin routes by `phone_number_id`; per-`ChannelAccount` URL also available.

Both will be authenticated public endpoints on the API.

## Background Jobs

**Queue system:** none. By decision (ADR 005 — *In-Process DB Poller as the Scheduler, Not BullMQ/Redis*), the scheduler will be an in-process NestJS cron poller over `LeadJourney.nextTouchAt <= now`; restart resilience comes from the DB, not a queue. Reassess BullMQ at higher volume. Not yet implemented.
