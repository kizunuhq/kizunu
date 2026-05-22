# Roadmap

**Current Milestone:** v0.1 — Pilot end-to-end
**Status:** In Progress

The single goal of v0.1 is to run the reference pilot end-to-end (see PROJECT.md). The
features below are the slices required for that contract to execute. Phase 1.5 and beyond
are deliberately deferred to avoid freezing API decisions too early.

---

## v0.1 — Pilot end-to-end

**Goal:** A BDR moves a Pipedrive deal into a follow-up stage → a per-BDR WhatsApp cadence
fires → every touch logs a Pipedrive Activity → any reply pauses the cadence and moves the
deal → exhaustion marks the deal lost. Self-hostable via Docker Compose.
**Target:** All features below COMPLETE and verified against a real pilot.

### Features

**Identity & Auth** - IN PROGRESS

- Home-grown `User` (email, password hash) + session table
- Login / logout, session expiry, CSRF, login rate-limit, password reset
- Auth boundary isolated from domain (no auth-library org/teams schema)
- _Backend landed (#13, #14); magic-link-vs-password choice and the remaining primitives still open._

**Workspace & Membership** - IN PROGRESS

- `Workspace` and `Membership` (`role: admin | member`, `status: active | inactive`) as domain entities
- Admin user management: create, mark inactive, reassign leads
- _Backend use-cases landed (#13, #14)._

**Channel plugin system + Meta/WhatsApp** - IN PROGRESS

- `ChannelPlugin` contract (`manifest`, `send`, `parseInbound`, `validate → Decision`) as a monorepo module
- `ChannelAccount` (workspace-owned instance) + `ChannelAccess` (`isPrimary` per user/plugin)
- Meta Cloud API via Coexistence: 24h-window vs. HSM template decision inside `validate`; credentials `waba_id`, `phone_number_id`, system token
- App-level inbound webhook with `hub.verify_token`; routes by `phone_number_id`
- _Slice 1 landed (feature `002`): frozen port + registry + ChannelAccount/ChannelAccess
  domain and CRUD, proven with a fake plugin._
- _Slice 2 landed (feature `003`): `MetaWhatsappPlugin` (validate 24h-window/HSM,
  parseInbound, send) registered into the registry. The app-level inbound webhook is
  deferred to the Engine slice, where its `LeadJourney` consumer lives._

**CRM connector + Pipedrive** - IN PROGRESS

- `CRMConnector` contract (`parseWebhook`, `fetchLead`, `logActivity`, `moveStage`, `markLost`, `setField`)
- Normalized vocabulary (`lead.stage_entered`, …); cadences never see Pipedrive
- `deal.updated` webhook filtered by `stage_id` transition; idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`
- Throttled outbound queue (~100 req / 10s), exponential backoff, max 3 retries → `error_state`
- `EntryTrigger` mapping (pipeline + stage → cadence)
- _Landed (feature `004`): the `CRMConnector` port + registry, per-workspace
  `ConnectorAccount` CRUD, and the Pipedrive connector (`parseWebhook` normalization +
  outbound actions). `EntryTrigger` (needs `cadenceId`), the webhook-ingestion endpoint
  (needs `LeadJourney`), and the throttled outbound queue ship with the Cadence/Engine
  slices._

**Cadence aggregate + Templates** - IN PROGRESS

- `Cadence` (entry trigger, ordered `Step`s, stop policy, hooks `onReply`/`onExhausted`/`onComplete`)
- `Step` (`order`, `delay`, `jitter`, `channelRef`, `template`); `Template` as HSM reference for Meta
- `Lead` (mirrored owner from Pipedrive), CRUD for cadences and templates
- _Templates landed (feature `005`): workspace-owned HSM-reference templates with CRUD._
- _Cadence aggregate landed (feature `006`): `Cadence` + ordered `Step`s + closed
  vocabulary hook actions + stop policy, transactional CRUD with step/template
  validation. `EntryTrigger` ships with the engine slice; `Lead` is mirrored during
  ingestion._

**Engine: scheduler + inbound** - IN PROGRESS

- _Landed (feature `007`): the pure `LeadJourney` state machine (D1 transitions) and
  `EntryTrigger` CRUD (pipeline+stage → cadence)._
- _Landed (feature `008`): ingestion — the `Lead` + `LeadJourney` tables and
  `StartJourneyUseCase`, driven by the public per-connector CRM webhook
  (`POST /webhooks/crm/:connectorAccountId`). A `lead.stage_entered` event with a
  matching trigger creates exactly one running journey. The scheduler/dispatcher
  (poller + row lock + `TouchAttempt`) and inbound reply handling remain._
- In-process DB poller over `LeadJourney.nextTouchAt <= now`; respects `sendingWindow`, applies `jitter`
- `LeadJourney` state machine (`running → paused | replied | exhausted | stopped | error_state | paused_owner_inactive`)
- Pessimistic row lock (`SELECT … FOR UPDATE`) resolving the dispatch/reply race; `TouchAttempt` idempotency on `(leadJourneyId, stepOrder)`
- Channel resolution via `ChannelAccess` (`lead_owner` strategy, `isPrimary`); no channel → `error_state` with reason
- Inbound reply → `status = 'replied'` → `onReply` actions
- Closed-vocabulary actions: `move_stage`, `mark_lost`, `log_activity`, `notify_user`, `set_field`, `webhook_out`
- Inactive-membership journeys → `paused_owner_inactive` (manual bulk reassign)

**Minimum UI** - PLANNED

- _Foundation: shadcn-first primitives baseline + convention (`.specs/features/001-shadcn-first-primitives/`). Primitives in `apps/web` originate from shadcn/ui via the shadcn skill, customized in-project; bespoke only when no primitive fits._
- Auth (login)
- Admin: user management, workspace channels (create/configure/grant access/webhook URL), Pipedrive connector mapping
- BDR: my channels (set primary), cadences & templates CRUD, inbox (filter by instance / my leads), journey list (active/paused/error)

**REST + OpenAPI surface** - PLANNED

- CRUD for every domain entity; OpenAPI from day one
- Authenticated public endpoints: CRM webhook ingestion + channel inbound (URL per `ChannelAccount`)

---

## Phase 1.5 — Differentiation (shortly after v0.1 stabilizes)

**Goal:** Prove the plugin system is real, not WhatsApp/Pipedrive in disguise.

**Second channel (email SMTP or Telegram)** - PLANNED
**Second CRM connector (HubSpot or RD Station)** - PLANNED
**First community-contributed plugin** - PLANNED

---

## Future Considerations (Phase 2+)

- Native CRM (deals, own pipeline, contacts)
- Top of funnel: forms, landing pages, enrichment, scoring
- Intelligence (AI): reply classification, touch generation, BDR coaching
- Paid cloud: managed hosting, multi-tenant, SSO, audit log, advanced RBAC, premium connectors
- Automatic lead reassignment; round-robin / load balancing across channels
