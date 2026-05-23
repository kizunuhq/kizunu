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

**Email verification** - COMPLETE
- _Landed (feature `023`): `RequestEmailVerificationUseCase` mints a single-use
  `email_verification` token and mails the verify link out-of-band (no-op when the user
  is missing or already verified); `ConfirmEmailVerificationUseCase` consumes it and sets
  `users.emailVerifiedAt` (invalid → `422 identity.invalid-verification-token`). Register
  composes the request use-case post-commit. `EmailVerificationController` exposes authed
  resend + public confirm. Web: an unverified banner in the app shell + a public
  `/verify-email` route. Soft posture for v0.1 (login never blocked; verification exposed
  via `me.emailVerifiedAt` for later hard-gating). Resend is authenticated (no enumeration)._
- Reuse the existing `verification-tokens` table and the `MailSender` boundary (v0.1
  `ConsoleMailSender`) to carry a single-use, hashed verification token out-of-band on
  register — never in the HTTP response, mirroring the password-reset slice (`020`).
- `users.emailVerifiedAt` already exists and is set on confirm. The enforcement posture
  (allow login but restrict vs. block until verified) and resend throttling are settled in
  the slice's Specify.
- Endpoints: request/resend verification + confirm; web post-signup "check your email"
  state + a verify route. Contracts + api-client hooks per the type-safe boundary.

**Session management UX** - COMPLETE
- _Landed (feature `024`): `sessions.lastSeenAt` (migration `0008`) refreshed by the auth
  guard coalesced to ~5 min; `SessionRepository` list/touch/ownership-scoped revoke;
  `ListSessionsUseCase` (current flagged), `RevokeSessionUseCase` (foreign/missing id →
  `422 identity.session-not-found`), `RevokeOtherSessionsUseCase` (keeps current).
  `SessionController` (`GET /auth/sessions`, `DELETE /auth/sessions/:id`,
  `DELETE /auth/sessions`). Web: a Security screen with per-row revoke + log-out-others._
- List a user's active sessions (device / user-agent / IP / last-seen / expiry), revoke an
  individual session, and "log out everywhere" (revoke all but the current). Builds on the
  existing `sessions` table and `SessionRepository`; no new session model.
- New read/revoke contracts + api-client hooks + a security screen in the app shell.

**OAuth / SSO login** - COMPLETE
- _Landed (feature `025`): `OAuthProvider` port + `OAuthProviderRegistry` with
  `GithubOAuthProvider` (zod-parsed); `identities` table + nullable `users.passwordHash`
  (migration `0009`); `HandleOAuthCallbackUseCase` (existing identity → link by verified
  email → provision new, gated by `DISABLE_USER_REGISTRATION`); `OAuthController` with the
  state-cookie redirect flow; `GET /auth/capabilities` lists enabled providers; login-screen
  provider buttons. Extracted `SessionIssuer` + `UserProvisioningService` shared by
  register/login. Google/etc. are new providers behind the same port._

**Web `/auth/*` route prefix** - COMPLETE
- _Landed (feature `026`): the web auth pages moved from the pathless `(auth)` group to a
  real `/auth/*` prefix (`/auth/login`, `/auth/signup`, `/auth/verify-email`,
  `/auth/accept-invite/$token`); in-app redirects and the OAuth/verification link targets
  updated to match._
- Social login providers (set TBD in Specify; Google / GitHub the likely first) alongside
  email + password. Account linking by verified email; a new identities table; per-provider
  callback routes and client-id/secret/redirect config.
- Distinct from the managed-cloud enterprise SSO/SAML noted under Future Considerations
  (Paid cloud) — this slice is self-host social OAuth, not multi-tenant SAML.

---

## Phase 1.7 — Delivery & infra

