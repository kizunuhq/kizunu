# 054 — Connector Lookups Tasks

**Design**: `.specs/features/054-connector-lookups/design.md`
**Spec**: `.specs/features/054-connector-lookups/spec.md`
**Status**: Draft

Tests are written via the **`generate-tests`** skill at Execute time per the
thin/fat policy in `TESTING.md` and `.agents/rules/test.md`. Task entries
say *what behavior needs coverage*; `generate-tests` decides whether each
piece is fat (focused unit) or thin (e2e-only).

---

## Execution Plan

### Phase 1: Shared core (sequential)

Lays the contracts, error vocabulary, cache, and plugin-port additions
that every later layer depends on.

```
T1 ──┬─ T3 ─┐
     │       ├─→ T7
T2 ──┴───────┘
     │
T4   │
T5 ──┤
T6 ──┘
```

### Phase 2: Providers + use cases + api-client (parallel where possible)

```
                ┌─ T8  [P]  Pipedrive directory impl
T4, T7 ─────────┤
                ├─ T9  [P]  Meta directory impl
                │
                ├─ T10      CRM use case + controller + module wiring
                ├─ T11      Channel use case + controller + module wiring
                │
T5 ────────────┼─ T12 [P]  api-client crm hooks
T6 ────────────┴─ T13 [P]  api-client channel hooks
```

T10/T11 are not `[P]` between each other only because both touch the
shared error filter wiring sanity-check; if that's already wired (it is)
they can also run in parallel — see Diagram-Definition Cross-Check below.

### Phase 3: Web surfaces (parallel)

```
T14 (Reconnect primitive) ──┬─ T15 [P]  member-identity user picker
                            ├─ T16 [P]  entry-trigger pipeline+stage picker
                            ├─ T17 [P]  cadence-step template picker
                            ├─ T18 [P]  connect-meta-coex phone picker
                            └─ T19 [P]  api-client + manifest for fields (UI deferred)
```

### Phase 4: E2E + concerns + docs (sequential)

```
T20 (e2e for both directory endpoints) ── T21 (CONCERNS.md update)
```

---

## Task Breakdown

### T1: Shared directory contract package

**What**: Create `DirectoryRowSchema` and `DirectoryResultSchema` (zod v4
top-level formats), plus the inferred `DirectoryRow` / `DirectoryResult`
types in the contract package. No endpoint-specific schemas yet — purely
the shared shape both endpoints will reuse.

**Where**: `packages/api-contracts/src/shared/directory.contract.ts` (new).

**Depends on**: None.
**Reuses**: zod v4 import pattern from any existing contract.
**Requirement**: LOOKUP-23 (foundation for `meta.truncated`), LOOKUP-19/20 (shared shape).

**Done when**:
- [ ] Schemas exported; types inferred; `meta.truncated: boolean` present.
- [ ] `bun check` typecheck slice green: `bunx vp run -r --filter @kizunu/api-contracts check-types`.

**Tests**: none (pure schema, covered transitively by endpoint e2e).
**Gate**: build.

---

### T2: Directory error vocabulary

**What**: Add the 5 typed exceptions
(`ConnectorDirectoryUnsupportedException`,
`ConnectorTokenExpiredException`,
`ConnectorRateLimitedException`,
`ConnectorDirectoryFailedException`,
`ConnectorDirectoryParamsInvalidException`) in one file under a new
`_shared/directory/` module folder so both CRM and channel modules import
the same set.

**Where**: `apps/api/src/modules/_shared/directory/directory.errors.ts` (new).
**Depends on**: None.
**Reuses**: `ApplicationException` envelope (status, code, message, context).
**Requirement**: LOOKUP-04, LOOKUP-15, LOOKUP-19, LOOKUP-22.

**Done when**:
- [ ] All five classes extend `ApplicationException` with correct codes/statuses (see design table).
- [ ] One file per error class is **not** required here — these are tightly coupled into one vocabulary (mirrors `crm.errors.ts`).

**Tests**: none (constructors are thin; exercised via use-case/controller specs).
**Gate**: quick (`bun test:unit` once T3 lands).

