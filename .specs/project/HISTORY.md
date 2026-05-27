# History

Append-only changelog of shipped features and the architectural lessons each one
left behind. `ROADMAP.md` is the forward-looking artifact (current focus + Now /
Next / Later); this file is the rear-view mirror.

Features are grouped by the phase they shipped under and listed in feature-number
order within each phase. Per-feature `_Landed_` blurbs are migrated verbatim from
the original `ROADMAP.md` entries.

---

## v0.1 — Pilot end-to-end

**Goal:** A BDR moves a Pipedrive deal into a follow-up stage → a per-BDR WhatsApp
cadence fires → every touch logs a Pipedrive Activity → any reply pauses the
cadence and moves the deal → exhaustion marks the deal lost. Self-hostable via
Docker Compose.

All v0.1 feature lines shipped under features `002`–`020`. Before a *real* pilot
delivers, the hardening follow-ups documented in `.specs/codebase/CONCERNS.md`
close in Phases 2.0 / 2.1.

### Features

**Identity & Auth** — COMPLETE

- Home-grown `User` (email, password hash) + session table
- Login / logout, session expiry, CSRF, login rate-limit, password reset
- Auth boundary isolated from domain (no auth-library org/teams schema)
- _Backend landed (#13, #14). Auth method settled (email/password) and CSRF posture
  (`sameSite`-lax + CORS) + IP login rate-limit landed in feature `018` (ADR-006).
  Session expiry/revocation is enforced. **Password reset** landed in feature `020`:
  a `MailSender` boundary (v0.1 `ConsoleMailSender`) carries a single-use, hashed
  reset token out-of-band — never in the HTTP response — and a confirm revokes all
  the user's sessions. Swapping in a real mail transport landed later in feature `040`._

**Workspace & Membership** — COMPLETE

- `Workspace` and `Membership` (`role: admin | member`, `status: active | inactive`) as domain entities
- Admin user management: create, mark inactive, reassign leads
- _Backend use-cases landed (#13, #14); members admin UI in feature `013`. Lead
  reassignment + pausing an inactive owner's journeys landed in feature `019` (manual
  admin actions, per scope)._

**Channel plugin system + Meta/WhatsApp** — COMPLETE

- `ChannelPlugin` contract (`manifest`, `send`, `parseInbound`, `validate → Decision`) as a monorepo module
- `ChannelAccount` (workspace-owned instance) + `ChannelAccess` (`isPrimary` per user/plugin)
- Meta Cloud API via Coexistence: 24h-window vs. HSM template decision inside `validate`; credentials `waba_id`, `phone_number_id`, system token
- App-level inbound webhook with `hub.verify_token`; routes by `phone_number_id`
- _Slice 1 landed (feature `002`): frozen port + registry + ChannelAccount/ChannelAccess
  domain and CRUD, proven with a fake plugin._
- _Slice 2 landed (feature `003`): `MetaWhatsappPlugin` (validate 24h-window/HSM,
  parseInbound, send) registered into the registry. The app-level inbound webhook is
  deferred to the Engine slice, where its `LeadJourney` consumer lives._

**CRM connector + Pipedrive** — COMPLETE

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

**Cadence aggregate + Templates** — COMPLETE

- `Cadence` (entry trigger, ordered `Step`s, stop policy, hooks `onReply`/`onExhausted`/`onComplete`)
- `Step` (`order`, `delay`, `jitter`, `channelRef`, `template`); `Template` as HSM reference for Meta
- `Lead` (mirrored owner from Pipedrive), CRUD for cadences and templates
- _Templates landed (feature `005`): workspace-owned HSM-reference templates with CRUD._
- _Cadence aggregate landed (feature `006`): `Cadence` + ordered `Step`s + closed
  vocabulary hook actions + stop policy, transactional CRUD with step/template
  validation. `EntryTrigger` ships with the engine slice; `Lead` is mirrored during
  ingestion._

**Engine: scheduler + inbound** — COMPLETE

- In-process DB poller over `LeadJourney.nextTouchAt <= now`; respects `sendingWindow`, applies `jitter`
- `LeadJourney` state machine (`running → paused | replied | exhausted | stopped | error_state | paused_owner_inactive`)
- Pessimistic row lock (`SELECT … FOR UPDATE`) resolving the dispatch/reply race; `TouchAttempt` idempotency on `(leadJourneyId, stepOrder)`
- Channel resolution via `ChannelAccess` (`lead_owner` strategy, `isPrimary`); no channel → `error_state` with reason
- Inbound reply → `status = 'replied'` → `onReply` actions
- Closed-vocabulary actions: `move_stage`, `mark_lost`, `log_activity`, `notify_user`, `set_field`, `webhook_out`
- Inactive-membership journeys → `paused_owner_inactive` (manual bulk reassign)
- _Landed (feature `007`): the pure `LeadJourney` state machine (D1 transitions) and
  `EntryTrigger` CRUD (pipeline+stage → cadence). `LeadJourneyStatus`/`JourneyEvent`
  are derived const objects (ADR-002); the `lead_journeys` pgEnum conforms via
  `Assert<Equal>` when added._
- _Landed (feature `008`): ingestion — the `Lead` + `LeadJourney` tables and
  `StartJourneyUseCase`, driven by the public per-connector CRM webhook
  (`POST /webhooks/crm/:connectorAccountId`). A `lead.stage_entered` event with a
  matching trigger creates exactly one running journey. The `lead_journey_status`
  pgEnum conforms to `LeadJourneyStatus` via `Assert<Equal>`; an index on
  `(status, nextTouchAt)` backs the poller._
- _Landed (feature `009`): the dispatcher + in-process poller — row-locked per-journey
  dispatch, `TouchAttempt` idempotency, channel resolution (no channel → `error_state`),
  validate → send the template touch, CRM activity logging, advance with jitter, and
  exhaustion → `onExhausted` via the closed-vocabulary action executor. An in-process
  `setInterval` `JourneyPoller` (D5, disabled under `NODE_ENV=test`) ticks
  `dispatchDue`. `persistence/transaction.ts` types the tx executor threaded to repos._
- _Landed (feature `010`): inbound reply — the app-level Meta webhook
  (`hub.verify_token` verify + `phone_number_id` routing) and `MarkReplyUseCase`, which
  transitions a running journey → `replied` under the D1 row lock (serializing with
  the dispatcher) and runs `onReply` actions **after** commit (off the lock)._
- _Landed (feature `019`): `paused_owner_inactive` + bulk reassign — manual admin
  actions. `PauseOwnerJourneysUseCase` parks an owner's running journeys;
  `ReassignLeadsUseCase` re-owns an owner's leads and resumes their parked journeys.
  Engine admin endpoints `POST /workspaces/:id/owners/:userId/pause-journeys`
  and `POST /workspaces/:id/lead-reassignments` — no workspace↔engine cycle._

**Minimum UI** — COMPLETE (inbox deferred — see CONCERNS)

- Auth (login)
- Admin: user management, workspace channels (create/configure/grant access/webhook URL), Pipedrive connector mapping
- BDR: my channels (set primary), cadences & templates CRUD, inbox (filter by instance / my leads), journey list (active/paused/error)
- _Foundation: shadcn-first primitives baseline + convention (`.specs/features/001-shadcn-first-primitives/`).
  Primitives in `apps/web` originate from shadcn/ui via the shadcn skill, customized
  in-project; bespoke only when no primitive fits._
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
  cadence builder (ordered steps + onReply move-stage) + cadence list. The **inbox** is
  the only deferred screen (no inbound-message store — documented in CONCERNS)._

**REST + OpenAPI surface** — COMPLETE

- CRUD for every domain entity; OpenAPI from day one
- Authenticated public endpoints: CRM webhook ingestion + channel inbound (URL per `ChannelAccount`)
- _Landed (feature `011`): OpenAPI 3 document + Swagger UI at `/docs` (and `/docs-json`),
  built from the controllers + zod DTOs (`@nestjs/swagger` + nestjs-zod), every controller
  tagged by domain; plus the `GET /workspaces/:id/lead-journeys` list (status-filterable).
  The public CRM + Meta webhooks landed with the engine. Minor remaining CRUD gaps
  (connector update/delete, entry-trigger update) are documented, not yet built._

---

## Phase 1.5 — Differentiation

**Goal:** Prove the plugin system is real, not WhatsApp/Pipedrive in disguise.

**Declarative channel credential fields + generated account form** — COMPLETE

- _Landed (feature `021`): plugin manifests declare a `credentialFields` descriptor
  (key/label/type/required) beside the zod `configSchema`; the `channel-plugins`
  contract carries it and the web channel-account form renders generated,
  secret-masked inputs instead of a raw JSON textarea. Mirrors novu's shared
  credential-metadata pattern within the type-safe boundary; lowers the cost of
  onboarding the second channel. A plugin-local drift guard (`meta-credential-fields.spec.ts`)
  asserts descriptor keys equal `metaCredentialsSchema.shape` keys so the duplication
  can't rot. Same boundary-duplication precedent as `ChannelCapability`. Credentials
  remain unencrypted at this point (encryption arrives with feature `030`)._

Phase 1.5 also seeded "second channel", "second CRM", "first community plugin" as
later work; those remain in `ROADMAP.md` under Later.

---

## Phase 1.6 — Auth & identity enrichment

**Goal:** Harden the home-grown auth boundary for real self-host operation without
coupling to an auth library — building on the v0.1 Identity & Auth slice. Each
feature is a separate slice and keeps the auth boundary isolated from the domain.

**Self-host registration gate** — COMPLETE

- _Landed (feature `022`): `DISABLE_USER_REGISTRATION` env toggle (`z.stringbool`)
  makes `RegisterUserUseCase` throw a `422` `identity.registration-disabled` before
  any DB access; invite/accept-invite stays ungated by construction. Public
  `GET /auth/capabilities` (`{ registrationEnabled }`) drives the web `(auth)/signup`
  form-vs-disabled-notice. Surfaced in `apps/api/.env.example` +
  `deploy/docker-compose.yml`. Novu-style: no instance-admin role — the operator
  boots with the gate open, registers the first master user, then flips the
  toggle on to lock down public signup._

**Email verification** — COMPLETE

- _Landed (feature `023`): `RequestEmailVerificationUseCase` mints a single-use
  `email_verification` token and mails the verify link out-of-band (no-op when
  the user is missing or already verified); `ConfirmEmailVerificationUseCase`
  consumes it and sets `users.emailVerifiedAt` (invalid →
  `422 identity.invalid-verification-token`). Register composes the request use-case
  post-commit. `EmailVerificationController` exposes authed resend + public
  confirm. Web: an unverified banner in the app shell + a public `/verify-email`
  route. Soft posture for v0.1 (login never blocked; verification exposed via
  `me.emailVerifiedAt` for later hard-gating). Resend is authenticated
  (no enumeration)._

**Session management UX** — COMPLETE

- _Landed (feature `024`): `sessions.lastSeenAt` (migration `0008`) refreshed by
  the auth guard coalesced to ~5 min; `SessionRepository` list/touch/ownership-scoped
  revoke; `ListSessionsUseCase` (current flagged), `RevokeSessionUseCase`
  (foreign/missing id → `422 identity.session-not-found`),
  `RevokeOtherSessionsUseCase` (keeps current). `SessionController`
  (`GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions`).
  Web: a Security screen with per-row revoke + log-out-others._

**OAuth / SSO login** — COMPLETE

- _Landed (feature `025`): `OAuthProvider` port + `OAuthProviderRegistry` with
  `GithubOAuthProvider` (zod-parsed); `identities` table + nullable
  `users.passwordHash` (migration `0009`); `HandleOAuthCallbackUseCase` (existing
  identity → link by verified email → provision new, gated by
  `DISABLE_USER_REGISTRATION`); `OAuthController` with the state-cookie redirect
  flow; `GET /auth/capabilities` lists enabled providers; login-screen provider
  buttons. Extracted `SessionIssuer` + `UserProvisioningService` shared by
  register/login. Google/etc. are new providers behind the same port._

**Web `/auth/*` route prefix** — COMPLETE

- _Landed (feature `026`): the web auth pages moved from the pathless `(auth)`
  group to a real `/auth/*` prefix (`/auth/login`, `/auth/signup`,
  `/auth/verify-email`, `/auth/accept-invite/$token`); in-app redirects and the
  OAuth/verification link targets updated to match._

**SMTP mail transport (and Mailpit dev inbox)** — COMPLETE

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
  the local inbox. The auth branch `auth: user ? {user, pass} : undefined` is the
  bug-magnet: anonymous SMTP when `smtpUser` is empty (Mailpit dev path) versus
  authenticated when set (production); covered by focused unit tests at
  `__test__/unit/smtp-mail-sender.spec.ts`. Closes the CONCERNS §Medium
  "console mail logger" item._

---

## Phase 1.7 — Delivery & infra

**CI validation gate & repo governance** — COMPLETE

- _Landed (feature `027`, PR #47): CI now mirrors `scripts/check.sh`. `ci.yml` is
  an orchestrator calling reusables — `_quality` (`vp check` + the four `check-*`
  scripts), `_unit` (`unit`+`web`), and a parameterized `_db-tests`
  (`integration`|`e2e`; `postgres:16-alpine` service + `db:migrate`, bypassing the
  Docker-bound `db:test:setup`) — with a shared `coverage-summary` composite
  action. A single `Required (CI)` aggregator is the only branch-protection check,
  posts a sticky `ci-summary` comment, skips code jobs on docs-only diffs, and
  gates e2e to non-draft PRs. Plus `pr-title`, `deps-outdated`, and
  governance-as-code: `ruleset.json`, `CODEOWNERS`, `CODE_OF_CONDUCT.md`.
  Trunk-only (`master`). Follow-ups resolved: coverage tables render in the
  `ci-summary` comment (PR #51); the `master protection` ruleset is active —
  require PR + `Required (CI)` + `Lint PR title`, squash-only, no direct push
  (applied from `.github/ruleset.json`, PR #50)._

The deploy pipeline (feature `028`) discovery completed but the slice remains
**deferred** — blocked on where Kamal runs in CI + secrets, and on server
topology decisions. Carried forward in `ROADMAP.md` under Later.

---

## Phase 1.8 — WhatsApp Coexistence onboarding

**Goal:** Close the gap between the v0.1 description ("Meta Cloud API via
Coexistence") and what actually shipped — the v0.1 Meta plugin was **standalone
Cloud API**, not Coex. Phase 1.8 lands the real thing: customers keep using the
WhatsApp Business mobile app while kizunu drives outbound cadences alongside it,
onboarded through Meta's Embedded Signup flow.

**Source of truth:** [`.specs/research/whatsapp-coexistence/`](../research/whatsapp-coexistence/)
captures the Meta documentation, OSS reference implementations
([chatwoot/chatwoot](https://github.com/chatwoot/chatwoot/tree/c4a6a19e9be899c96fd2c1cbb3454b56b7ef76fc),
[evolution-foundation/evo-ai-crm-community](https://github.com/evolution-foundation/evo-ai-crm-community/tree/8d7bf198072fded000dd8c49c257097ed00ce554)),
and the verified webhook payload shapes under
[`research/whatsapp-coexistence/snippets/`](../research/whatsapp-coexistence/snippets/).
Refresh that doc before extending the Coex surface.

**Hard constraint:** Embedded Signup v2 deprecates **2026-10-15**. The three
features below built v4 from the start; no v2 fallback paths.

**Auto webhook subscription + per-account verify token** — COMPLETE

- _Landed (feature `029`): channel-account create now performs Meta's two-step
  subscription flow on its own — app-level `POST /{appId}/subscriptions` with
  an App Access Token (`{appId}|{appSecret}`), then per-WABA
  `POST /{wabaId}/subscribed_apps` with `override_callback_uri` and a
  server-generated per-channel verify token, surfaced through an optional
  `onAccountCreated` hook added to the `ChannelPlugin` port. The Meta inbound
  webhook moved from a single `/webhooks/meta` (env-wide token, body-routed by
  `phone_number_id`) to per-channel `/webhooks/meta/:channelAccountId` (token
  per-row, path-routed). `metaCredentialsSchema` gained `appId`, `appSecret`,
  and `verifyToken`; the env-wide `APP_META_VERIFY_TOKEN` was removed entirely.
  Failures surface as `422 channel.meta-subscription-failed` with the failing
  step + Meta error in the context. The web form hides server-generated fields
  via a new `serverGenerated` flag on the credential descriptor. Ships
  independent of Coex: any paste-credentials customer benefits immediately by
  no longer needing to configure the webhook in the Meta dashboard manually._

**OAuth credential lifecycle primitives** — COMPLETE

- _Landed (feature `030`): three cross-cutting primitives 031 and any future
  OAuth plugin can compose. `oauthCredentialFields` is a zod `ZodRawShape`
  mixin in `@kizunu/api-contracts/shared` carrying `accessToken` +
  `refreshToken?` + `accessTokenExpiresAt?`. `EncryptedCredentialsService`
  (`@kizunu/nestjs-shared/modules/persistence/services/`, AES-256-GCM, base64
  key from `APP_CREDENTIALS_ENCRYPTION_KEY`) wraps every write/read of
  `channel_accounts.credentials` and `connector_accounts.credentials` at the
  repo boundary; pre-030 plaintext rows continue to read transparently
  (envelope `alg` discriminator) so existing deployments upgrade without a
  data migration. `OAuthRefreshService` polls every channel-account row's
  decrypted credentials and calls the plugin's optional
  `refreshCredentials?(input)` hook when `accessTokenExpiresAt` is inside the
  buffer window; failures log + retry on the next tick. Pipedrive's static API
  token and Meta's standalone Cloud API system token continue unchanged. Closes
  the "Provider credentials are stored unencrypted" entry in `CONCERNS.md`._

**WhatsApp Coexistence: Embedded Signup + Coex webhooks** — COMPLETE

- _Landed (feature `031`): the customer-visible deliverable. `metaCredentialsSchema`
  is now a `z.discriminatedUnion` on `channelMode` — `cloud_api` (existing
  operator-paste path) and `coexistence` (the OAuth triplet from 030's
  `oauthCredentialFields` mixin). App-wide `meta.appId`/`meta.appSecret`/`meta.coexConfigId`
  config replaces per-row App credentials in the Coex branch (config defaults to
  `''` and the connect endpoint fails fast with `MetaCoexNotConfiguredException`
  when missing). New
  `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect` endpoint runs
  `exchangeCodeForToken` (GET `/oauth/access_token` — no `redirect_uri`),
  pre-mints the row UUIDv7, runs the Meta plugin's Coex `onAccountCreated`
  branch (only the per-WABA `subscribed_apps` call, with
  `subscribed_fields=messages,smb_message_echoes,smb_app_state_sync`; Meta
  handles app-level during signup), and persists encrypted credentials.
  `parseMetaInbound` is now field-dispatched: `messages` keeps the existing
  path; `smb_message_echoes` parses echoes (swapping from/to so the routing
  key is the customer phone — feeds `MarkReplyUseCase` and pauses the cadence
  per E.4 but NOT advancing the freeform 24h window); `smb_app_state_sync`
  and `history` return `[]` (200-ack only, deferred to a future inbox slice).
  New `refreshCredentials` hook on the Meta plugin uses the 030 lifecycle —
  cloud_api passthrough; Coex calls `exchangeForRefreshedToken`
  (`grant_type=fb_exchange_token`). `apps/web` ships
  `/_app/workspace/connect-meta-coex` — script-loads the FB JS SDK, calls
  `FB.login` with the verified Coex `extras`
  (`featureType: 'whatsapp_business_app_onboarding'`,
  `sessionInfoVersion: '3'`), origin-validates postMessages from
  `*.facebook.com`, and posts the payload via the new typed
  `useConnectMetaCoex` hook. Onboarding-time checklist for the pilot
  customer (verified in research/context.md, section E): WA Business app
  v2.24.17+; minimum 7 days of active app usage; number not already linked
  to another Cloud API integration; not in Nigeria/South Africa (unsupported
  region as of March 2026)._

**Coex becomes a second registered channel plugin** — COMPLETE

- _Landed (feature `058`): splits the Meta WhatsApp integration into two
  registered plugins: `meta-whatsapp` (Cloud API operator-paste, unchanged)
  and `meta-whatsapp-coex` (Embedded Signup OAuth, sharing
  send/parseInbound/directory/refresh with the Cloud API plugin). Closes the
  discoverability gap where Coex lived only at `/workspace/connect-meta-coex`:
  the New Channel dialog now lists both options, and the plugin manifest
  gains a typed `connect: { kind: 'credentials' } | { kind: 'oauth',
  provider: 'meta-coex' }` descriptor that drives the dialog body. A
  one-shot data migration flips stored coexistence rows from
  `pluginId='meta-whatsapp'` to `'meta-whatsapp-coex'`; the Meta webhook
  controller drops its hard-coded plugin id and dispatches by the row's
  actual id. `/workspace/connect-meta-coex` becomes a redirect to
  `/settings/channels?addCoex=1` to keep bookmarked URLs working._

---

## Phase 1.9 — Web frontend polish & doctrine

**Goal:** Take the v0.1 web app — which shipped as a Minimum UI — and rework it
to match a deliberate, documented frontend doctrine (ADR-007 +
`.agents/rules/web-patterns.md`): route-colocation under
`routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`, smart-page /
dumb-form split, domain-named mutation hooks, resource-dialog-first CRUD.

**Enum vocabulary rule** — COMPLETE

- _Landed (feature `032`): `.agents/rules/enums.md` codifies ADR-002's
  const-object + derived-type pattern as the project's enforced default for
  closed vocabularies, with a `PayloadMap + Handler<T extends X>` extension
  for type-discriminated dispatch and two named exceptions — React
  component-prop variants and internal narrowings of well-known external
  vocabularies like HTTP verbs. AGENTS.md § Conventions and rules now lists
  it alongside conventions/code-standards/http/react/test. Four bare-union
  vocabularies promoted in the same PR: `MetaSubscriptionStep` and
  `MetaConnectStep` split into their own files;
  `ChannelCredentialFieldType` and `ChannelCapability` promoted in place;
  manifest entries and throw sites updated to named values. Wire-payload test
  assertions on `{ step: 'app-subscription' }` etc. stay literal — they
  verify the serialized contract, not the call-site identifier. No script
  enforcement (rule-only); five existing bare unions stay as-is under the
  named exceptions._

**Web frontend remake** — COMPLETE

- _Landed (features `033`–`039`): the seven-part remake — sidebar shell +
  shared chrome (`033`), auth surface (`034`), dashboard + empty states
  (`035`), settings hub (`036`), cadence + template editor (`037`),
  journeys + engagement polish (`038`), and the power-user polish + command
  palette (`039`). PR #66 fixed a cmdk `Command`-root regression that only
  surfaced under Chrome validation._

**Web frontend layering doctrine (ADR-007)** — COMPLETE

- _Landed (feature `041`, PR #69): codified the doctrine — ADR-007 plus
  `.agents/rules/web-patterns.md` defining route-colocation
  (`routes/_app/<feature>/`), smart-page / dumb-form split, URL state via
  Zod schemas + `use-<feature>-search` hooks, `DataTable` +
  `TablePagination` composition, `ResourceDialog` / `DeleteResourceDialog`
  for modals, and the error-handling table. Introduced `ResourceDialog`,
  `DeleteResourceDialog`, and `FormError` primitives (built but not yet
  adopted by features — that's `044`)._

**Web feature folder colocation** — COMPLETE

- _Landed (feature `042`, PR #70): migrated every
  `apps/web/src/features/<feature>/` tree into route-colocated
  `routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/` per ADR-007.
  The `features/` folder is gone; the legacy app-shell entry moved to
  `routes/_app/_shell/{app-shell,command}/` and the marketing tree to
  `routes/-marketing/`._

**API-client mutation hook reshape** — COMPLETE

- _Landed (feature `043`, PR #71): every
  `packages/api-client/src/**/use-*.ts` mutation hook now returns
  `{ <domainName>: mutate, ...rest }` per ADR-007 §8. All 29 call sites in
  `apps/web` updated to `<domainName>(input)` syntax. Zero `.mutate(`
  references against api-client mutation results remain. Hook-owned
  invalidation was already correct (pre-audit)._

**Resource dialog migration** — COMPLETE

- _Landed (feature `044`): hoxus-port polish on `ResourceDialog` (gains
  `size?: 'md'|'lg'` + `cancelLabel?: string`; action button switches to
  the new `Button.loading` spinner instead of swapping the label) and
  `DeleteResourceDialog` (gains a copy-to-clipboard resource-name button
  with `Copy ↔ Check` flip + optional `caseSensitive`); `Button`
  primitive gains a `loading?: boolean` (Phosphor `Spinner` +
  `animate-spin`, OR-merged with `disabled`). 13 inline CRUD call-sites
  migrated to trigger-button → dialog: settings/channels, settings/connectors,
  settings/members (with token-reveal success step), settings/security,
  workspace/cadences. Forms are uniformly dumb (`{ formId, isPending,
  error, onSubmit }`); dialogs own mutation hooks + `getApiErrorMessage` →
  `<FormError>` + `toast.success`. Per-row destructive triggers use
  `DropdownMenu` + `DropdownMenuItem variant="destructive"`. Activate stays
  one-click (reversible). Thermo-nuclear review on the initial migration
  surfaced two blockers + three structural concerns + several smaller
  findings, all fixed in-PR. (1) `useMutationDialog`
  (`@kizunu/web/lib/use-mutation-dialog`) names the per-wrapper pattern —
  owns the `apiError` state, the `clear-on-close` `useEffect`, and the
  `captureError` → `getApiErrorMessage` mapping. Every dialog wrapper
  collapses to ~25 lines focused on hook + form + labels.
  (2) `useCopyToClipboard` (`@kizunu/web/lib/use-copy-to-clipboard`)
  replaces the two inline copy-button implementations; both had a latent
  setTimeout-leak-on-unmount bug the hook closes via a `useRef` +
  `useEffect` cleanup. (3) Every dialog wrapper now takes
  `{ ...resource?, open, onOpenChange }` — the `onClose`-only variant is
  gone; parents do `Boolean(deleting)` + `(next) => !next && setDeleting(null)`
  per `web-patterns.md` §6. (4) Form-validity feedback restored.
  (5) `InviteMemberDialog` splits into form-only + success-only with the
  copy-token UI; `MembersPage` owns `lastInvitation` and renders both as
  siblings. (6) Dead `ChannelsManager`/`MembersManager` wrappers deleted;
  `MembersTable` is now self-fetching. (7) `EntryTriggersTable` joins
  `useCadences` to display "stage X → Cadence Y". (8) Activate one-click
  row action gets a `comments.md` §2-compliant `// Why:` comment.
  (9) `pause-owner-journeys` toast strips the trailing period.
  (10) `web-patterns.md` §1 gained a flat-file feature-route exception
  clause and §6 explicitly references `useMutationDialog`._

**Forms RHF + zod doctrine + sweep** — COMPLETE

- _Landed (feature `045`): ADR-008 codifies the four load-bearing calls — RHF
  owns field state, the contract `*RequestSchema` is the validation source
  via `zodResolver`, the error surface splits field-level (`<FieldError id>`
  + `aria-invalid` / `aria-describedby`) from server-level (top
  `<FormError>` banner), and forms stay dumb (`{ formId, defaultValues?,
  isPending, onSubmit, error? }`). `.agents/rules/web-patterns.md` §3 fully
  rewritten with §3.a native-input recipe, §3.b `<Controller>` recipe for
  controlled components (LookupSelect/PluginSelect/CredentialFieldsInput),
  and §3.c derived-`formSchema` recipe (`.pick` for subsetting around
  `z.coerce`/`.default` input-vs-output divergence, `.extend` for path-param
  lift, `.superRefine`/`.transform` for UI-only rules). `react.md` §3 gains
  a one-sentence carve-out pointing at web-patterns §3. All 10 forms
  migrated in this branch (no transition clause): invite-member (canonical
  example), login/signup/forgot-password/reset-password (auth split into
  smart-page + dumb-form; route file now owns useLogin/useRegister/etc. +
  PageHeader + navigation + the submit button via `<Button form={formId}>`),
  channel-account (Controller for PluginSelect + Controller for credentials
  map + setError for plugin-required), grant-channel-access (derived schema
  extends with `accountId` to lift the API path-param), connector-account
  (derived schema parses JSON credentials via .superRefine), entry-trigger +
  template (drop local `*FormValues` interfaces; consume the existing
  `CreateEntryTriggerRequestSchema`/`CreateTemplateRequestSchema`).
  `LabeledInput` deleted. Four new web unit specs cover the derived schemas:
  reset-password match rule, grant-channel-access path-lift, connector-account
  JSON parse, channel-account spec updated to await RHF's async resolver and
  assert field-level errors. `bun check` green (387 tests; every check-\*
  script passes; CI=1 lint 0w/0e)._

**Route-folder promotion + no-naked-container rule** — COMPLETE

- _Landed (feature `046`): every flat sub-route under `_app/settings/`,
  `_app/workspace/`, and `auth/` promoted to its own folder with its own
  `-components/`, `-dialogs/`, `-utils/` siblings. Two missing index
  redirects added (`auth/index.tsx` → `/auth/login`,
  `_app/settings/index.tsx` → `/settings/profile`) so neither `/auth` nor
  `/settings` lands on an empty layout shell. `journey-status-dot`
  graduated to `components/composed/` (consumed by both
  `workspace/journeys` and `workspace/-components/dashboard/`). Area-level
  `-components/` and `-utils/` retained only for genuinely cross-feature
  concerns (`auth/-components/auth-branding-panel.tsx` for `route.tsx`,
  `auth/-components/auth-error-block.tsx` for login + signup,
  `auth/-utils/login-error-copy.ts` for login + signup + reset-password,
  `workspace/-components/dashboard/` for `workspace/index.tsx`).
  `.agents/rules/web-patterns.md` §1 dropped the flat-file feature-routes
  carve-out and gained §1.5 "No naked container routes" (every URL-bearing
  folder either renders a page or redirects via `beforeLoad`; route groups
  `(area)/` and pathless layouts `_area/` are exempt). §9 hard rules and
  §10 new-feature checklist updated. 24 atomic commits across settings (8),
  workspace (5), auth (6), and docs (1+1+1). `bun check` green at every
  commit (383 tests; every check-\* script passes). Lesson: when adopting a
  layout rule, codify the "no escape hatch" version on day one — the
  original flat-file carve-out was meant to be temporary and survived three
  feature cycles before this sweep closed it._

---

## Phase 2.0 — Pilot delivery hardening

**Goal:** Close the documented High items in `.specs/codebase/CONCERNS.md`
("Dispatcher gaps: owner mapping, sendingWindow, template variables") that
block a real pilot from delivering. Without these, the v0.1 contract works in
tests but cannot run for a paying customer. Each feature is a discrete slice;
`047` unblocks the other two (no journey dispatches until owner mapping
resolves).

The first customer concretely needing this landed the doc
`~/Downloads/automacao-fup.md` — a 2-BDR Pipedrive→WhatsApp pilot that matches
the v0.1 reference use case point-for-point.

**CRM owner mapping** — COMPLETE

- _Landed (feature `047`): closes the owner-mapping sub-bullet of the
  Dispatcher gaps HIGH item in CONCERNS. New workspace-owned
  `MemberConnectorIdentity` aggregate keyed `(membershipId,
  connectorAccountId, externalId)` with two unique indexes (one externalId
  per account; one externalId per member per account). New optional
  `CRMConnector.fetchOwner?` method; Pipedrive implements via
  `GET /v1/users/{id}` with 404→null. `ResolveOwnerService` composes
  mapping lookup + connector fetchOwner + verified-active email match +
  auto-create (createdBy `'auto:email'`, `sourceEmail` audited);
  `LeadOwnerBackfillService` runs lead-update + journey-resume in one
  transaction when admin creates the mapping. New `LeadJourneyErrorReason`
  const object + `lead_journeys.errorReason` varchar(80) column (free
  string so plugins can emit their own reasons; initial values
  `no_channel`, `template_required`, `owner_not_mapped`,
  `owner_lookup_failed`). Migration `0010`. Admin REST CRUD at
  `/workspaces/:id/connector-accounts/:accountId/identities` under
  `WorkspaceAdminGuard`; e2e covers happy paths + 422
  `owner.mapping-conflict`. API-client hooks landed; web admin UI deferred
  (auto-match by verified email covers the 2-BDR pilot without admin clicks).
  Module wiring uses `forwardRef` on BOTH ends of the engine↔crm cycle
  (engine consumes `CrmConnectorRegistry`+`ResolveOwnerService`; crm
  consumes engine repos for backfill)._

**Template-variable resolution** — COMPLETE

- _Landed (feature `048`): closes the template-variables sub-bullet of the
  Dispatcher gaps HIGH item in CONCERNS. New `TemplateVariableResolver`
  (closed vocabulary: `leadFirstName` (first whitespace-delimited token of
  `name`), `leadName`, `leadPhone`, `ownerExternalId`) with two
  engine-internal exceptions (`TemplateVariableUnresolvedException` for
  declared-but-empty values; `TemplateVariableUnknownException` for unknown
  names) — both carry the variable name. Two new entries on
  `LeadJourneyErrorReason` (`TemplateVariableMissing`,
  `TemplateVariableUnknown`). `JourneyDispatcher.dispatchStep` now performs
  the template lookup (moved up from sendStep), calls the resolver if
  `template.variables` is non-empty, and on either exception records the
  touch attempt as failed (`<reason>:<variableName>` for traceability)
  before parking the journey via the standard `errorOut` seam.
  `LockedJourney`'s projection widens by one column (`leadName: leads.name`)
  so the resolver has the personalized value at lock time — no second
  round-trip. `EngineModule.providers` registers the resolver. The Meta
  plugin's existing variable-mapping path (`Object.values → parameters in
  insertion order`) lives behind two new focused unit tests that lock the
  positional-order contract against the named-Record input. No schema change._

**Cadence sending window** — COMPLETE

- _Landed (feature `049`): closes the `sendingWindow` sub-bullet of the
  Dispatcher gaps HIGH item — and thus completes the full HIGH item
  alongside `047` + `048`. New `SendingWindow` domain (timezone + days +
  minute-of-day bounds) + pure `slideToWindow` / `isWithinWindow` helpers
  using native `Intl.DateTimeFormat` (no date-fns dep) for TZ-aware
  day-of-week + minute-of-day extraction; `slideToWindow` is a brute-force
  minute-by-minute scan capped at 7 days (under 10ms worst case, correct
  across DST transitions). Migration `0011` adds a nullable
  `cadences.sending_window` jsonb column; existing cadences keep always-on
  behavior. `SendingWindowSchema` (zod) validates IANA TZ via
  `Intl.DateTimeFormat(...).resolvedOptions().timeZone === input` and
  rejects cross-midnight + zero-day + reversed-minute shapes; surfaces as
  `422 cadence.invalid-sending-window` on the create/update endpoints.
  Dispatcher slides `nextTouchAt` forward when `now` falls outside the
  window without a state-machine event (journey stays `running`). Web
  preset chooser deferred to a follow-up; the API accepts the field today._

**CRM webhook token verification** — COMPLETE

- _Landed (feature `053`): closes the request-source half of the "CRM
  webhook authenticates only by an unguessable URL" Medium item in CONCERNS
  (the `processed_events` idempotency sub-bullet remains as later).
  `CreateConnectorAccountUseCase` strips any client-supplied `webhookToken`
  from the request, validates the rest through the connector's
  `configSchema`, then enriches with a fresh 32-byte hex token from
  `node:crypto.randomBytes`. The token lives in the encrypted credentials
  JSONB so the at-rest encryption from feature 030 wraps it for free.
  `CrmWebhookController.receive` adds a `@Query('token')` param + a small
  `readWebhookToken` reader; when the stored value is present it throws
  `ForbiddenException` on mismatch, when absent (pre-053 row) verification
  is skipped — backward-compatible. `pipedriveCredentialsSchema` accepts
  optional `webhookToken` (read-side tolerance only; client input is
  stripped by the use case). E2E spec covers three branches (missing token
  → 403, wrong token → 403, legacy account → 200)._

**Connector lookups** — COMPLETE

- _Landed (feature `054`): replaces raw external-ID inputs with labeled
  provider-backed pickers across the connector + cadence surfaces.
  Generalized optional `directory(input)` capability + `manifest.directoryResources`
  on both `CRMConnector` and `ChannelPlugin` so future providers
  (HubSpot, Telegram) slot in without touching the controller. New
  `_shared/directory/` module: `DirectoryCacheService` (in-process, 60s
  default ttl, workspace-scoped cache key, lazy eviction) + five typed
  exceptions (`connector.directory-unsupported`, `token-expired`,
  `rate-limited`, `directory-failed`, `directory-params-invalid`).
  Pipedrive ships `users`/`pipelines`/`stages`/`fields` resources; Meta
  ships `templates` (server-side `status=APPROVED`, 30s ttl) /
  `phoneNumbers`. New endpoints
  `GET /workspaces/:id/connector-accounts/:aid/directory/:resource` and
  `GET /workspaces/:id/channel-accounts/:aid/directory/:resource` behind
  `WorkspaceAdminGuard`. Typed `useDirectory*` hook family with the shared
  `useDirectory` helper mapping `code: 'connector.token-expired'` into a
  `needsReconnect` flag. New composed primitive
  `ReconnectConnectorEmptyState`. Web surfaces swapped: member-identity
  user picker, entry-trigger cascading pipeline+stage pickers, cadence
  template-form Meta template picker (auto-fills language). Coex
  phone-number picker + custom-field UI swap deferred — tracked in
  CONCERNS._

**Email-verification CTAs fix** — COMPLETE

- _Landed (feature `055`): removes the dead-end "Open verify page" link
  from `EmailVerificationBanner` and the matching "Verify" button on
  `settings/profile`'s email row (both used to navigate to
  `/auth/verify-email?token=` and short-circuit to the panel's "missing
  token" error). Replaces the profile row CTA with an in-context Resend
  email button wired to `useResendEmailVerification`; the verify panel's
  error state swaps "Request a new link" → `/auth/forgot-password` for a
  Resend email button when signed in, or a "Back to sign in" link when
  signed out._

**Channel credentials zod builder** — COMPLETE

- _Landed (feature `056`): removes the `unknown`/re-parse pattern from the
  channel plugin port by making `ChannelPlugin<S extends ZodTypeAny>` and
  its manifest generic on the credentials schema. A new
  `defineChannelPlugin(spec)` factory captures `S` via inference; the
  registry exposes typed bridges (`send`, `parseInbound`, `directory`,
  `refreshCredentials`, `onAccountCreated`) so plugin methods receive
  already-parsed `z.infer<S>`. `credentialFields` is **derived** from the
  schema via a new shared walker in
  `@kizunu/api-contracts/shared/credentials/` that reads zod v4 `.meta()`
  annotations and supports flat `ZodObject` and `z.discriminatedUnion`
  shapes (proven against a Pipedrive-shaped fixture for Feature 057
  readiness). Meta credential schemas move to
  `@kizunu/api-contracts/channel/`; the web form validates with the same
  `zodResolver` and `hasRequiredCredentials` / `z.record(z.string(),
  z.unknown())` go away. Sets up the foundation Feature 057 reuses unchanged._

**Connector credentials zod builder** — COMPLETE

- _Landed (feature `057`): applies the channel-port refactor from 056 to
  the CRM connector port. CRMConnector becomes generic on its Zod schema
  via defineCrmConnector, every connector method receives z.infer<S>
  typed credentials, and CrmConnectorRegistry exposes typed-bridge methods
  so use-cases stop calling connector.X(..., raw) directly.
  pipedriveCredentialsSchema moves to @kizunu/api-contracts/crm with
  .register() annotations against the shared credentialFieldRegistry. New
  GET /connectors endpoint mirrors GET /channel-plugins. The web
  connectors form drops its JSON textarea and uses the same
  CredentialFieldsInput + zodResolver wiring channels uses. Reuses the
  @kizunu/api-contracts/shared/credentials/ foundation 056 introduced —
  no changes to the walker, registry, CredentialField shape, or
  .register() pattern._

---

## Phase 2.1 — v1.0 pilot-plus customer fit

**Goal:** Deliver a customer-fit v1.0 for the first Pipedrive + WhatsApp
Coexistence pilot: not just the engine path, but the operational controls
around it. v1.0 must let an operator set up the pilot, safely launch it, audit
what happened, pause or resume when something is wrong, recover from errors,
and prove to the customer that kizunu will not keep touching a lead after a
reply.

**Definition of v1.0:** One customer workspace can run the full FUP automation
with Pipedrive as source of truth and WhatsApp Coex as the send channel. The
product supports guided setup, token-first Pipedrive connection, BDR/channel
readiness, per-BDR WhatsApp number routing, 5-step cadence configuration,
reply task handoff, lost handling, safe launch checks, pause/resume controls,
audit timeline, reachable HTTPS webhooks, and a live pilot acceptance run.

**Token-first Pipedrive connector setup** — COMPLETE

- _Landed (feature `059`): the CRM connector port mirrors the
  channel-plugin pattern from features 029/031/056 — `inputSchema?` on the
  manifest + `prepareCredentials?` hook on the connector. Pipedrive ships
  an `inputSchema` (apiToken required, companyDomain/activityType/phoneFieldKey
  optional, webhookToken absent) plus a `prepareCredentials` that calls
  `GET https://api.pipedrive.com/v1/users/me` and derives `companyDomain`
  when omitted. `CrmConnectorRegistry.prepareCredentials(id, raw)` is the
  new seam; `CreateConnectorAccountUseCase` calls it before persistence.
  Two new 422 errors — `crm.token-invalid` (401/403 from /users/me) and
  `crm.company-domain-unresolved` (200 with no domain). Web form splits
  the Pipedrive fields into a primary level (Name + API token) and a
  `<details>` "Advanced settings" disclosure (Company domain override,
  Activity type, Phone field key); `connector-client-schemas.ts` now plugs
  `pipedriveCredentialsInputSchema` into `zodResolver`. Existing manual
  curl with `companyDomain` provided is preserved end-to-end._

**Pipedrive connector health check** — COMPLETE

- _Landed (feature `060`): new `CRMConnector.checkHealth?` hook (mirrors
  the `directory?` shape) plus `CrmConnectorRegistry.checkHealth(id, raw)`.
  Pipedrive ships `runPipedriveHealth` which issues `/users/me`,
  `/pipelines`, `/stages`, `/dealFields` in parallel via `Promise.all` and
  adds a synchronous `webhookToken` presence check. Token rejection
  collapses overall to `unreachable`; otherwise any per-check fail goes to
  `degraded`. `GET /workspaces/:id/connector-accounts/:accountId/health`
  surfaces `{overall, checks}` (closed vocabularies declared as const-object
  + derived type per enums.md §1). Web settings/connectors gains a
  Connectors card with a per-row `ConnectorHealthPill` (composed primitive)
  + tooltip listing failing checks + manual refresh button._

**WhatsApp CoEx setup readiness** — COMPLETE

- _Landed (feature `061`): mirrors 060's pattern at the channel-plugin
  port. New `ChannelPlugin.checkHealth?` hook and
  `ChannelPluginRegistry.checkHealth(id, raw)` seam. The Meta plugin
  (both Cloud API and Coex) ships `runMetaHealth`: `/me` +
  `/{phoneNumberId}` in parallel, synchronous `verifyToken` check, plus a
  Coex-only `expiry` check when `accessTokenExpiresAt` is inside the
  5-min refresh buffer. New
  `GET /workspaces/:id/channel-accounts/:accountId/health` endpoint; the
  `ConnectorHealth` types are reused as a generic health envelope. Web
  `ConnectorHealthPill` is renamed to `ResourceHealthPill` and consumed
  by both the connector and channel tables. Per-BDR primary-channel-access
  check is deferred to feature `062`; app-wide Meta config presence is
  deferred to feature `067` (safe-launch readiness gate)._

**Per-BDR WhatsApp number routing** — COMPLETE

- _Landed (feature `062`): new lightweight `RoutingModule` houses
  `GetRoutingReadinessUseCase` and `GET /workspaces/:id/routing-readiness`.
  The endpoint returns a flat list of members with per-member flags
  `hasWhatsappAccess`, `hasPrimaryWhatsappChannel`, and
  `mappedConnectorAccountIds`. The dispatcher's no-fallback invariant
  (`ChannelAccessRepository.findPrimaryAccount` returns only the requested
  user's primary) is now locked behind two focused integration specs so a
  future refactor cannot silently route through another BDR's channel. Web
  settings/members gains a "Routing readiness" card listing each active
  member as Ready / Missing primary / No channel access._

**Provider setup wizard shell** — COMPLETE

- _Landed (feature `063`): new `/_app/setup` route renders six pilot steps
  with status badges (Done / Not started / Checking) derived client-side
  from existing list endpoints — connectors, channels, routing readiness,
  templates, cadences, entry triggers. Each row links to the settings page
  that owns the data. Sidebar gains a "Setup" entry. No new endpoints, no
  schema change._

**Wizard inline actions (CRM/trigger, channel/BDR, templates)** — COMPLETE

- _Landed (features `064`–`066`, single PR): each pending wizard step now
  renders an inline "Add …" button that opens the existing CRUD dialog
  inside the wizard. All forms already use labeled provider pickers (no
  raw IDs) from features `054` + `059` — connector form's primary input
  is the API token, entry-trigger picks pipeline+stage via cascading
  dropdowns. Wizard route owns a single `openDialog` state and renders
  five dialogs (connector, channel, template, cadence, trigger) so the
  operator never leaves `/_app/setup` while configuring. The "Add channel"
  trigger opens the existing channel-account dialog (supports both
  cloud_api and Coex modes); BDR access grants stay on `/settings/channels`
  (the dialog covers create + access in one flow). The "New template"
  trigger opens the existing template dialog which picks an approved Meta
  template via the directory picker added in `054`._

**Safe launch readiness gate** — COMPLETE

- _Landed (feature `067`): the `/setup` wizard renders a readiness banner
  above the checklist computed from the same six step statuses. "All
  systems ready" (green) when every step is Done; "Not ready" (amber)
  otherwise; neutral "Checking readiness…" while underlying queries load.
  The deeper Pipedrive-token + Coex-channel + template-variables-resolve
  checks live behind the per-row health endpoints from features
  `060`/`061`/`062`. A real "block trigger activation" gate is deferred
  until triggers gain an activate/pause toggle (separate slice)._

**Cadence v1 action builder** — COMPLETE

- _Landed (feature `068`, batched with `069`): cadence builder gains three
  new fields — "On reply: BDR task subject" + "On reply: BDR task note"
  wire a `log_activity` action (`activityType: 'task'`) alongside the
  existing `move_stage`; "On exhausted: mark lost reason" wires a
  `mark_lost` action. `buildCadenceRequest` now takes the new
  `BuildCadenceInput` shape; nine unit specs cover every branch._

**Cadence preview and safety review** — COMPLETE

- _Landed (feature `069`, batched with `068`): new `CadencePreview`
  composed primitive renders below the form showing computed step count +
  total delay, sending-window summary, onReply / onExhausted action list,
  BDR channel strategy. Live preview updates as the operator types — no
  save round-trip._

**Owner mapping recovery UI** — COMPLETE

- _Landed (feature `070`): the member-identities card on
  `/settings/connectors` (introduced in feature `047`, extended with
  labeled Pipedrive-user pickers in `054`) gains an "Unmapped" summary.
  `UnmappedSummary` cross-references the Pipedrive `users` directory
  against the workspace's `member-connector-identities` and renders "N
  unmapped" or "Every Pipedrive user is mapped". Fix actions remain the
  existing "Add identity" dialog._

**Journey error reason read model** — COMPLETE

- _Landed (feature `071`): the `GET /workspaces/:id/lead-journeys`
  response now carries `errorReason` per journey (already stored on
  `lead_journeys` since feature `047`). `LeadJourneySummary` widens by
  one column; the controller projection and
  `ListLeadJourneysResponseSchema` contract move in lockstep. Web
  journeys page gains an "Error reason" column in amber-on-muted. The
  matching recovery web surface (feature `072`) uses this field for
  fix-link routing. Owner/channel/template **context** + **next recovery
  action** are deferred — the raw reason string is enough for feature
  `072`'s hard-coded recovery table._

**Journey recovery web surface** — COMPLETE

- _Landed (feature `072`): new `JourneyErrorCell` composed primitive
  maps each `errorReason` to a human label + a "Fix it →" link. Six
  reasons mapped from `LeadJourneyErrorReason` plus the
  `template_variable_*` variants which surface the variable name inline.
  Unknown reasons fall back to "Provider failure" → channels._

**Pilot dry-run and selected-deal test** — COMPLETE

- _Landed (feature `073`, batched with `074`): new
  `POST /workspaces/:id/connector-accounts/:accountId/dry-run` endpoint
  takes `{ externalDealId }` and returns a `ConnectorHealth` report
  covering five checks: `dealFetch` (connector.fetchLead), `ownerExternal`
  (lead has ownerExternalId), `ownerResolved` (ResolveOwnerService from
  047), `phone`, `primaryChannel` (findPrimaryAccount across the two
  Meta plugin ids). The endpoint runs every step that a live dispatch
  would except `plugin.send` — so the operator can validate a deal
  without sending a stray touch._

**Pilot dry-run UI** — COMPLETE

- _Landed (feature `074`, batched with `073`): the `/setup` wizard gains
  a "Dry run a deal" card. The operator picks a connector account
  (single-account workspaces skip the picker), types a Pipedrive deal id,
  and clicks Run dry-run. Result renders as a `ResourceHealthPill` plus a
  per-check list with status colored green/amber and an optional detail
  line._

**Pause, resume, and emergency stop controls** — COMPLETE

- _Landed (feature `075`): four new admin endpoints behind
  `WorkspaceAdminGuard` —
  `POST /workspaces/:id/lead-journeys/:journeyId/{pause,resume,stop}` and
  `POST /workspaces/:id/lead-journeys/pause-all`. `ControlJourneyUseCase`
  reuses the existing D1 transition table; resume schedules `nextTouchAt=now`
  so the dispatcher picks the journey up on the next tick.
  `WorkspacePauseAllUseCase` flips every running journey in the workspace
  to `paused` in one SQL update. Web journeys page gains a per-row
  DropdownMenu with Pause / Resume / Stop (filtered by current status)
  plus a "Pause all running" button in the header. A persistent
  workspace-level emergency flag is deferred — pause-all gives the
  operator the same effective pause in one click._

**Audit timeline** — COMPLETE

- _Landed (feature `076`): new `audit_events` table (migration `0013`) +
  `AuditEventRepository`. `ControlJourneyUseCase` and `MarkReplyUseCase`
  now record their state changes as audit events (`journey.pause`,
  `journey.resume`, `journey.stop`, `journey.reply`). New
  `GET /workspaces/:id/audit-events` endpoint behind `WorkspaceAdminGuard`
  returns the workspace's recent events ordered by `createdAt desc`. Web:
  new `/_app/workspace/audit` route renders the timeline; the side nav
  gains an Audit entry. Emitting events from dispatcher touch-sent /
  exhaustion paths is left for a follow-up (the use cases that already
  exist on the engine flow will pick them up the same way control + reply
  just did)._

**BDR handoff reliability** — COMPLETE

- _Landed across earlier features (`006` cadence aggregate, `009`
  dispatcher's `CadenceActionExecutor`, `004` Pipedrive activity
  attribution to deal owner). The cadence's `onReply` action array
  already supports `log_activity { activityType, subject, note }`; the
  executor passes `ownerExternalId` from the journey's `LockedJourney` to
  Pipedrive's `/activities` endpoint as `user_id` so the task is assigned
  to the deal owner. The visibility-in-audit bit ships with feature `076`
  (audit timeline). Tracked under feature `077` in `.specs/features/`._

**Dashboard v1 control-panel polish** — COMPLETE

- _Landed (feature `078`, batched as one PR with 079/080/081): KPI grid
  now leads with "Queued (1h)" — count of running journeys with
  `nextTouchAt` inside the next hour, computed client-side. The Error
  tile gains a subtitle showing the most common `errorReason`, surfaced
  via the new `subtitle` prop on `KpiTile`._

**Connector/channel form UX polish** — COMPLETE

- _Landed across features `054` (labeled provider pickers), `056`/`057`
  (typed credential forms via zod builder), `059` (token-first Pipedrive
  setup), `060`/`061` (health pills with reconnect prompts). The "webhook
  URL copy" item is intentionally deferred: the webhook token never
  leaves the API (encrypted at rest, never returned), so a copy-button
  without it would mislead — the runbook (`083`) documents the URL
  pattern instead._

**Cadence and journey table UX polish** — COMPLETE

- _Landed (feature `080`): relative-time formatting on the journeys
  table's Next-touch column ("in 2h 15m"). Status filter / dots / empty
  state were already in place from `038`/`044`._

**Provider setup and webhook UX** — COMPLETE

- _Landed via the combination of `029` (auto Meta webhook subscription),
  `053` (CRM per-account webhook token verified server-side, never
  surfaced in the response), `060`/`061` (health pills + reconnect
  prompts), and `063`/`067` (wizard checklist + readiness banner). The
  pilot runbook (`083`) documents the exact webhook URLs each provider
  needs._

**Pilot deployment readiness** — COMPLETE

- _Landed (feature `082`): `docs/pilot-deployment.md` describes the
  minimum first-customer topology (one API + one web + Postgres, HTTPS
  via Caddy/NGINX), the required env vars, the migration procedure
  (drizzle-kit, manual at deploy time), the backup/restore note
  (pg_dump + the AES key managed separately), and log access via the
  container runtime. Defers Kamal / autoscaling / managed-cloud to a
  future infra slice._

**Pilot runbook and customer handoff** — COMPLETE

- _Landed (feature `083`): `docs/pilot-runbook.md` is the customer-facing
  handoff document — Meta prereqs, Coex upkeep cadence, Pipedrive webhook
  setup, daily/weekly operating procedure, on-incident recovery table,
  controlled launch sequence, rollback path._

**v1 acceptance gate** — COMPLETE

- _Landed (feature `084`): `docs/v1-acceptance-gate.md` is the final
  pre-release checklist — engineering acceptance, deployment acceptance,
  controlled-pilot acceptance (routing / reply-stop / lost / recovery),
  CONCERNS gate, customer handoff. Tag v1.0 once every box is checked._

**Base UI Select.Value renders the label, not the ID** — COMPLETE

- _Landed (feature `085`): every Select trigger in `apps/web` previously
  showed the raw `value` (a UUID, a plugin id) instead of the option's
  label. Root cause: Base UI's `Select.Value` (unlike Radix) does not
  reflect the selected `SelectItem`'s child text — it needs a `children`
  render function or an `items` prop on `Select.Root`. Fixed the two
  composed wrappers (`LookupSelect`, `PluginSelect`) and the one inline
  trigger in the cadence-builder, and introduced `.agents/rules/base-ui.md`
  to document the idioms (linked from AGENTS.md alongside `react.md` and
  `web-patterns.md`)._

---

## Phase 2.2 — Observability

**Goal:** Replace `apps/api`'s structureless logging with one wide event per
request — a single grep-able JSON line carrying correlation fields, accumulated
context, and the structured error envelope when things fail. The drain stays
stdout (containers capture it for free); OTLP / self-hosted Monoscope are
deferred to a later phase, gated on the Kamal deploy pipeline (`028`) + an S3
bucket decision.

### Features

**Wide-event observability spike via `evlog`** — COMPLETE

- _Landed (feature `086`): `evlog@^2.18.1` (`evlog/nestjs`) wired into
  `ApiModule` via `EvlogModule.forRootAsync(...)`, fed by a single
  `buildEvlogOptions(config)` factory at
  `apps/api/src/shared/observability/evlog-options.ts` — pins
  `service: 'kizunu-api'`, excludes `/health`, and attaches a redaction
  enricher that walks `event.{input,request,body,credentials}` and masks
  any key in a closed-vocabulary `REDACTION_KEYS` list (`credentials`,
  `accessToken`, `appSecret`, `verifyToken`, `client_secret`, `code`)
  while leaving `error.code` (the `ApplicationException` dot-namespaced
  code) untouched._
- _End-to-end on one hot route — the Coex Embedded-Signup finish handler,
  `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect` — where
  `ConnectMetaCoexUseCase` attaches `workspaceId` + `pluginId` plus four
  kebab-case `step` markers (`assert-configured`, `oauth-exchange`,
  `coex-finalize`, `persist-account`) via `useLogger().set(...)`._
- _Filter composition keeps the HTTP wire frozen at
  `{ code, message, context }`: `ApplicationExceptionFilter` enriches the
  wide event with a guarded `useLogger().error(exception)` and renders
  the existing envelope; a new `UnhandledExceptionFilter` extends
  `BaseExceptionFilter` (`@nestjs/core`) and delegates to `super.catch`
  after logging — `HttpException` subclasses (`UnauthorizedException`,
  `NotFoundException`, etc.) keep their mapped status; anything else
  becomes a 500. The two filters are registered as global `APP_FILTER`
  providers in an order chosen for Nest's reverse-iteration semantics
  (`UnhandledExceptionFilter` first, `ApplicationExceptionFilter` second
  → `ApplicationException` is the latest-registered and runs first)._
- _Doctrine codified: `.agents/rules/observability.md` (linked from
  AGENTS.md "Conventions and rules" alongside `react.md` /
  `web-patterns.md` / `base-ui.md`) and ADR-009
  (`docs/adr/009-wide-events-via-evlog.md`) anchor the wide-event
  pattern, the redaction vocabulary, the "no `createError` from a domain
  use case" rule, and the deferred OTLP/Monoscope drain (still in
  `ROADMAP.md` → Later, blocked on `028` + the S3 decision). Commit-pinned
  upstream snippets live at `.specs/research/observability-evlog/`._
- _Lesson learned (captured during CI on PR #112): Nest registers global
  `APP_FILTER` providers in **reverse** order — the latest-registered
  runs first. A `@Catch()` (universal) filter MUST extend
  `BaseExceptionFilter` and call `super.catch(exception, host)` rather
  than `throw exception`; rethrowing exits the filter chain and Nest
  renders an unmapped 500. Order the two providers so the more-specific
  filter is registered last._