**CI validation gate & repo governance** - COMPLETE
- _Landed (feature `027`, PR #47): CI now mirrors `scripts/check.sh`. `ci.yml` is an
  orchestrator calling reusables — `_quality` (`vp check` + the four `check-*`
  scripts), `_unit` (`unit`+`web`), and a parameterized `_db-tests`
  (`integration`|`e2e`; `postgres:16-alpine` service + `db:migrate`, bypassing the
  Docker-bound `db:test:setup`) — with a shared `coverage-summary` composite action. A
  single `Required (CI)` aggregator is the only branch-protection check, posts a sticky
  `ci-summary` comment, skips code jobs on docs-only diffs, and gates e2e to non-draft
  PRs. Plus `pr-title`, `deps-outdated`, and governance-as-code: `ruleset.json`,
  `CODEOWNERS`, `CODE_OF_CONDUCT.md`. Trunk-only (`master`)._
- _Follow-ups resolved: coverage tables render in the `ci-summary` comment (PR #51);
  the `master protection` ruleset is active — require PR + `Required (CI)` + `Lint PR
  title`, squash-only, no direct push (applied from `.github/ruleset.json`, PR #50)._
- Prerequisite for `028` — deploy must never auto-stage an untested merge.

**Deploy pipeline (staging + production)** - PLANNED (blocked on infra decisions)
- _Feature `028` (discovery in `.specs/features/028-deploy-pipeline/`)._
- Trunk-only: every `master` push builds one GHCR image per app (`:sha-<short>` +
  `:latest`); staging auto-tracks `:latest`; production is a manual, pinned promotion.
  Rollout via **Kamal** to internal servers (`kamal deploy --skip-push --version=<sha>`,
  staging/production destinations, `pre-deploy` migrations, `kamal rollback`). Optional
  release-please for semver tags.
- Blocked on: where Kamal runs in CI + secrets, and server topology (see discovery).

---

## Phase 1.8 — WhatsApp Coexistence onboarding

**Goal:** Close the gap between the v0.1 description ("Meta Cloud API via Coexistence",
line 55) and what actually shipped — the v0.1 Meta plugin is **standalone Cloud API**,
not Coex. Phase 1.8 lands the real thing: customers keep using the WhatsApp Business
mobile app while kizunu drives outbound cadences alongside it, onboarded through Meta's
Embedded Signup flow (no manual webhook configuration in the Meta dashboard).

**Source of truth:** [`.specs/research/whatsapp-coexistence/`](../research/whatsapp-coexistence/)
captures the Meta documentation, the OSS reference implementations (notably
[chatwoot/chatwoot](https://github.com/chatwoot/chatwoot/tree/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc)
for the FB.login Coex configuration and `smb_message_echoes` routing, and
[evolution-foundation/evo-ai-crm-community](https://github.com/evolution-foundation/evo-ai-crm-community/tree/8d7bf198072fded000dd8c49c257097ed00ce554)
for the `smb_app_state_sync` handler), and the verified webhook payload shapes
under [`research/whatsapp-coexistence/snippets/`](../research/whatsapp-coexistence/snippets/).
Refresh that doc before each feature starts.

**Hard constraint:** Embedded Signup v2 deprecates **2026-10-15**. All three features
build v4 from the start; no v2 fallback paths.

**Auto webhook subscription + per-account verify token** - PLANNED (feature 029)
- Adds the two-step Meta subscription flow that the current paste-credentials onboarding
  skips: app-level `POST /{appId}/subscriptions` (uses an App Access Token `{appId}|{appSecret}`)
  followed by per-WABA `POST /{wabaId}/subscribed_apps` with `override_callback_uri` +
  per-channel verify token. Replaces the single env `META_VERIFY_TOKEN` with server-generated
  per-channel-account tokens. Adds `appSecret` to `metaCredentialsSchema`. Works on the
  existing standalone Cloud API flow today — Coex is not a prerequisite. Pattern stolen from
  novu (`subscribeAppToWhatsAppEvents` + `subscribeWabaMessagesField`).
- Ships independent of Coex: any paste-credentials customer benefits immediately by no longer
  needing to configure the webhook in the Meta dashboard manually.

**OAuth credential lifecycle primitives** - PLANNED (feature 030)
- Cross-cutting primitives the Coex feature will need and any future OAuth-using plugin (Slack,
  HubSpot OAuth, Google) can reuse: a tiny `oauthCredentialFields` zod mixin (`accessToken` +
  `refreshToken?` + `accessTokenExpiresAt?`) that plugins compose into their own schemas;
  an `EncryptedCredentialsService` invoked at the repo boundaries (closes the
  credential-encryption risk tracked in [`CONCERNS.md`](../codebase/CONCERNS.md));
  an `OAuthRefreshService` plus an optional `plugin.refreshCredentials()` hook so the lifecycle
  is plugin-agnostic. No behavior change for existing plugins (Pipedrive's static API token
  continues unchanged).

**WhatsApp Coexistence: Embedded Signup + Coex webhooks** - PLANNED (feature 031, depends on 029 + 030)
- The customer-visible deliverable. Adds the Coex-discriminated channel mode to the Meta
  plugin and the Embedded Signup flow to `apps/web`:
  - `apps/web` page that loads the Meta JS SDK and calls `FB.login` with the Coex extras
    (`featureType: 'whatsapp_business_app_onboarding'` — see
    [`snippets/fb-login-coex.js`](../research/whatsapp-coexistence/snippets/fb-login-coex.js)).
  - New contract `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect` that exchanges
    the OAuth code (`GET /oauth/access_token`) for a business token and creates the
    `ChannelAccount` with `channelMode: 'coexistence'`.
  - Webhook handler extensions for the three Coex event fields: `smb_message_echoes`
    (mirrored messages from the WA Business mobile app — feed into `MarkReplyUseCase` as a
    conversation signal but NOT as a 24h-service-window opener; see context section E.4),
    `smb_app_state_sync` (one-way contact sync), `history` (6-month backfill stream, 200-ack
    in v0.1, defer full import). Verbatim payload shapes pinned under
    [`snippets/`](../research/whatsapp-coexistence/snippets/).
  - `channelMode` discriminator on `metaCredentialsSchema` (`'cloud_api'` | `'coexistence'`)
    drives the inbound parser branch.
  - Token-refresh schedule using the primitives from feature 030.
- Kizunu-wide config (not per-channel-account): `appId`, `appSecret`, `coexConfigId`,
  `defaultCallbackHost` in `apps/api/src/config/`.
- Onboarding-time checklist for the pilot customer (verified in research/context.md, section E):
  WA Business app v2.24.17+; minimum 7 days of active app usage; number not already linked to
  another Cloud API integration; not in Nigeria/South Africa (unsupported region as of March 2026).

---

## Future Considerations (Phase 2+)

- Native CRM (deals, own pipeline, contacts)
- Top of funnel: forms, landing pages, enrichment, scoring
- Intelligence (AI): reply classification, touch generation, BDR coaching
- Paid cloud: managed hosting, multi-tenant, SSO, audit log, advanced RBAC, premium connectors
- Automatic lead reassignment; round-robin / load balancing across channels
