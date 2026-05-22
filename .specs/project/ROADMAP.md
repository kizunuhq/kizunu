# Roadmap

**Current Milestone:** v0.1 — Pilot end-to-end
**Status:** Feature-complete; pilot-hardening follow-ups open

The single goal of v0.1 is to run the reference pilot end-to-end (see PROJECT.md). The
features below are the slices required for that contract to execute. Phase 1.5 and beyond
are deliberately deferred to avoid freezing API decisions too early.

**All v0.1 feature lines are implemented** (features `002`–`020`): identity/workspace,
the channel plugin system + Meta/WhatsApp, the CRM connector + Pipedrive, the cadence
aggregate + templates, the full engine (state machine, ingestion, dispatcher/poller,
inbound reply), the REST + OpenAPI surface, the Minimum UI, CSRF + login rate-limit
(`018`), manual lead reassignment (`019`), and password reset (`020`). Before a *real* pilot
run can deliver, a set of documented hardening follow-ups in `.specs/codebase/CONCERNS.md`
must close — notably CRM-owner → Kizunu-user mapping (else journeys hit `error_state`),
`sendingWindow`, template-variable resolution, `paused_owner_inactive` + reassign, the
inbox/conversations store, and credential encryption / webhook signing.

---

## v0.1 — Pilot end-to-end

**Goal:** A BDR moves a Pipedrive deal into a follow-up stage → a per-BDR WhatsApp cadence
fires → every touch logs a Pipedrive Activity → any reply pauses the cadence and moves the
deal → exhaustion marks the deal lost. Self-hostable via Docker Compose.
**Target:** All features below COMPLETE and verified against a real pilot.

### Features

**Identity & Auth** - COMPLETE

