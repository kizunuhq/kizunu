# State

Durable persistent memory: settled decisions, open questions, blockers,
architectural lessons that prevent repeat mistakes, preferences. Feature-by-feature
recall belongs in [`HISTORY.md`](HISTORY.md), not here.

## Decisions

Settled before code (rationale in `docs/adr/`):

- **D1 — `LeadJourney` state machine + race resolution.** States `running → paused | replied | exhausted | stopped | error_state | paused_owner_inactive`. Dispatch/reply race resolved with a pessimistic row lock (`SELECT … FOR UPDATE`): scheduler and inbound handler both take the lock; first to commit wins. Inside the lock the dispatcher re-checks `status = 'running'`, inserts a `TouchAttempt` with unique `(leadJourneyId, stepOrder)`, then calls the channel. `validate` requiring a template with none applicable → `error_state` (reason `template_required`); never freeform outside the 24h window.
- **D2 — Channel plugin contract** frozen: monorepo module (no separate process). `validate → Decision { action, mode?, reason? }`. Meta peculiarities (24h window, HSM, `waba_id`) live inside the plugin; engine sees only `Decision`.
- **D3 — CRM connector contract.** `NormalizedEvent { type, externalId, ownerExternalId, occurredAt, raw }`, `type` in internal vocabulary. Per-workspace API token. `deal.updated` filtered by `stage_id` transition (`previous` + `current`). Idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`. Throttled outbound queue (~100 req / 10s), exponential backoff, max 3, then `error_state`.
- **D4 — Persistence:** Drizzle + Postgres, drizzle-kit migrations. Transactions back D1's row lock. `Template` stores an HSM reference; `ChannelAccount.credentials` holds Meta fields.
- **D5 — Scheduler:** in-process DB poller over `nextTouchAt <= now` (NestJS cron), no Redis/BullMQ. Restart resilience from `nextTouchAt`; cancellation needs no job cancel (poller skips `status != 'running'`). Reassess BullMQ at higher volume. See `docs/adr/005`.
- **D6 — Channel choice:** Meta Cloud API via Coexistence over Evolution (ban-risk avoidance). See `docs/adr/004`.
- **D7 — Auth:** home-grown minimal (no external auth library) to keep `Workspace`/`Membership` in domain tables. See memory `byo-auth-no-org-plugin-coupling`.

## Open questions / todos

- **SETTLED — Auth method:** email/password (not magic link) — ADR-006.
- **SETTLED — CSRF + rate-limit:** `sameSite`-lax + CORS allowlist for CSRF, `@nestjs/throttler` IP rate-limit on `auth/*` (ADR-006). Session expiry/revocation already enforced.
- **SETTLED — Password reset / mail transport:** built securely behind a `MailSender` boundary; a real SMTP transport (`SmtpMailSender` + Mailpit dev inbox) ships in HISTORY.
- **Pilot assumptions to confirm** (from scope §"Assumptions to confirm with the pilot"): Pipedrive pipeline shape (per-BDR vs shared); Meta number per BDR + 14-day CoEx upkeep + per-conversation pricing accepted; five follow-up messages approved as HSM templates before pilot; simple auth acceptable; manual lead reassignment acceptable.

## Blockers

- None recorded.

## Lessons

Architectural patterns and recurring traps that survive across features. Per-feature recall and "what shipped when" live in `HISTORY.md`.

- **Domain owns the enum vocabulary; infra (pgEnum) conforms via a compile-time `Assert<Equal<...>>` guard** from `@kizunu/nestjs-shared`. The const-object + derived-type pair is the canonical shape; ADR-002 and `.agents/rules/enums.md` are the rule. Memory: `layer-boundary-type-guard`. See `docs/adr/003`.
- **Vitest+Bun integration gotcha.** Vitest runs integration/e2e specs in a **Node** worker with no `Bun` global, but the Drizzle id default (`defaults()`) calls `Bun.randomUUIDv7()` at insert time. The integration/e2e `setup.ts` files polyfill it with `crypto.randomUUID()` so DB-backed inserts work. Any future DB-backed test relies on this.
- **The `ChannelPlugin` port (D2) is frozen.** It lives at `apps/api/src/modules/channel/core/plugin/` and was proven with a fake plugin. `ChannelAccount.credentials` is opaque `unknown` at the port and validated per-plugin via `configSchema` (typed via `defineChannelPlugin<S>` after feature `056`). The engine's channel-resolution seam is `ChannelAccessRepository.findPrimaryAccount(userId, pluginId)`.
- **The `CRMConnector` port (D3) mirrors the channel pattern.** `CrmConnectorRegistry` + `CRM_CONNECTORS` token, workspace-owned `ConnectorAccount`, typed credentials via `defineCrmConnector<S>` after feature `057`. The two registries (channel/crm) are deliberately kept as separate, context-local code rather than a shared generic.
- **When adopting a layout rule, codify the "no escape hatch" version on day one.** The original flat-file feature-routes carve-out in `web-patterns.md` was meant to be temporary and survived three feature cycles before feature `046` swept it out. Mid-flight exceptions ossify; if a rule earns an exception, document the migration deadline alongside it.
- **For engine ↔ crm module cycles, use `forwardRef` on BOTH ends.** The owner-mapping work needed engine to consume `CrmConnectorRegistry`+`ResolveOwnerService` AND crm to consume engine repos for backfill; single-sided `forwardRef` fails at module wiring time. Lesson reusable for any future module cycle the domain forces.

## Deferred ideas

Scope-creep captures that belong to future features, not this conversation.

- See `ROADMAP.md` → Later and Future Considerations.

## Preferences

- **Tests → always use the `generate-tests` skill.** All test implementation in this project routes through `.claude/skills/generate-tests` (thin/fat classification), not mechanical per-criterion tests. Codified in `.specs/codebase/TESTING.md` ("Test Authoring Policy").
- **ADRs are immutable.** Architectural decisions live in `docs/adr/` indexed by `docs/adr/README.md`; never edit an Accepted ADR — supersede with a new one and link back. Referenced from `.specs/codebase/ARCHITECTURE.md` and `INTEGRATIONS.md`.
- **UI is shadcn-first.** `apps/web` primitives originate from shadcn/ui (via the `shadcn` skill) into `components/primitives/`, customized in-project; bespoke only when no primitive fits. Codified in `.agents/rules/react.md` §0 and `.specs/codebase/CONVENTIONS.md`. Style `base-nova`, base lib `@base-ui/react`, icons `@phosphor-icons/react`.
- **Feature specs are sequentially numbered.** `.specs/features/NNN-<slug>/`, starting `001`, incrementing by one, never skipping or reusing a number (rule in `.specs/features/README.md`).
- **ROADMAP is forward-looking.** When a feature ships, its `_Landed_` blurb moves out of `ROADMAP.md` into the matching phase section in `HISTORY.md`. ROADMAP only carries `PLANNED` / `IN PROGRESS` work — see AGENTS.md DoD §6 and flow step 11.
- Lightweight steps (state updates, validation, session handoff) run fine on a faster/cheaper model.

## Codebase map

Brownfield mapping done 2026-05-22 → `.specs/codebase/` (STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS). Refresh whenever the structure shifts materially.