---

### T3: `DirectoryCacheService`

**What**: In-process `Map<string, { value, expiresAt }>` keyed by
`${workspaceId}:${accountId}:${resource}:${paramsHash}`, with
`getOrLoad(key, loader, ttlMs)` and `invalidate(predicate)`. Deterministic
`paramsHash` via sorted-key JSON stringify. Lazy eviction on read.

**Where**: `apps/api/src/modules/_shared/directory/directory-cache.service.ts` (new).
**Depends on**: T1 (consumes the `DirectoryResult` type).
**Reuses**: `@Injectable()` pattern; same dep-free style as services in `oauth-refresh.service.ts`.
**Requirement**: LOOKUP-02, LOOKUP-21.

**Done when**:
- [ ] Service is fat (key derivation, TTL boundary, isolation): unit-tested per `generate-tests` (one rule per test — key determinism, params-order independence, TTL hit/miss boundary, workspace isolation, predicate-based invalidate).
- [ ] Quick gate green: `bun test:unit`.

**Tests**: unit (fat).
**Gate**: quick.

---

### T4: Plugin-port additions for `directory`

**What**: Add the optional `directory(input: DirectoryInput): Promise<DirectoryResult>`
method to both plugin interfaces, plus `directoryResources?: readonly
DirectoryResourceDescriptor[]` to both manifests. `DirectoryInput` and
`DirectoryResourceDescriptor` live as small typed files under
`_shared/directory/` (one type per file per `code-standards.md` §11).

**Where**:
- `apps/api/src/modules/_shared/directory/directory-input.ts` (new)
- `apps/api/src/modules/_shared/directory/directory-resource-descriptor.ts` (new)
- `apps/api/src/modules/crm/core/connector/crm-connector.ts` (modify — add optional method)
- `apps/api/src/modules/crm/core/connector/crm-connector-manifest.ts` (modify — add field)
- `apps/api/src/modules/channel/core/plugin/channel-plugin.ts` (modify)
- `apps/api/src/modules/channel/core/plugin/channel-plugin-manifest.ts` (modify)

**Depends on**: T1.
**Reuses**: Existing optional-port pattern from `fetchOwner?` / `refreshCredentials?` (the design references both).
**Requirement**: LOOKUP-19, LOOKUP-20.

**Done when**:
- [ ] Interfaces compile across `apps/api` and any plugin currently registered (no implementations forced yet — method is optional).
- [ ] Typecheck green: `bun typecheck`.

**Tests**: none (interface only).
**Gate**: build.

---

### T5: CRM directory contract + Routes entry

**What**: `GetConnectorDirectoryRequestSchema` (path: `workspaceId`,
`accountId`, `resource`; query: optional structured params), reuses
`DirectoryResultSchema` for response. Adds the route function under
`Routes.connectorAccounts.directory`.

**Where**:
- `packages/api-contracts/src/crm/get-connector-directory.contract.ts` (new).
- `packages/api-contracts/src/routes/index.ts` (modify).

**Depends on**: T1.
**Reuses**: Existing `connectorAccounts.collection / identities` route shape.
**Requirement**: LOOKUP-01, LOOKUP-06, LOOKUP-09, LOOKUP-19.

**Done when**:
- [ ] Schemas + route exist; api-contracts typecheck green.

**Tests**: none.
**Gate**: build.

---

### T6: Channel directory contract + Routes entry

**What**: Same as T5 for the channel side. Adds `Routes.channelAccounts.directory`.

**Where**:
- `packages/api-contracts/src/channel/get-channel-directory.contract.ts` (new).
- `packages/api-contracts/src/routes/index.ts` (modify; same file as T5 — see Phase 1 sequencing — T5 and T6 land in one PR so both `Routes` edits sit on one diff).

**Depends on**: T1.
**Reuses**: Same as T5.
**Requirement**: LOOKUP-12, LOOKUP-16.

**Done when**:
- [ ] As T5.

**Tests**: none.
**Gate**: build.

---

### T7: `_shared/directory/` Nest module wiring