- Home-grown `User` (email, password hash) + session table
- Login / logout, session expiry, CSRF, login rate-limit, password reset
- Auth boundary isolated from domain (no auth-library org/teams schema)
- _Backend landed (#13, #14). Auth method settled (email/password) and CSRF posture
  (`sameSite`-lax + CORS) + IP login rate-limit landed in feature `018` (ADR-006).
  Session expiry/revocation is enforced. **Password reset** landed in feature `020`:
  a `MailSender` boundary (v0.1 `ConsoleMailSender`) carries a single-use, hashed
  reset token out-of-band — never in the HTTP response — and a confirm revokes all
  the user's sessions. Swapping in a real mail transport is tracked in CONCERNS._

**Workspace & Membership** - COMPLETE (v0.1 scope)

- `Workspace` and `Membership` (`role: admin | member`, `status: active | inactive`) as domain entities
- Admin user management: create, mark inactive, reassign leads
- _Backend use-cases landed (#13, #14); members admin UI in feature `013`. Lead
  reassignment + pausing an inactive owner's journeys landed in feature `019` (manual
  admin actions, per scope)._

**Channel plugin system + Meta/WhatsApp** - COMPLETE (v0.1 scope)

- `ChannelPlugin` contract (`manifest`, `send`, `parseInbound`, `validate → Decision`) as a monorepo module
- `ChannelAccount` (workspace-owned instance) + `ChannelAccess` (`isPrimary` per user/plugin)
- Meta Cloud API via Coexistence: 24h-window vs. HSM template decision inside `validate`; credentials `waba_id`, `phone_number_id`, system token
- App-level inbound webhook with `hub.verify_token`; routes by `phone_number_id`
- _Slice 1 landed (feature `002`): frozen port + registry + ChannelAccount/ChannelAccess
  domain and CRUD, proven with a fake plugin._
- _Slice 2 landed (feature `003`): `MetaWhatsappPlugin` (validate 24h-window/HSM,
  parseInbound, send) registered into the registry. The app-level inbound webhook is
  deferred to the Engine slice, where its `LeadJourney` consumer lives._

**CRM connector + Pipedrive** - COMPLETE (v0.1 scope)

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

**Cadence aggregate + Templates** - COMPLETE (v0.1 scope)

- `Cadence` (entry trigger, ordered `Step`s, stop policy, hooks `onReply`/`onExhausted`/`onComplete`)
- `Step` (`order`, `delay`, `jitter`, `channelRef`, `template`); `Template` as HSM reference for Meta
- `Lead` (mirrored owner from Pipedrive), CRUD for cadences and templates
- _Templates landed (feature `005`): workspace-owned HSM-reference templates with CRUD._
- _Cadence aggregate landed (feature `006`): `Cadence` + ordered `Step`s + closed
  vocabulary hook actions + stop policy, transactional CRUD with step/template
  validation. `EntryTrigger` ships with the engine slice; `Lead` is mirrored during
  ingestion._

**Engine: scheduler + inbound** - COMPLETE (v0.1 scope; hardening in CONCERNS)

- _Landed (feature `007`): the pure `LeadJourney` state machine (D1 transitions) and
  `EntryTrigger` CRUD (pipeline+stage → cadence)._
- _Landed (feature `008`): ingestion — the `Lead` + `LeadJourney` tables and
  `StartJourneyUseCase`, driven by the public per-connector CRM webhook
  (`POST /webhooks/crm/:connectorAccountId`). A `lead.stage_entered` event with a
  matching trigger creates exactly one running journey._
- _Landed (feature `009`): the dispatcher + in-process poller — row-locked per-journey
  dispatch, `TouchAttempt` idempotency, channel resolution (no channel → `error_state`),
  validate → send the template touch, CRM activity logging, advance with jitter, and
  exhaustion → `onExhausted` via the closed-vocabulary action executor._
- _Landed (feature `010`): inbound reply — the app-level Meta webhook
  (`hub.verify_token` verify + `phone_number_id` routing) and `MarkReplyUseCase`, which
  transitions a running journey → `replied` under the D1 row lock and runs `onReply`._
- _Landed (feature `019`): `paused_owner_inactive` + bulk reassign (manual admin actions).
  Deferred (pilot-hardening, in CONCERNS): `sendingWindow`, CRM-owner → user mapping,
  template-variable resolution._
- In-process DB poller over `LeadJourney.nextTouchAt <= now`; respects `sendingWindow`, applies `jitter`
- `LeadJourney` state machine (`running → paused | replied | exhausted | stopped | error_state | paused_owner_inactive`)
- Pessimistic row lock (`SELECT … FOR UPDATE`) resolving the dispatch/reply race; `TouchAttempt` idempotency on `(leadJourneyId, stepOrder)`
- Channel resolution via `ChannelAccess` (`lead_owner` strategy, `isPrimary`); no channel → `error_state` with reason
- Inbound reply → `status = 'replied'` → `onReply` actions
- Closed-vocabulary actions: `move_stage`, `mark_lost`, `log_activity`, `notify_user`, `set_field`, `webhook_out`
- Inactive-membership journeys → `paused_owner_inactive` (manual bulk reassign)

**Minimum UI** - COMPLETE (v0.1 scope; inbox deferred — see CONCERNS)

- _Foundation: shadcn-first primitives baseline + convention (`.specs/features/001-shadcn-first-primitives/`). Primitives in `apps/web` originate from shadcn/ui via the shadcn skill, customized in-project; bespoke only when no primitive fits._
- _Landed (feature `012`): auth login form + protected app shell with logout — the
  foundation every screen sits inside. The web app has no automated test harness yet
  (TESTING.md); UI is verified via `bun check` + build._
- _Landed (feature `013`): members admin screen (table + status toggle + invite that
  surfaces the token). shadcn `table`/`badge` primitives added._
- _Landed (feature `014`): journeys list (status-filtered) + my-channels (set primary)
  views._
- _Landed (feature `015`): channels admin (add channel account, grant access, list).
  shadcn `select`/`textarea` added._
- _Landed (feature `016`): CRM connectors + entry-triggers admin (add connector account,
  map stage → cadence, list/remove triggers)._
- _Landed (feature `017`): cadences & templates CRUD — template create/list/remove and a
  cadence builder (ordered steps + onReply move-stage) + cadence list. This completes the
  v0.1 Minimum UI; the **inbox** is the only deferred screen (no inbound-message store —
  documented in CONCERNS)._
- Auth (login)
- Admin: user management, workspace channels (create/configure/grant access/webhook URL), Pipedrive connector mapping
- BDR: my channels (set primary), cadences & templates CRUD, inbox (filter by instance / my leads), journey list (active/paused/error)

**REST + OpenAPI surface** - COMPLETE (v0.1 scope)

- CRUD for every domain entity; OpenAPI from day one
- Authenticated public endpoints: CRM webhook ingestion + channel inbound (URL per `ChannelAccount`)
- _Landed (feature `011`): OpenAPI 3 document + Swagger UI at `/docs` (and `/docs-json`),
  built from the controllers + zod DTOs (`@nestjs/swagger` + nestjs-zod), every controller
  tagged by domain; plus the `GET /workspaces/:id/lead-journeys` list (status-filterable).
  The public CRM + Meta webhooks landed with the engine. Minor remaining CRUD gaps
  (connector update/delete, entry-trigger update) are documented, not yet built._

---

## Phase 1.5 — Differentiation (shortly after v0.1 stabilizes)

**Goal:** Prove the plugin system is real, not WhatsApp/Pipedrive in disguise.

**Declarative channel credential fields + generated account form** - COMPLETE
- Plugin manifests declare a `credentialFields` descriptor (key/label/type/required)
  beside the zod `configSchema`; the `channel-plugins` contract carries it and the web
  channel-account form renders generated, secret-masked inputs instead of a raw JSON
  textarea. Mirrors novu's shared credential-metadata pattern within the type-safe
  boundary; lowers the cost of onboarding the second channel. A plugin-local drift
  guard keeps the descriptor and `configSchema` in lockstep. Credentials are still
  stored unencrypted (unchanged; tracked in CONCERNS). Spec: feature `021`.

**Second channel (email SMTP or Telegram)** - PLANNED
**Second CRM connector (HubSpot or RD Station)** - PLANNED
**First community-contributed plugin** - PLANNED

---

## Phase 1.6 — Auth & identity enrichment

**Goal:** Harden the home-grown auth boundary for real self-host operation without
coupling to an auth library — building on the v0.1 Identity & Auth slice (login/logout,
session expiry/revocation, CSRF, login rate-limit, password reset). Each feature below is
a separate slice and keeps the auth boundary isolated from the domain.

**Self-host registration gate** - COMPLETE
- _Landed (feature `022`): `DISABLE_USER_REGISTRATION` env toggle (`z.stringbool`) makes
  `RegisterUserUseCase` throw a `422` `identity.registration-disabled` before any DB access;
  invite/accept-invite stays ungated by construction. Public `GET /auth/capabilities`
  (`{ registrationEnabled }`) drives the web `(auth)/signup` form-vs-disabled-notice. Surfaced
  in `apps/api/.env.example` + `deploy/docker-compose.yml`._
- A single global toggle (env-backed config, e.g. `DISABLE_USER_REGISTRATION`) that blocks
  the public `POST /auth/register` use-case with a business-rule error (`422`) when on.
- novu style: no instance-admin role. The operator boots with the gate open, registers the
  first/master user (who becomes a normal workspace `admin`, as `register` already does),
  then sets the toggle on to lock down public signup. No first-user bypass in code.
- Further members keep arriving through the existing invite / `accept-invite` flow, which is
  a separate path and stays ungated.
- Web: `(auth)/signup` reflects the gate (hidden/disabled with a "registration disabled"
  state) driven by a public capability flag, not a hardcoded build switch.
- Config surfaced in `docker/.env.example`, the config module, and env validation.

**Email verification** - IN PROGRESS
- Reuse the existing `verification-tokens` table and the `MailSender` boundary (v0.1
  `ConsoleMailSender`) to carry a single-use, hashed verification token out-of-band on
  register — never in the HTTP response, mirroring the password-reset slice (`020`).
- `users.emailVerifiedAt` already exists and is set on confirm. The enforcement posture
  (allow login but restrict vs. block until verified) and resend throttling are settled in
  the slice's Specify.
- Endpoints: request/resend verification + confirm; web post-signup "check your email"
  state + a verify route. Contracts + api-client hooks per the type-safe boundary.

**Session management UX** - PLANNED
- List a user's active sessions (device / user-agent / IP / last-seen / expiry), revoke an
  individual session, and "log out everywhere" (revoke all but the current). Builds on the
  existing `sessions` table and `SessionRepository`; no new session model.
- New read/revoke contracts + api-client hooks + a security screen in the app shell.

**OAuth / SSO login** - PLANNED
- Social login providers (set TBD in Specify; Google / GitHub the likely first) alongside
  email + password. Account linking by verified email; a new identities table; per-provider
  callback routes and client-id/secret/redirect config.
- Distinct from the managed-cloud enterprise SSO/SAML noted under Future Considerations
  (Paid cloud) — this slice is self-host social OAuth, not multi-tenant SAML.

---

## Future Considerations (Phase 2+)

- Native CRM (deals, own pipeline, contacts)
- Top of funnel: forms, landing pages, enrichment, scoring
- Intelligence (AI): reply classification, touch generation, BDR coaching
- Paid cloud: managed hosting, multi-tenant, SSO, audit log, advanced RBAC, premium connectors
- Automatic lead reassignment; round-robin / load balancing across channels
