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

**SMTP mail transport (and Mailpit dev inbox)** - COMPLETE
- _Landed (feature `040`): `SmtpMailSender` wraps `nodemailer` behind the existing
  `MailSender` port (introduced in `020`); `IdentityModule` selects it via a
  `buildMailSender(config)` factory when `mail.smtpHost` is set, otherwise keeps
  `ConsoleMailSender` so dev-without-SMTP is unchanged. `api.config.ts` gains a
  `mail.*` block (`smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword`, `smtpSecure`,
  `from`) read from `APP_SMTP_*` / `APP_MAIL_FROM` (with `z.stringbool` for the
  secure flag, consistent with the registration gate). Dev `docker-compose.yml`
  brings up a `mailpit` service on profiles `all|infra|api|mail`, exposes SMTP on
  `:1025` and the inbox UI on `:8025`, and the api `depends_on` it; signup-verify,
  resend-verify-from-inside, and forgot-password→reset all deliver end-to-end to
  the local inbox. Closes the CONCERNS §Medium "console mail logger" item._
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

**Auto webhook subscription + per-account verify token** - COMPLETE
- _Landed (feature `029`): channel-account create now performs Meta's two-step
  subscription flow on its own — app-level `POST /{appId}/subscriptions` with an
  App Access Token (`{appId}|{appSecret}`), then per-WABA
  `POST /{wabaId}/subscribed_apps` with `override_callback_uri` and a
  server-generated per-channel verify token, surfaced through an optional
  `onAccountCreated` hook added to the `ChannelPlugin` port. The Meta inbound
  webhook moved from a single `/webhooks/meta` (env-wide token, body-routed by
  `phone_number_id`) to per-channel `/webhooks/meta/:channelAccountId` (token
  per-row, path-routed). `metaCredentialsSchema` gained `appId`, `appSecret`, and
  `verifyToken`; the env-wide `APP_META_VERIFY_TOKEN` was removed entirely.
  Failures surface as `422 channel.meta-subscription-failed` with the failing
  step + Meta error in the context. The web form hides server-generated fields
  via a new `serverGenerated` flag on the credential descriptor._
- Ships independent of Coex: any paste-credentials customer benefits immediately by no longer
  needing to configure the webhook in the Meta dashboard manually.

**OAuth credential lifecycle primitives** - COMPLETE
- _Landed (feature `030`): three cross-cutting primitives 031 and any future
  OAuth plugin can compose. `oauthCredentialFields` is a zod `ZodRawShape` mixin
  in `@kizunu/api-contracts/shared` carrying `accessToken` + `refreshToken?` +
  `accessTokenExpiresAt?`. `EncryptedCredentialsService`
  (`@kizunu/nestjs-shared/modules/persistence/services/`, AES-256-GCM,
  base64 key from `APP_CREDENTIALS_ENCRYPTION_KEY`) wraps every write/read of
  `channel_accounts.credentials` and `connector_accounts.credentials` at the
  repo boundary; pre-030 plaintext rows continue to read transparently
  (envelope `alg` discriminator) so existing deployments upgrade without a data
  migration. `OAuthRefreshService` polls every channel-account row's decrypted
  credentials and calls the plugin's optional `refreshCredentials?(input)` hook
  when `accessTokenExpiresAt` is inside the buffer window; failures log + retry
  on the next tick. Pipedrive's static API token and Meta's standalone Cloud
  API system token continue unchanged. Closes the "Provider credentials are
  stored unencrypted" entry in `CONCERNS.md`._

