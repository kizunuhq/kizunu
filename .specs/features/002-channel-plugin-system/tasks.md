# Channel Plugin System Tasks

Atomic tasks for `spec.md` / `design.md`. `[P]` = parallelizable. Each task ends
green on its gate. Commit per task (Conventional Commits).

## T1 — Channel plugin contract (port types) — CHAN-01

- **What:** Add the port types, one per file, under `core/plugin/`: `channel-capability.ts`,
  `channel-plugin-manifest.ts`, `channel-decision.ts`, `send-payload.ts`, `send-result.ts`,
  `inbound-message.ts`, `validate-input.ts`, `channel-plugin.ts`.
- **Reuses:** zod (`ZodType` for `configSchema`).
- **Done when:** types compile; `ChannelPlugin` references the supporting types.
- **Tests:** none (pure types).
- **Gate:** `bun typecheck`.

## T2 — Plugin registry + errors — CHAN-01, CHAN-02

- **What:** `channel.errors.ts` (all six exceptions); `channel-plugin-registry.ts`
  (DI multi-provider token `CHANNEL_PLUGINS`, index by id, `get/has/listManifests/validateCredentials`).
- **Depends on:** T1.
- **Done when:** registry resolves, throws on unknown + duplicate, validates credentials.
- **Tests (generate-tests, fat):** fake plugin under `core/plugin/__test__/`; registry spec.
- **Gate:** `bun typecheck` + registry spec green.

## T3 — Drizzle tables + migration — CHAN-03, CHAN-05 [P after T1]

- **What:** `db/schemas/channel-accounts.ts`, `db/schemas/channel-accesses.ts`, export in `index.ts`;
  run `bun db:generate`.
- **Done when:** schema compiles; migration + checksums generated (not hand-edited).
- **Gate:** `bun typecheck` + `bun scripts/drizzle-checksums.ts verify` + `check-drizzle-schema-naming.ts`.

## T4 — Repositories — CHAN-03, CHAN-05, CHAN-06, CHAN-07

- **What:** `channel-account.repository.ts` (create, findByIdInWorkspace, listByWorkspace);
  `channel-access.repository.ts` (findByAccountAndUser, grant, revoke, listByUser,
  clearPrimaryForUserPlugin, setPrimary, findPrimaryAccess).
- **Depends on:** T3.
- **Done when:** queries compile and run against `kizunu_test`.
- **Tests:** covered via use-case integration (T5) — repos are thin data access.
- **Gate:** `bun typecheck`.

## T5 — Use-cases — CHAN-03..CHAN-09

- **What:** the seven use-cases in design; membership check via `WorkspaceMemberRepository`
  (export it from `WorkspaceModule`). Set-primary uses a transaction (clear-per-plugin then set).
- **Depends on:** T2, T4.
- **Done when:** all rules implemented; ≤30-line functions; no credentials in list projections.
- **Tests (generate-tests, fat):** create (unknown plugin / bad creds / success), grant
  (workspace + membership checks + idempotency), set-primary (clear-per-plugin, no-access reject),
  list-mine projection. Integration against `kizunu_test` where repos participate.
- **Gate:** `bun typecheck` + unit/integration specs green.

## T6 — api-contracts (schemas + Routes) — CHAN-03..CHAN-09 [P after planning]

- **What:** `packages/api-contracts/src/channel/*.contract.ts` (create account, list accounts,
  grant access, my channels, set primary, list plugins) + `index.ts`; add `channelAccounts`
  + `channels` to `Routes`. No `credentials` in any response schema.
- **Done when:** zod v4 top-level formats; types exported.
- **Gate:** `bun typecheck` + `bun scripts/check-zod-v4.ts`.

## T7 — HTTP controllers + module wiring — CHAN-03..CHAN-09

- **What:** `channel-account.controller.ts` (admin, `WorkspaceAdminGuard`) + `my-channel.controller.ts`
  (auth); `channel.module.ts` providing registry, repos, use-cases, `CHANNEL_PLUGINS: []`,
  importing `WorkspaceModule`; register in `api.module.ts`.
- **Depends on:** T5, T6.
- **Done when:** controllers map to `Routes`; DTOs via `createZodDto`; app boots.
- **Tests (generate-tests, thin→e2e):** integration suite: create→grant→set-primary→list-mine;
  assert responses carry no `credentials`; assert admin guard + auth.
- **Gate:** `bun check`.

## T8 — api-client hooks — CHAN-03..CHAN-09 [P after T6]

- **What:** `channel/channel.api.ts` + the seven `use-*.ts` hooks; query keys in `query-keys.ts`.
- **Depends on:** T6.
- **Done when:** typed calls to `Routes.*`; hooks keyed correctly.
- **Gate:** `bun typecheck` + lint.

## T9 — Docs + state

- **What:** update `ROADMAP.md` (note 002 slice done), `STATE.md`, `.specs/codebase/*`
  (STRUCTURE module list, INTEGRATIONS/CONCERNS credential-encryption flag, ARCHITECTURE port note).
- **Depends on:** T1–T8.
- **Gate:** docs consistent; `bun check` still green.

## Dependency graph

```
T1 → T2 ┐
T1 → T3 → T4 ┐
            ├→ T5 → T7 → T9
T2 ─────────┘        ↑
T6 ──────────────────┘
T6 → T8
```
</content>