**What**: A standalone Nest module (`DirectoryModule`) exporting
`DirectoryCacheService`. Imported by both `CrmModule` and `ChannelModule`.

**Where**: `apps/api/src/modules/_shared/directory/directory.module.ts` (new).
**Depends on**: T2, T3.
**Reuses**: NestJS Module pattern from any other in-repo module.
**Requirement**: foundation for LOOKUP-02/21.

**Done when**:
- [ ] Module compiles; both crm and channel modules import it (no provider duplication).
- [ ] `bun typecheck` green.

**Tests**: none (wiring is thin; covered by e2e once endpoints land).
**Gate**: build.

---

### T8 [P]: Pipedrive directory implementation

**What**: Extend `PipedriveApi` with `listUsers`, `listPipelines`,
`listStages(pipelineId)`, `listDealFields` — each returns `DirectoryResult`.
Add `PipedriveConnector.directory(...)` dispatching on resource, plus
`manifest.directoryResources` declaration. Map provider 401/429/5xx into
the shared exceptions (no `CrmRequestFailedException` for these paths —
the new errors carry richer context).

**Where**:
- `apps/api/src/modules/crm/plugins/pipedrive/pipedrive-api.ts` (modify; add 4 methods).
- `apps/api/src/modules/crm/plugins/pipedrive/pipedrive.connector.ts` (modify; add `directory` + manifest fields).

**Depends on**: T4.
**Reuses**: Existing `request(...)` helper + `pipedriveResponseSchema`; `fetchFn` injection.
**Requirement**: LOOKUP-01, LOOKUP-06, LOOKUP-09, LOOKUP-22, LOOKUP-23.

**Done when**:
- [ ] Each `listX` is fat (URL/query params + JSON → normalized rows + error mapping): unit-tested per `generate-tests` — one test per resource for happy path, 401, 429-with-`Retry-After`, generic 5xx.
- [ ] `directory()` dispatcher tested for resource dispatch + unsupported-resource throw + missing `pipelineId` throw.
- [ ] Quick gate green: `bun test:unit`.

**Tests**: unit (fat).
**Gate**: quick.

---

### T9 [P]: Meta directory implementation

**What**: Extend the Meta channel plugin with `listTemplates(credentials)`
(server-side `status=APPROVED`, paginate to 500 max) and
`listPhoneNumbers(credentials)`. Wire `ChannelPlugin.directory` + manifest.

**Where**:
- `apps/api/src/modules/channel/plugins/meta-whatsapp/` (modify the existing helpers + plugin file; exact filename matches the local naming).