**WhatsApp Coexistence: Embedded Signup + Coex webhooks** - COMPLETE
- _Landed (feature `031`): the customer-visible deliverable. `metaCredentialsSchema` is now
  a `z.discriminatedUnion` on `channelMode` — `cloud_api` (existing operator-paste path) and
  `coexistence` (the OAuth triplet from 030's `oauthCredentialFields` mixin). App-wide
  `meta.appId`/`meta.appSecret`/`meta.coexConfigId` config replaces per-row App credentials
  in the Coex branch (config defaults to `''` and the connect endpoint fails fast with
  `MetaCoexNotConfiguredException` when missing). New `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`
  endpoint runs `exchangeCodeForToken` (GET `/oauth/access_token` — no `redirect_uri`),
  pre-mints the row UUIDv7, runs the Meta plugin's Coex `onAccountCreated` branch (only the
  per-WABA `subscribed_apps` call, with `subscribed_fields=messages,smb_message_echoes,smb_app_state_sync`;
  Meta handles app-level during signup), and persists encrypted credentials. `parseMetaInbound`
  is now field-dispatched: `messages` keeps the existing path; `smb_message_echoes` parses
  echoes (swapping from/to so the routing key is the customer phone — feeds `MarkReplyUseCase`
  and pauses the cadence per E.4 but NOT advancing the freeform 24h window);
  `smb_app_state_sync` and `history` return `[]` (200-ack only, deferred to a future inbox
  slice). New `refreshCredentials` hook on the Meta plugin uses the 030 lifecycle — cloud_api
  passthrough; Coex calls `exchangeForRefreshedToken` (`grant_type=fb_exchange_token`).
  `apps/web` ships `/_app/workspace/connect-meta-coex` — script-loads the FB JS SDK, calls
  `FB.login` with the verified Coex `extras` (`featureType: 'whatsapp_business_app_onboarding'`,
  `sessionInfoVersion: '3'`), origin-validates postMessages from `*.facebook.com`, and posts
  the payload via the new typed `useConnectMetaCoex` hook._
- Onboarding-time checklist for the pilot customer (verified in research/context.md, section E):
  WA Business app v2.24.17+; minimum 7 days of active app usage; number not already linked to
  another Cloud API integration; not in Nigeria/South Africa (unsupported region as of March 2026).

---

## Phase 1.9 — Web frontend polish & doctrine

**Goal:** Take the v0.1 web app — which shipped as a Minimum UI — and rework it to
match a deliberate, documented frontend doctrine (ADR-007 + `.agents/rules/web-patterns.md`):
route-colocation under `routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`,
smart-page/dumb-form split, domain-named mutation hooks, and resource-dialog-first
CRUD. Each feature below is independent and self-contained.

**Web frontend remake** - COMPLETE
- _Landed (features `033`–`039`): the seven-part remake — sidebar shell + shared chrome
  (`033`), auth surface (`034`), dashboard + empty states (`035`), settings hub
  (`036`), cadence + template editor (`037`), journeys + engagement polish (`038`),
  and the power-user polish + command palette (`039`). PR #66 fixed a cmdk
  `Command`-root regression that only surfaced under Chrome validation._

