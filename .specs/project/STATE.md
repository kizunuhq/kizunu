# State

Persistent memory: decisions, blockers, lessons, todos, deferred ideas. Updated as work progresses.

## Decisions

Settled before code (from `docs/v0.1-scope.md`; rationale in `docs/adr/`):

- **D1 — `LeadJourney` state machine + race resolution.** States `running → paused | replied | exhausted | stopped | error_state | paused_owner_inactive`. Dispatch/reply race resolved with a pessimistic row lock (`SELECT … FOR UPDATE`): scheduler and inbound handler both take the lock; first to commit wins. Inside the lock the dispatcher re-checks `status = 'running'`, inserts a `TouchAttempt` with unique `(leadJourneyId, stepOrder)`, then calls the channel. `validate` requiring a template with none applicable → `error_state` (reason `template_required`); never freeform outside the 24h window.
- **D2 — Channel plugin contract** frozen: monorepo module (no separate process). `validate → Decision { action, mode?, reason? }`. Meta peculiarities (24h window, HSM, `waba_id`) live inside the plugin; engine sees only `Decision`.
- **D3 — CRM connector contract.** `NormalizedEvent { type, externalId, ownerExternalId, occurredAt, raw }`, `type` in internal vocabulary. Per-workspace API token. `deal.updated` filtered by `stage_id` transition (`previous` + `current`). Idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`. Throttled outbound queue (~100 req / 10s), exponential backoff, max 3, then `error_state`.
- **D4 — Persistence:** Drizzle + Postgres, drizzle-kit migrations. Transactions back D1's row lock. `Template` stores an HSM reference; `ChannelAccount.credentials` holds Meta fields.
- **D5 — Scheduler:** in-process DB poller over `nextTouchAt <= now` (NestJS cron), no Redis/BullMQ. Restart resilience from `nextTouchAt`; cancellation needs no job cancel (poller skips `status != 'running'`). Reassess BullMQ at higher volume. See `docs/adr/005`.
- **D6 — Channel choice:** Meta Cloud API via Coexistence over Evolution (ban-risk avoidance). See `docs/adr/004`.
- **D7 — Auth:** home-grown minimal (no external auth library) to keep `Workspace`/`Membership` in domain tables. See memory `byo-auth-no-org-plugin-coupling`.

## Open questions / todos

- **OPEN — Auth method:** magic link vs. email/password for v0.1. Pick one before finishing the auth feature.
- **OPEN — Remaining auth primitives:** password reset, session expiry, CSRF, login rate-limit (scope acknowledges ~2 extra weeks).
- Pilot assumptions to confirm (from scope §"Assumptions to confirm with the pilot"): Pipedrive pipeline shape (per-BDR vs shared); Meta number per BDR + 14-day CoEx upkeep + per-conversation pricing accepted; five follow-up messages approved as HSM templates before pilot; simple auth acceptable; manual lead reassignment acceptable.

## Blockers

- None recorded.

## Lessons

- Domain owns the enum vocabulary; infra (pgEnum) conforms via a compile-time `Assert<Equal<...>>` guard. See memory `layer-boundary-type-guard` and `docs/adr/003`.
- Vitest runs integration/e2e specs in a **Node** worker with no `Bun` global, but the Drizzle id default (`defaults()`) calls `Bun.randomUUIDv7()` at insert time. The integration/e2e `setup.ts` files polyfill it with `crypto.randomUUID()` so DB-backed inserts work. Any future DB-backed test relies on this.
- The `ChannelPlugin` port (D2) is frozen in `apps/api/src/modules/channel/core/plugin/` and proven with a fake plugin; `ChannelAccount.credentials` is opaque `unknown` at the port and validated per-plugin via `configSchema`. The engine's channel-resolution seam is `ChannelAccessRepository.findPrimaryAccount(userId, pluginId)`.
- The real `MetaWhatsappPlugin` (feature `003`, `modules/channel/plugins/meta-whatsapp/`) is registered into `CHANNEL_PLUGINS`. `validate` never returns freeform once the 24h window closes (returns `template` or `error: template_required`). The app-level Meta inbound webhook (`hub.verify_token` + route by `phone_number_id`) is intentionally deferred to the Engine slice — it pauses `LeadJourney`s, which don't exist yet, so building it now would be a dead seam.
- The `CRMConnector` port (D3, feature `004`, `modules/crm/`) mirrors the channel pattern: `CrmConnectorRegistry` + `CRM_CONNECTORS` token, workspace-owned `ConnectorAccount` (token), and the `PipedriveConnector` (`parseWebhook` → `NormalizedEvent[]`, never throws; outbound actions). The two registries (channel/crm) are deliberately kept as separate, context-local code rather than a shared generic. Deferred to Cadence/Engine: `EntryTrigger` (needs `cadenceId`), the `deal.updated` ingestion endpoint (needs `LeadJourney`), and the throttled outbound queue. Engine seam: `ConnectorAccountRepository.findByConnectorInWorkspace`.
- `Template` (feature `005`, `modules/cadence/`) is a workspace-owned HSM reference (`providerTemplateName`, `language`, `variables[]`) with CRUD; unique name per workspace.
- The `Cadence` aggregate (feature `006`, `modules/cadence/`): `Cadence` + ordered `Step`s + closed-vocabulary `CadenceAction` hooks (a `@kizunu/api-contracts/cadence` discriminated union) + `stopOnReply`. `cadence-validator.ts` is pure (injected `hasPlugin`/`findTemplate` lookups) so create/update both reuse it; `cadence.repository.ts` writes cadence + steps atomically in a transaction (step order = array index, update fully replaces steps). `EntryTrigger` (pipeline+stage → cadence) and `Lead` are deferred to the engine slice — EntryTrigger is consumed there and Lead is mirrored during ingestion.
- The `engine` module (feature `007`, `modules/engine/`) holds the pure `LeadJourney` state machine (`core/domain/lead-journey-transition.ts`: a transition-table `Record`, not a switch — the D1 core, exhaustively tested) and `EntryTrigger` CRUD (one cadence per connector account + stage; validates both references in the workspace). `LeadJourneyStatus`/`JourneyEvent` are derived const objects (ADR 002); the `lead_journeys` pgEnum will conform via `Assert<Equal>` when added. Still to come: the scheduler/dispatcher and inbound reply.
- Ingestion (feature `008`, `modules/engine/`): the `leads` + `lead_journeys` tables (the `lead_journey_status` pgEnum conforms to `LeadJourneyStatus` via `Assert<Equal>`; an index on `(status, nextTouchAt)` backs the poller), and `StartJourneyUseCase` (resolve cadence via EntryTrigger → fetch+upsert `Lead` → create `running` journey with `nextTouchAt = now + firstStepDelay`, idempotent on a non-terminal lead+cadence; `Clock` injected). Driven by the public `POST /webhooks/crm/:connectorAccountId` (the unguessable account id is the v0.1 secret — see CONCERNS). Repo seams now consumed: `findCadenceByStage`, `CadenceRepository.firstStepDelayMinutes`, `ConnectorAccountRepository.findById`.
- The dispatcher (feature `009`, `modules/engine/`): `JourneyDispatcher.dispatchDue` finds due running journeys (`findDueIds`), then per id runs `dispatchOne` inside `db.transaction` under `lockById` (`SELECT … FOR UPDATE`). Per step: resolve the lead-owner's primary channel (none → `error_state`), `touchAttempts.tryInsert` (unique `(journey, step)` = idempotency), `plugin.validate` (error → `error_state`), send the **template** touch (variables not yet resolved — v0.1 limitation), `connector.logActivity`, `advance` with `Jitter`. Past the last step → `transition(exhaust)` + `CadenceActionExecutor` runs `onExhausted` (flat guards, not a switch; `move_stage/mark_lost/log_activity/set_field` → connector, `notify_user` no-op, `webhook_out` → fetch). An in-process `setInterval` `JourneyPoller` (D5, disabled under `NODE_ENV=test`) ticks `dispatchDue`. `persistence/transaction.ts` types the tx executor threaded to repos. **Deferred:** CRM-owner → Kizunu-user mapping (until then `ownerUserId=null` → `error_state`) and `sendingWindow` (dispatch respects only `nextTouchAt`). Still to come: `paused_owner_inactive`.
- Inbound reply (feature `010`, `modules/engine/`): the app-level `MetaWebhookController` (`@Public`) — `GET /webhooks/meta` verifies `hub.verify_token` against `meta.verifyToken` config; `POST` parses via the Meta plugin and routes each message to its `ChannelAccount` by `phone_number_id` (`ChannelAccountRepository.findByPluginAndCredential`). `MarkReplyUseCase` finds the running journey by `(workspaceId, lead.phone)`, takes the row lock **only** for `transition(Running, Reply) → replied` (serializing with the dispatcher per D1), and runs `onReply` actions **after** commit (off the lock). `paused_owner_inactive` + bulk reassign are deferred (avoid a workspace↔engine module cycle).

## Deferred ideas

- See ROADMAP.md → Phase 1.5 and Future Considerations.

## Preferences

- **Tests → always use the `generate-tests` skill.** All test implementation in this project routes through `.claude/skills/generate-tests` (thin/fat classification), not mechanical per-criterion tests. Codified in `.specs/codebase/TESTING.md` ("Test Authoring Policy").
- **ADRs are immutable.** Architectural decisions live in `docs/adr/` indexed by `docs/adr/README.md`; never edit an Accepted ADR — supersede with a new one and link back. Referenced from `.specs/codebase/ARCHITECTURE.md` and `INTEGRATIONS.md`.
- Lightweight steps (state updates, validation, session handoff) run fine on a faster/cheaper model.
- **UI is shadcn-first.** `apps/web` primitives originate from shadcn/ui (via the `shadcn` skill) into `components/primitives/`, customized in-project; bespoke only when no primitive fits. Codified in `.agents/rules/react.md` §0 and `.specs/codebase/CONVENTIONS.md`. Baseline installed (button, input, label, field, card, separator, sonner) under feature `001-shadcn-first-primitives`. Style `base-nova`, base lib `@base-ui/react`, icons `@phosphor-icons/react`.
- **Feature specs are sequentially numbered.** `.specs/features/NNN-<slug>/`, starting `001`, incrementing by one, never skipping or reusing a number (rule in `.specs/features/README.md`).

## Codebase map

Brownfield mapping done 2026-05-22 → `.specs/codebase/` (STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS). Top concerns: most of core v0.1 still unbuilt (channel slice 1 landed in feature `002`); channel credentials stored unencrypted; CORS configured but never `enableCors`d; no IP-level login rate-limit / CSRF; migrations run on every API boot. Note: session expiry/revocation **is** enforced (`SessionRepository.findActiveByTokenHash` checks `revokedAt`/`expiresAt`) — narrows the STATE "remaining auth primitives" todo to rate-limit, CSRF, password-reset flow.