**Depends on**: T4.
**Reuses**: Existing fetch helpers in the meta-whatsapp folder (same `fetchFn` injection used by `connect-meta-coex.use-case.ts`).
**Requirement**: LOOKUP-12, LOOKUP-13 (language captured in each row's `sublabel`/normalized fields), LOOKUP-16, LOOKUP-22.

**Done when**:
- [ ] Both `listX` methods unit-tested (happy + 401 + 429 + 5xx) per `generate-tests`.
- [ ] Templates assertion: query string carries `status=APPROVED`.
- [ ] Quick gate green: `bun test:unit`.

**Tests**: unit (fat).
**Gate**: quick.

---

### T10: CRM directory use case + controller + module wiring

**What**: Create `GetConnectorDirectoryUseCase` (workspace-scope check
→ registry → cache → plugin). Wire it through the existing
`ConnectorAccountController` with a new `GET ...directory/:resource`
handler. The use case validates `params` against the resource's
`paramsSchema` from the manifest before calling the plugin; rejects
unsupported resources before any plugin call.

**Where**:
- `apps/api/src/modules/crm/core/use-cases/get-connector-directory.use-case.ts` (new).
- `apps/api/src/modules/crm/http/controllers/connector-account.controller.ts` (modify; add handler).
- `apps/api/src/modules/crm/crm.module.ts` (modify; add use case to providers; import `DirectoryModule`).

**Depends on**: T2, T3, T4, T5, T7.
**Reuses**: `ConnectorAccountRepository.findByIdInWorkspace`; `CrmConnectorRegistry`; `createZodDto(...)`.
**Requirement**: LOOKUP-01, LOOKUP-02, LOOKUP-05, LOOKUP-19, LOOKUP-20, LOOKUP-21.

**Done when**:
- [ ] Use case is fat (orchestration + branching error vocab): unit-tested per `generate-tests` — workspace-mismatch short-circuits (no plugin call), unsupported-resource short-circuits, invalid-params short-circuits, cache hit returns without plugin call, cache miss invokes plugin and stores.
- [ ] Controller is thin — its happy path + token-expired branch are covered by T20's e2e.
- [ ] Quick gate green; full gate runs in T20.

**Tests**: unit (use case, fat) + thin-via-e2e (controller, deferred to T20).
**Gate**: quick.

---

### T11: Channel directory use case + controller + module wiring

**What**: Mirror of T10 on the channel side. The use case ALSO accepts the
already-mounted `ChannelAccountRepository.findWorkspaceAndCredentials` to
load the encrypted credentials.

**Where**:
- `apps/api/src/modules/channel/core/use-cases/get-channel-directory.use-case.ts` (new).
- `apps/api/src/modules/channel/http/controllers/channel-account.controller.ts` (modify; add handler).
- `apps/api/src/modules/channel/channel.module.ts` (modify).

**Depends on**: T2, T3, T4, T6, T7.
**Reuses**: Same patterns as T10.
**Requirement**: LOOKUP-12, LOOKUP-15, LOOKUP-16, LOOKUP-22, LOOKUP-21.

**Done when**:
- [ ] As T10 for the channel use case (unit-tested per `generate-tests`).
- [ ] Controller thin-via-e2e in T20.

**Tests**: unit (use case) + thin-via-e2e.
**Gate**: quick.

---

### T12 [P]: api-client — shared helper + CRM hooks

**What**: Add the shared `useDirectory` underlying helper (maps
`code === 'connector.token-expired'` into a typed `error.needsReconnect`
flag), plus the four CRM-scoped hooks:
`useDirectoryPipedriveUsers(accountId)`,
`useDirectoryPipedrivePipelines(accountId)`,
`useDirectoryPipedriveStages(accountId, pipelineId)` (with `enabled: !!pipelineId`),
`useDirectoryPipedriveFields(accountId)`. Add the corresponding
`*.api.ts` fetch and `QueryKeys.directory` entry.

**Where**:
- `packages/api-client/src/directory/use-directory.ts` (new — internal helper).
- `packages/api-client/src/crm/get-connector-directory.api.ts` (new).
- `packages/api-client/src/crm/use-directory-pipedrive-users.ts` (new).
- `packages/api-client/src/crm/use-directory-pipedrive-pipelines.ts` (new).
- `packages/api-client/src/crm/use-directory-pipedrive-stages.ts` (new).
- `packages/api-client/src/crm/use-directory-pipedrive-fields.ts` (new).
- `packages/api-client/src/query-keys.ts` (modify).

**Depends on**: T5.
**Reuses**: `get<T>` typed fetch; `ApiError`; existing hook patterns under `crm/`.
**Requirement**: LOOKUP-01, LOOKUP-03 (refetch), LOOKUP-04, LOOKUP-06.

**Done when**:
- [ ] `useDirectory` error-mapping is fat (web jsdom unit test confirms `needsReconnect` flag is set only for the token-expired code).
- [ ] Hooks compile; query keys present.
- [ ] Web quick gate green: `bunx vp test --project web`.

**Tests**: web (jsdom unit on the helper) + thin orchestrations covered by web surface e2e (T15/T16 manual verification).
**Gate**: quick.

---

### T13 [P]: api-client — channel hooks

**What**: Mirror of T12 for channel:
`useDirectoryMetaTemplates(accountId)`,
`useDirectoryMetaPhoneNumbers(accountId)` (`enabled: !!accountId`).

**Where**:
- `packages/api-client/src/channel/get-channel-directory.api.ts` (new).
- `packages/api-client/src/channel/use-directory-meta-templates.ts` (new).
- `packages/api-client/src/channel/use-directory-meta-phone-numbers.ts` (new).
- `packages/api-client/src/query-keys.ts` (modify — already touched by T12; coordinate at merge).

**Depends on**: T6, T12 (shared helper).
**Reuses**: Same as T12.
**Requirement**: LOOKUP-12, LOOKUP-15, LOOKUP-16.

**Done when**:
- [ ] As T12.

**Tests**: thin-via-existing-web-tests + helper unit already covered in T12.
**Gate**: quick.

---

### T14: `ReconnectConnectorEmptyState` composed primitive

**What**: New composed primitive — `EmptyState` wrapper rendering a
"Reconnect this connector" CTA. Props: `{ accountId, scope: 'crm' |
'channel', to: NavigateOptions, message?: string }`.

**Where**: `apps/web/src/components/composed/reconnect-connector-empty-state.tsx` (new).
**Depends on**: T12.
**Reuses**: `EmptyState` + `Button` primitives; `useNavigate`.
**Requirement**: LOOKUP-04, LOOKUP-15.

**Done when**:
- [ ] Component is fat (branchy copy + action wiring): one focused web jsdom spec covers the action button calls `navigate(to)`.
- [ ] Web quick gate green.

**Tests**: web (jsdom unit, one spec).
**Gate**: quick.

---

### T15 [P]: Member-identity user picker

**What**: Swap the `externalId` `<Input>` to a `<Controller>`-wrapped
`LookupSelect` fed by `useDirectoryPipedriveUsers`. Render
`ReconnectConnectorEmptyState` when `error.needsReconnect === true`.

**Where**: `apps/web/src/routes/_app/settings/connectors/-components/member-identity-form.tsx` (modify; verify exact filename when executing).

**Depends on**: T12, T14.
**Reuses**: `LookupSelect` primitive; RHF `Controller` pattern from `web-patterns.md` §3.b.
**Requirement**: LOOKUP-01, LOOKUP-03 (refresh), LOOKUP-04.

**Done when**:
- [ ] Form submits the picked Pipedrive user's id as `externalId`.
- [ ] The build target compiles; chrome smoke shows the picker populated against a real Pipedrive account.
- [ ] Build gate green: `bun check`.

**Tests**: thin (covered by browser smoke verification at PR review).
**Gate**: build.

---

### T16 [P]: Entry-trigger pipeline + stage pickers

**What**: Inside the existing entry-trigger create/edit dialog, replace
the pipeline/stage `<Input>`s with two cascading `LookupSelect`s. Stage
combobox `disabled` until pipeline is picked; clear `stageId` form value
when `pipelineId` changes. Empty-pipelines branch renders `EmptyState`
linking to Pipedrive's pipeline-management URL.

**Where**: `apps/web/src/routes/_app/settings/connectors/-dialogs/create-entry-trigger-dialog.tsx` (modify; mirror for the edit dialog if separate).

**Depends on**: T12, T14.
**Reuses**: `LookupSelect`, RHF `Controller`, `useEffect` clearing pattern.
**Requirement**: LOOKUP-06, LOOKUP-07, LOOKUP-08.

**Done when**:
- [ ] Form submits the chosen pipeline + stage as `pipelineId` / `stageId`.
- [ ] Switching pipeline clears the stage (verifiable inline by a small unit on the clearing effect, or by chrome smoke).
- [ ] Build gate green: `bun check`.

**Tests**: thin (chrome smoke); the clearing effect is fat enough to deserve a focused web unit spec — `generate-tests` confirms.
**Gate**: build.

---

### T17 [P]: Cadence-step Meta template picker

**What**: Inside the cadence-steps editor's WhatsApp-template step
configuration, swap the `templateName` `<Input>` for a `LookupSelect`
fed by `useDirectoryMetaTemplates(channelAccountId)`. On select, bind
both `name` and `language` to form state — the template determines
language. Zero-approved-templates state blocks save.

**Where**: `apps/web/src/routes/_app/workspace/cadences/-components/cadence-steps-editor.tsx` (modify; targeted to the WhatsApp-template-step block only).

**Depends on**: T13, T14.
**Reuses**: `LookupSelect`; existing RHF wiring inside the editor.
**Requirement**: LOOKUP-12, LOOKUP-13, LOOKUP-14, LOOKUP-15.

**Done when**:
- [ ] Step config submits template name + language correctly.
- [ ] Build gate green.

**Tests**: thin (chrome smoke); `generate-tests` confirms.
**Gate**: build.

---

### T18 [P]: Connect-meta-coex phone-number picker + roster checks

**What**: In `connect-meta-coex.tsx`, after the postMessage delivers
`wabaId` + `phone_number_id`, mount `useDirectoryMetaPhoneNumbers(...)`.
Render a `LookupSelect`; pre-select the postMessage value; surface the
mismatch warning when the value is absent from the roster; disable
`Finish connect` when the roster is empty.

This task's prerequisite is a Channel-account row (the use case loads
credentials via `findWorkspaceAndCredentials`). For Coex the row is
created **at Finish** today, so the picker must run on the *just-exchanged*
token rather than a persisted row. Two execution choices, decided at task
start by reading the current code:

