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

## Deferred ideas

- See ROADMAP.md → Phase 1.5 and Future Considerations.

## Preferences

- **Tests → always use the `generate-tests` skill.** All test implementation in this project routes through `.claude/skills/generate-tests` (thin/fat classification), not mechanical per-criterion tests. Codified in `.specs/codebase/TESTING.md` ("Test Authoring Policy").
- **ADRs are immutable.** Architectural decisions live in `docs/adr/` indexed by `docs/adr/README.md`; never edit an Accepted ADR — supersede with a new one and link back. Referenced from `.specs/codebase/ARCHITECTURE.md` and `INTEGRATIONS.md`.
- Lightweight steps (state updates, validation, session handoff) run fine on a faster/cheaper model.
- **UI is shadcn-first.** `apps/web` primitives originate from shadcn/ui (via the `shadcn` skill) into `components/primitives/`, customized in-project; bespoke only when no primitive fits. Codified in `.agents/rules/react.md` §0 and `.specs/codebase/CONVENTIONS.md`. Baseline installed (button, input, label, field, card, separator, sonner) under feature `001-shadcn-first-primitives`. Style `base-nova`, base lib `@base-ui/react`, icons `@phosphor-icons/react`.
- **Feature specs are sequentially numbered.** `.specs/features/NNN-<slug>/`, starting `001`, incrementing by one, never skipping or reusing a number (rule in `.specs/features/README.md`).

## Codebase map

Brownfield mapping done 2026-05-22 → `.specs/codebase/` (STACK, ARCHITECTURE, CONVENTIONS, STRUCTURE, TESTING, INTEGRATIONS, CONCERNS). Top concerns: core v0.1 unbuilt; CORS configured but never `enableCors`d; no IP-level login rate-limit / CSRF; migrations run on every API boot. Note: session expiry/revocation **is** enforced (`SessionRepository.findActiveByTokenHash` checks `revokedAt`/`expiresAt`) — narrows the STATE "remaining auth primitives" todo to rate-limit, CSRF, password-reset flow.