**Web frontend layering doctrine (ADR-007)** - COMPLETE
- _Landed (feature `041`, PR #69): codified the doctrine — ADR-007 plus
  `.agents/rules/web-patterns.md` defining route-colocation (`routes/_app/<feature>/`),
  smart-page / dumb-form split, URL state via Zod schemas + `use-<feature>-search` hooks,
  `DataTable` + `TablePagination` composition, `ResourceDialog` / `DeleteResourceDialog`
  for modals, and the error-handling table. Introduced `ResourceDialog`,
  `DeleteResourceDialog`, and `FormError` primitives (built but not yet adopted by
  features — that's `044`)._

**Web feature folder colocation** - COMPLETE
- _Landed (feature `042`, PR #70): migrated every `apps/web/src/features/<feature>/`
  tree into route-colocated `routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`
  per ADR-007. The `features/` folder is gone; the legacy app-shell entry moved to
  `routes/_app/_shell/{app-shell,command}/` and the marketing tree to `routes/-marketing/`._

**API-client mutation hook reshape** - COMPLETE
- _Landed (feature `043`, PR #71): every `packages/api-client/src/**/use-*.ts`
  mutation hook now returns `{ <domainName>: mutate, ...rest }` per ADR-007 §8.
  All 29 call sites in `apps/web` updated to `<domainName>(input)` syntax. Zero
  `.mutate(` references against api-client mutation results remain. Hook-owned
  invalidation was already correct (pre-audit)._

**Resource dialog migration** - COMPLETE
- _Landed (feature `044`): hoxus-port polish on `ResourceDialog` (gains `size?: 'md'|'lg'`
  + `cancelLabel?: string`; action button switches to the new `Button.loading` spinner
  instead of swapping the label) and `DeleteResourceDialog` (gains a copy-to-clipboard
  resource-name button with `Copy ↔ Check` flip + optional `caseSensitive`); `Button`
  primitive gains a `loading?: boolean` (Phosphor `Spinner` + `animate-spin`, OR-merged
  with `disabled`). 13 inline CRUD call-sites migrated to trigger-button → dialog:
  settings/channels (Add channel account, Grant access), settings/connectors (Add CRM
  connector, Add entry trigger, Remove entry trigger), settings/members (Invite member
  with token-reveal success step, Deactivate, Pause journeys), settings/security (Revoke
  session, Revoke other sessions), workspace/cadences (New cadence in size='lg' dialog,
  New template, Remove cadence, Remove template). Forms are uniformly dumb (`{ formId,
  isPending, error, onSubmit }`); dialogs own mutation hooks + `getApiErrorMessage` →
  `<FormError>` + `toast.success`. Per-row destructive triggers use `DropdownMenu` +
  `DropdownMenuItem variant="destructive"`. Activate stays one-click (reversible).
  Out of scope (held): page-as-display surfaces (profile / workspace settings /
  billing), Meta Coex Embedded Signup flow (OAuth/SDK), brand-new UIs for unwired
  mutations (`useRevokeChannelAccess`, `useUpdateCadence`, `useUpdateTemplate`)._

**Forms RHF + zod doctrine + sweep** - COMPLETE
- _Landed (feature `045`): ADR-008 codifies the four load-bearing calls — RHF owns
  field state, the contract `*RequestSchema` is the validation source via
  `zodResolver`, the error surface splits field-level (`<FieldError id>` +
  `aria-invalid` / `aria-describedby`) from server-level (top `<FormError>` banner),
  and forms stay dumb (`{ formId, defaultValues?, isPending, onSubmit, error? }`).
  `.agents/rules/web-patterns.md` §3 fully rewritten with §3.a native-input recipe,
  §3.b `<Controller>` recipe for controlled components (LookupSelect/PluginSelect/
  CredentialFieldsInput), and §3.c derived-`formSchema` recipe (`.pick` for
  subsetting around `z.coerce`/`.default` input-vs-output divergence, `.extend` for
  path-param lift, `.superRefine`/`.transform` for UI-only rules). `react.md` §3
  gains a one-sentence carve-out pointing at web-patterns §3. All 10 forms migrated
  in this branch (no transition clause): invite-member (canonical example),
  login/signup/forgot-password/reset-password (auth split into smart-page +
  dumb-form, route file now owns useLogin/useRegister/etc. + PageHeader +
  navigation + the submit button via `<Button form={formId}>`), channel-account
  (Controller for PluginSelect + Controller for credentials map + setError for
  plugin-required), grant-channel-access (derived schema extends with `accountId`
  to lift the API path-param), connector-account (derived schema parses JSON
  credentials via .superRefine), entry-trigger + template (drop local
  `*FormValues` interfaces; consume the existing
  `CreateEntryTriggerRequestSchema`/`CreateTemplateRequestSchema`). `LabeledInput`
  deleted. Four new web unit specs cover the derived schemas: reset-password
  match rule, grant-channel-access path-lift, connector-account JSON parse,
  channel-account spec updated to await RHF's async resolver and assert
  field-level errors. `bun check` green (387 tests; every check-\* script passes;
  CI=1 lint 0w/0e)._

**Route-folder promotion + no-naked-container rule** - COMPLETE
- _Landed (feature `046`): every flat sub-route under `_app/settings/`,
  `_app/workspace/`, and `auth/` promoted to its own folder with its own
  `-components/`, `-dialogs/`, `-utils/` siblings. Two missing index
  redirects added (`auth/index.tsx` → `/auth/login`,
  `_app/settings/index.tsx` → `/settings/profile`) so neither `/auth` nor
  `/settings` lands on an empty layout shell. `journey-status-dot`
  graduated to `components/composed/` (consumed by both `workspace/journeys`
  and `workspace/-components/dashboard/`). Area-level `-components/` and
  `-utils/` retained only for genuinely cross-feature concerns
  (`auth/-components/auth-branding-panel.tsx` for `route.tsx`,
  `auth/-components/auth-error-block.tsx` for login + signup,
  `auth/-utils/login-error-copy.ts` for login + signup + reset-password,
  `workspace/-components/dashboard/` for `workspace/index.tsx`).
  `.agents/rules/web-patterns.md` §1 dropped the flat-file feature-routes
  carve-out and gained §1.5 "No naked container routes" (every URL-bearing
  folder either renders a page or redirects via `beforeLoad`; route groups
  `(area)/` and pathless layouts `_area/` are exempt). §9 hard rules and
  §10 new-feature checklist updated. 24 atomic commits across settings (8),
  workspace (5), auth (6), and docs (1+1+1). `bun check` green at every
  commit (383 tests; every check-\* script passes)._

---

## Phase 2.0 — Pilot delivery hardening

**Goal:** Close the documented High items in `.specs/codebase/CONCERNS.md`
("Dispatcher gaps: owner mapping, sendingWindow, template variables") that
block a real pilot from delivering. Without these, the v0.1 contract works
in tests but cannot run for a paying customer. Each feature is a discrete
slice; `047` unblocks the other two (no journey dispatches until owner
mapping resolves).

The first customer concretely needing this lands the doc
`~/Downloads/automacao-fup.md` — a 2-BDR Pipedrive→WhatsApp pilot that
matches the v0.1 reference use case point-for-point.

**CRM owner mapping** - PLANNED (feature `047`)
- Maps a Pipedrive `deal.user_id` to a Kizunu `User.id` so ingestion can
  set `lead.ownerUserId` and the dispatcher can resolve the right BDR's
  primary `ChannelAccess`.
- Auto-match by verified email + admin override
  (`.specs/features/047-crm-owner-mapping/context.md` C-01).
- New aggregate `MemberConnectorIdentity` keyed on
  `(membershipId, connectorAccountId, externalId)` (workspace-owned, FK
  cascades on membership delete).
- New `CRMConnector.fetchOwner(externalId, credentials)` method; Pipedrive
  implementation hits `GET /v1/users/{id}`.
- No new `LeadJourneyStatus` enum value — unresolved owners land in
  `error_state` with `errorReason = 'owner_not_mapped'` (or
  `owner_lookup_failed` when Pipedrive errors). Admin creating the matching
  mapping backfills `lead.ownerUserId` and resumes those journeys in one
  transaction.

**Template-variable resolution** - PLANNED (feature `048`)
- The dispatcher sends templates without filling `{{n}}` parameters. Meta
  rejects the send if the approved template declares variables. Required
  only if any of the pilot's 5 HSM templates carry variables (decided
  after Meta approval round).
- Resolves variables from `Lead` fields (`name`, `phone`, future custom
  fields) and the `LeadJourney` (current step ordinal, cadence name).

**Cadence sending window** - PLANNED (feature `049`)
- Engine respects `cadence.sendingWindow` (timezone + days + hours);
  dispatches outside the window slide `nextTouchAt` forward to the next
  valid slot rather than firing immediately.
- Pilot UX + WhatsApp rep risk (no 3am template sends).

**Pipedrive webhook HMAC verification** - DEFERRED (CONCERNS Medium)
- Keep the UUIDv7-as-shared-secret model for the first pilot; add HMAC
  when onboarding the second customer or when an audit demands it.

---

## Future Considerations (Phase 2+)

- Native CRM (deals, own pipeline, contacts)
- Top of funnel: forms, landing pages, enrichment, scoring
- Intelligence (AI): reply classification, touch generation, BDR coaching
- Paid cloud: managed hosting, multi-tenant, SSO, audit log, advanced RBAC, premium connectors
- Automatic lead reassignment; round-robin / load balancing across channels