- **Path A** (preferred if feasible): The Coex use case stages the row
  before the picker step (write through-then-replace if Finish is
  cancelled), so the existing endpoint works unchanged.
- **Path B** (fallback): Add a small `POST /channel-accounts/meta-whatsapp/preview-phone-numbers`
  endpoint that takes the exchanged token + wabaId directly and reuses
  `MetaCloudApi.listPhoneNumbers`. Workspace scope enforced by guard.

Path is chosen during Execute and recorded in this file before the
sub-agent starts code; this is the only task that may grow new endpoint
work outside the directory module.

**Where**: `apps/web/src/routes/_app/workspace/connect-meta-coex/-components/connect-meta-coex.tsx` + possibly api additions per chosen path.
**Depends on**: T13, T14, T11 (path A) or T11 + new endpoint (path B).
**Reuses**: Existing Coex component scaffolding.
**Requirement**: LOOKUP-16, LOOKUP-17, LOOKUP-18.

**Done when**:
- [ ] Picker renders against a real WABA on a sample app id; mismatch warning shows when forced.
- [ ] Empty-roster disables Finish.
- [ ] Build gate green.

**Tests**: thin (chrome smoke); the mismatch-detection helper is fat (boolean over the roster + postMessage value) and gets a focused web unit spec.
**Gate**: build.

