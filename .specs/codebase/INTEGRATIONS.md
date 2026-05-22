# External Integrations

**State:** PostgreSQL is wired; the **Meta Cloud API (WhatsApp) outbound** channel plugin (feature `003`) and the **Pipedrive** CRM connector (feature `004`, normalization + outbound actions) now exist as registered plugins. The inbound webhooks (Meta + Pipedrive `deal.updated`) remain designed-only — they wire into `LeadJourney`/cadences and ship with the engine slice.

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

## Channel plugin — Meta Cloud API / WhatsApp (Coexistence)

**Purpose:** Outbound WhatsApp touches (inbound replies once the webhook lands with the engine); per-BDR numbers.
**Status:** Built in feature `003` — `MetaWhatsappPlugin` (`apps/api/src/modules/channel/plugins/meta-whatsapp/`) implements the frozen port and is registered into `CHANNEL_PLUGINS`. Per ADR 004 it is a monorepo module, not a separate process.
**Implementation:** `validate` decides freeform vs. HSM template against the 24h customer-service window; `parseInbound` normalizes webhook payloads (routing by `phone_number_id`, never throws); `send` POSTs text/template to the Graph API (`META_GRAPH_API_BASE`, base/fetch injectable for tests). Meta specifics (24h window, HSM, `waba_id`/`phone_number_id`/system token) stay inside the plugin.
**Auth:** system token in `ChannelAccount.credentials` (validated by the plugin `configSchema`).

The shape of these integrations is fixed by accepted ADRs (index: `docs/adr/README.md`) — notably ADR 004 (Meta CoEx channel) and ADR 005 (DB-poller scheduler). ADRs are immutable; supersede rather than edit.

## CRM connector — Pipedrive

**Purpose:** Inbound stage-change events normalized to internal vocabulary; outbound Activity / move-stage / mark-lost / set-field.
**Status:** Built in feature `004` — `PipedriveConnector` (`apps/api/src/modules/crm/plugins/pipedrive/`) implements the frozen `CRMConnector` port and is registered into `CRM_CONNECTORS`; per-workspace `ConnectorAccount` holds the API token.
**Implementation:** `parseWebhook` normalizes `deal.updated` stage transitions into `lead.stage_entered` (idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`, never throws); outbound actions POST/PUT to `https://{companyDomain}.pipedrive.com/api/v1` with `?api_token=` (base/fetch injectable for tests). Non-OK → `CrmRequestFailedException`.
**Planned (engine slice):** throttled outbound queue (~100 req / 10s, exponential backoff, max 3 → `error_state`) and the `EntryTrigger` pipeline+stage → cadence mapping.

## Webhooks (planned)

- **Pipedrive `deal.updated`** — filtered by `stage_id` transition; idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`.
- **Meta inbound** — single app-level webhook with `hub.verify_token` verification; plugin routes by `phone_number_id`; per-`ChannelAccount` URL also available.

Both will be authenticated public endpoints on the API.

## Background Jobs

**Queue system:** none. By decision (ADR 005 — *In-Process DB Poller as the Scheduler, Not BullMQ/Redis*), the scheduler will be an in-process NestJS cron poller over `LeadJourney.nextTouchAt <= now`; restart resilience comes from the DB, not a queue. Reassess BullMQ at higher volume. Not yet implemented.