---

### T19 [P]: Pipedrive fields directory (UI swap deferred)

**What**: Ship the Pipedrive `fields` directory endpoint, plugin support,
and api-client hook (`useDirectoryPipedriveFields`). No UI swap in this
feature because the variable-resolver UI does not exist yet (feature 048
was server-side only). The hook is consumable when the resolver UI lands.

**Where**: Already covered structurally by T8 (`listDealFields`) + T12
(`use-directory-pipedrive-fields.ts`). This task **adds nothing new** —
it explicitly documents the deferral so reviewers can verify the
endpoint and hook ship green even though no surface consumes them yet.

**Depends on**: T8, T12.
**Reuses**: Everything from T8/T12.
**Requirement**: LOOKUP-09 (endpoint), LOOKUP-10/LOOKUP-11 (UI surface deferred).

**Done when**:
- [ ] Endpoint + hook present and typechecked.
- [ ] A note added to `STATE.md` under "Deferred ideas": "Custom-field picker UI lands when variable-resolver UI is built."

**Tests**: covered by T8/T12.
**Gate**: build.

---

### T20: E2E for both directory endpoints

**What**: Two e2e specs hitting the seeded workspace + account flow.
Each spec confirms: 200 happy path, 404 cross-workspace, 422
unsupported-resource, 422 token-expired (forced by faking the plugin's
fetch). The Pipedrive plugin's `fetchFn` is overridden via the same
`Object.defineProperty` trick used in `meta-coex-connect.spec.ts`.

**Where**:
- `apps/api/src/__test__/e2e/connector-directory.spec.ts` (new).
- `apps/api/src/__test__/e2e/channel-directory.spec.ts` (new).

**Depends on**: T10, T11, T8, T9 (so the use case actually has a directory implementation to dispatch into).
**Reuses**: Existing e2e harness; `createTestApp`; seeding helpers.
**Requirement**: covers the controller half of LOOKUP-01..22.

**Done when**:
- [ ] Both specs author the four canonical cases (per `generate-tests` thin-via-e2e classification).
- [ ] Full gate green: `bun test:e2e`.

**Tests**: e2e (thin layer coverage).
**Gate**: full.

---

### T21: CONCERNS.md update + closeout

**What**: Add two short entries to `.specs/codebase/CONCERNS.md` flagging
the deferred items so they're tracked:
- **In-memory cache only** — one process scope; revisit on second API replica.
- **No provider-side filter for long lists** — fine to ~500 entries; client-side filter beyond that hurts modal open latency.

Also add a one-liner in `.specs/project/STATE.md`'s "Deferred ideas":
"054 custom-field UI swap awaits variable-resolver surface."

**Where**:
- `.specs/codebase/CONCERNS.md` (modify).
- `.specs/project/STATE.md` (modify).

**Depends on**: T20.
**Reuses**: Existing concern entries' format.
**Requirement**: design's "concerns acknowledged" section.

**Done when**:
- [ ] Entries present; markdown lints clean.
- [ ] Final `bun check` green.

**Tests**: none.
**Gate**: build.

---

## Parallel Execution Map

```
Phase 1 (sequential):
  T1, T2 ──┬─→ T3 ──┐
           │        │
           │        └─→ T7
           │
  T4, T5, T6 (any order; all depend on T1)

Phase 2 (parallel within layer):
  T7 + T4 done ──┬── T8 [P]   Pipedrive directory impl
                 │
                 ├── T9 [P]   Meta directory impl
                 │
                 ├── T10      CRM use case + controller
                 │
                 ├── T11      Channel use case + controller
                 │
  T5 done ───────┴── T12 [P]  CRM api-client hooks
  T6, T12 done ───── T13 [P]  Channel api-client hooks

Phase 3 (parallel):
  T12 done ──→ T14 ──┬── T15 [P]   member-identity picker
                     ├── T16 [P]   entry-trigger pickers
                     ├── T17 [P]   cadence-step picker  (also depends on T13)
                     ├── T18 [P]   coex phone picker    (also depends on T13)
                     └── T19 [P]   fields endpoint deferral note

Phase 4 (sequential):
  All Phase 3 done ──→ T20 ──→ T21
```

**Parallelism constraint check:**

| Task | Test Type | Parallel-Safe? (per TESTING.md) | `[P]` valid? |
| --- | --- | --- | --- |
| T8 | unit | Yes | ✅ |
| T9 | unit | Yes | ✅ |
| T12 | web (helper unit) | Yes | ✅ |
| T13 | web | Yes | ✅ |
| T15..T19 | thin via build/chrome smoke | Yes (no test execution in parallel) | ✅ |
| T20 | e2e | **No** — serialized fileParallelism: false. Single task → not affected. | n/a |

No task marked `[P]` writes to the same file as another `[P]` task in the
same phase (entry-trigger, cadence editor, coex, and member-identity all
live in different files; T19 only adds docs entries).

---

## Diagram-Definition Cross-Check

| Task | `Depends on` (body) | Diagram shows | Status |
| --- | --- | --- | --- |
| T1 | — | root | ✅ |
| T2 | — | root | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T1 | T1 → T5 | ✅ |
| T6 | T1 | T1 → T6 | ✅ |
| T7 | T2, T3 | T2 → T7, T3 → T7 | ✅ |
| T8 | T4 | T4 → T8 | ✅ |
| T9 | T4 | T4 → T9 | ✅ |
| T10 | T2, T3, T4, T5, T7 | All present in Phase 2 entry condition | ✅ |
| T11 | T2, T3, T4, T6, T7 | Same | ✅ |
| T12 | T5 | T5 → T12 | ✅ |
| T13 | T6, T12 | T6 → T13, T12 → T13 | ✅ |
| T14 | T12 | T12 → T14 | ✅ |
| T15 | T12, T14 | T14 → T15 (T12 transitively) | ✅ |
| T16 | T12, T14 | T14 → T16 | ✅ |
| T17 | T13, T14 | T14 → T17 (T13 transitively) | ✅ |
| T18 | T13, T14, T11 | T14 → T18 (T13/T11 transitively) | ✅ |
| T19 | T8, T12 | Phase 3 cluster (no new arrows) | ✅ |
| T20 | T10, T11, T8, T9 | Phase 4 enters once Phase 3 done (no new arrows; T10/T11/T8/T9 all done by then) | ✅ |
| T21 | T20 | T20 → T21 | ✅ |

All `Depends on` fields are reachable from the diagram. No cycles. No
`[P]` siblings depend on each other.

---

## Test Co-location Validation

| Task | Code layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | shared schema | none | none | ✅ |
| T2 | error classes | none (thin constructors) | none | ✅ |
| T3 | service (fat) | unit | unit | ✅ |
| T4 | interface only | none | none | ✅ |
| T5 | contract | none | none | ✅ |
| T6 | contract | none | none | ✅ |
| T7 | module wiring (thin) | none (thin; covered by e2e) | none | ✅ |
| T8 | provider plugin (fat — URL/error mapping/parse) | unit | unit | ✅ |
| T9 | provider plugin (fat) | unit | unit | ✅ |
| T10 | use case (fat) + controller (thin) | unit + e2e | unit + thin-via-T20 | ✅ |
| T11 | use case (fat) + controller (thin) | unit + e2e | unit + thin-via-T20 | ✅ |
| T12 | api-client helper (fat error map) + hooks (thin) | web (jsdom) | web | ✅ |
| T13 | api-client hooks (thin) | none (covered by web e2e) | none | ✅ |
| T14 | composed component (fat — copy + action) | web (jsdom) | web | ✅ |
| T15..T18 | UI swaps (thin orchestrations) | none (browser e2e) | none | ✅ |
| T16 cascading-clear effect | fat slice | web | web | ✅ |
| T18 mismatch helper | fat | web | web | ✅ |
| T19 | docs only | none | none | ✅ |
| T20 | e2e (HTTP controllers) | e2e | e2e | ✅ |
| T21 | docs | none | none | ✅ |

No violations.

---

## Tools / Skills per task

- **Implementation**: `generate-tests` (every task with `Tests: unit/web/e2e`), `codegraph` (cheap recon before writing), `Edit`/`Write` for code, `Bash` for gates.
- **Verification at PR**: `thermo-nuclear-code-quality-review`, `review-and-ship`, `ci-watcher`, `fix-ci`.
- **No new MCPs required** beyond what the project already ships.

---

## Commit plan

One commit per task except where two tightly-coupled tasks land on the
same file (T5+T6 share `routes/index.ts`; T12+T13 share `query-keys.ts`).
Commit subjects use Conventional Commits with the existing scopes
(`api` / `web` / `infra` / `deps`):

- T1: `feat(api): shared connector directory contract`
- T2: `feat(api): connector directory error vocabulary`
- T3: `feat(api): in-process directory cache service`
- T4: `feat(api): optional directory port on connector + channel plugins`
- T5+T6: `feat(api): connector directory routes + contracts`
- T7: `feat(api): wire shared directory module`
- T8: `feat(api): Pipedrive directory implementation`
- T9: `feat(api): Meta directory implementation`
- T10: `feat(api): CRM directory use case + endpoint`
- T11: `feat(api): channel directory use case + endpoint`
- T12+T13: `feat(api): typed directory hooks for crm and channel`
- T14: `feat(web): reconnect-connector empty state primitive`
- T15: `feat(web): pipedrive user picker on member-identity admin`
- T16: `feat(web): pipedrive pipeline + stage pickers on entry-trigger`
- T17: `feat(web): meta template picker on cadence step`
- T18: `feat(web): meta phone-number picker on coex confirm`
- T19: `chore(api): defer custom-field picker UI until resolver lands`
- T20: `test(api): directory endpoints e2e`
- T21: `docs: capture connector-lookups concerns and deferred items`
