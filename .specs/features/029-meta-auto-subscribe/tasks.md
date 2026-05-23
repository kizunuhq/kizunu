# Feature 029 — Tasks

**Design**: `.specs/features/029-meta-auto-subscribe/design.md`
**Status**: Approved

---

## Execution Plan

### Phase 1: Foundations (Sequential)

Surface-level additions everyone else builds on.

```
T1 ──→ T2 ──→ T3
```

### Phase 2: Plugin internals (Parallel OK after Phase 1)

The helper and schema extensions can land independently.

```
        ┌──→ T4 ──┐
T3 ─────┤         ├──→ T6
        └──→ T5 ──┘
```

### Phase 3: Core wiring (Sequential)

The seam between the channel use-case and the new hook + the repo split.

```
T6 ─→ T7 ─→ T8
```

### Phase 4: Edge + env + web (Parallel OK)

Controller, config cleanup, and web form pick up the changes — none of them
depend on each other.

```
T8 ──→ T9 ──→ T10
                └──→ (Phase done)
T6 ────────────→ T11  [P with T9–T10]
```

---

## Task Breakdown

### T1: Add optional `onAccountCreated` hook to `ChannelPlugin`

**What**: Extend the frozen plugin port with an OPTIONAL post-validation hook that returns the credentials the use-case should persist.
**Where**: `apps/api/src/modules/channel/core/plugin/channel-plugin.ts` (+ new `on-account-created-input.ts`)
**Depends on**: None
**Reuses**: existing port types
**Requirement**: METASUB-01, METASUB-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ChannelPlugin` has `onAccountCreated?(input: OnAccountCreatedInput): Promise<unknown>`.
- [ ] `OnAccountCreatedInput` lives in a dedicated file (`one type per file`).
- [ ] No existing plugin/test fails to compile (`bun typecheck`).
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — interface change; behavior is exercised by T6/T8.
**Gate**: build

---

### T2: Add `serverGenerated?: boolean` to `ChannelCredentialFieldSchema`

**What**: The shared contract for the credentialFields descriptor gains a `serverGenerated` flag so plugins can declare keys that are filled server-side (not rendered as form inputs).
**Where**: `packages/api-contracts/src/channel/channel-plugins.contract.ts`
**Depends on**: None
**Reuses**: existing `ChannelCredentialFieldSchema` shape
**Requirement**: METASUB-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Schema gains `serverGenerated: z.boolean().optional()`.
- [ ] Type inference still compiles across `apps/api`, `apps/web`, and `packages/api-client`.
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — additive optional contract field; downstream tests in T6/T11 exercise the behavior.
**Gate**: build

---

### T3: Create `MetaSubscriptionFailedException`

**What**: New `ApplicationException` subclass for `channel.meta-subscription-failed` (422) with `{ step, metaStatus, metaError? }` context.
**Where**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception.ts`
**Depends on**: None
**Reuses**: `ApplicationException` from `@kizunu/nestjs-shared/lib/exceptions/application.exception`
**Requirement**: METASUB-04, METASUB-13, METASUB-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Class extends `ApplicationException` with code/message/status/context as spec'd.
- [ ] `step` is typed `'app-subscription' | 'waba-subscription'` (union).
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — single constructor, thin glue.
**Gate**: build

---

### T4: Implement `meta-subscribe.ts` helpers + unit tests [P with T5]

**What**: Two HTTP helpers wrapping the Graph API subscription calls (`subscribeAppToMeta`, `subscribeWabaToMeta`) and a `subscribeMetaChannel` composer that generates the per-channel verify token (`crypto.randomBytes(32).toString('hex')`).
**Where**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-subscribe.ts` (+ `__test__/unit/meta-subscribe.spec.ts`)
**Depends on**: T3
**Reuses**: `FetchFn` and `META_GRAPH_API_BASE` from `meta-send.ts`
**Requirement**: METASUB-01, METASUB-02, METASUB-13, METASUB-14

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `subscribeAppToMeta` POSTs `/{appId}/subscriptions` with the expected body and `access_token={appId}|{appSecret}`.
- [ ] `subscribeWabaToMeta` POSTs `/{wabaId}/subscribed_apps` with `override_callback_uri`, `verify_token`, `subscribed_fields=messages`, `access_token={systemToken}`.
- [ ] Non-2xx HTTP and `{ success: false }` bodies both throw `MetaSubscriptionFailedException` with the right `step`.
- [ ] `subscribeMetaChannel` returns `{ verifyToken }` with ≥64-char hex when both calls succeed.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: 5+ new tests pass (no silent deletions).

**Tests**: unit (fat — request body building + error decoration).
**Gate**: quick

---

### T5: Extend `metaCredentialsSchema` + update existing specs [P with T4]

**What**: Add `appId`, `appSecret`, `verifyToken` to `metaCredentialsSchema` (all `min(1)`, `.strict()` preserved). Update `meta-credentials.spec.ts` cases + `meta-credential-fields.spec.ts` drift guard.
**Where**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts` (+ `__test__/unit/meta-credentials.spec.ts`)
**Depends on**: None (T2 not required: the drift guard works regardless of `serverGenerated`).
**Reuses**: existing zod usage; existing drift guard generic iteration.
**Requirement**: METASUB-10, METASUB-11, METASUB-12

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] Schema accepts a full 6-field set; rejects missing any one of the 6.
- [ ] `meta-credentials.spec.ts` adds cases for each new required field (rejected on miss).
- [ ] `meta-credential-fields.spec.ts` still green: descriptor keys match schema keys (descriptor gains entries for the new fields in T6).
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: original 3 + 3 new = 6 cases for `meta-credentials.spec.ts`; drift guard count unchanged.

**Tests**: unit.
**Gate**: quick

---

### T6: Wire `MetaWhatsappPlugin.onAccountCreated` + descriptor flags

**What**: Plugin implements the optional hook; calls `subscribeMetaChannel`; returns the credentials enriched with the generated `verifyToken`. Adds the two new descriptor entries (`appId`, `appSecret`) + one server-generated entry (`verifyToken` with `serverGenerated: true`). Co-located unit test exercises happy path + each failure step.
**Where**: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts` (+ `__test__/unit/meta-whatsapp.plugin.spec.ts`)
**Depends on**: T1, T3, T4, T5, T2
**Reuses**: `metaCredentialsSchema.parse` in `send`; the `FetchFn` constructor option.
**Requirement**: METASUB-01, METASUB-02, METASUB-03, METASUB-10, METASUB-11, METASUB-13, METASUB-14

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] `onAccountCreated` validates input credentials, calls `subscribeMetaChannel`, returns the credentials with `verifyToken` set.
- [ ] `credentialFields` carries 6 entries; `verifyToken` flagged `serverGenerated: true`, the other 5 user-editable.
- [ ] Drift guard (`meta-credential-fields.spec.ts`) remains green.
- [ ] Plugin unit tests cover: happy path returns enriched creds; app-subscription failure surfaces `step: 'app-subscription'`; waba-subscription failure surfaces `step: 'waba-subscription'`.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: 3 new plugin tests; existing tests unchanged.

**Tests**: unit (fat — hook orchestration + descriptor shape).
**Gate**: quick

---

### T7: Extend `ChannelAccountRepository` with explicit id + workspace lookup

**What**: `create({ id?, … })` accepts an optional explicit id (passed into the Drizzle insert). Add `findWorkspaceAndCredentials(id)` returning `{ id, workspaceId, credentials }` — replaces the `findByPluginAndCredential` scan the controller used.
**Where**: `apps/api/src/modules/channel/persistence/channel-account.repository.ts`
**Depends on**: None
**Reuses**: existing `drizzle.db` patterns.
**Requirement**: METASUB-03, METASUB-05, METASUB-06, METASUB-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `create` accepts an optional `id`; when supplied, it is inserted; when not, Drizzle defaults apply.
- [ ] `findWorkspaceAndCredentials(id: string): Promise<{ id: string; workspaceId: string; credentials: unknown } | undefined>` is exported.
- [ ] No regressions in existing callers (only `CreateChannelAccountUseCase` calls `create`; nothing else used `findByPluginAndCredential` outside the webhook).
- [ ] Gate check passes: `bun typecheck`

**Tests**: none — thin SELECT/INSERT; the e2e in T9 exercises both paths end-to-end. (Matrix: repositories tested only when carrying query logic worth proving — this is straight CRUD.)
**Gate**: build

---

### T8: Refactor `CreateChannelAccountUseCase` to pre-mint + invoke hook

**What**: Use-case pre-mints `crypto.randomUUID()`, validates credentials via the registry, optionally invokes `plugin.onAccountCreated({ channelAccountId, appUrl, credentials })`, and persists the (possibly enriched) credentials with the explicit id. `appUrl` is injected via `ConfigService<Config>`.
**Where**: `apps/api/src/modules/channel/core/use-cases/create-channel-account.use-case.ts` (+ existing `__test__/unit/create-channel-account.use-case.spec.ts`)
**Depends on**: T1, T6, T7
**Reuses**: `ChannelPluginRegistry`, `ChannelAccountRepository`, `ConfigService`.
**Requirement**: METASUB-01, METASUB-03, METASUB-04, METASUB-10

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] Use-case injects `ConfigService<Config>` and reads `appUrl`.
- [ ] Use-case pre-mints id and threads it through to the repo + the hook.
- [ ] If `onAccountCreated` throws, `accounts.create` is NOT called.
- [ ] If plugin has no `onAccountCreated`, the original credentials are persisted (back-compat with the fake plugin).
- [ ] Unit test covers: hook called with id+appUrl, hook-throws → no persist, no-hook plugin path.
- [ ] Gate check passes: `bun test:unit`
- [ ] Test count: 3 new cases on top of any existing.

**Tests**: unit (fat — orchestration with a branching condition).
**Gate**: quick

---

### T9: Refactor `MetaWebhookController` to per-channel URL + e2e

**What**: Controller paths become `GET/POST /webhooks/meta/:channelAccountId`. GET verifies `hub.verify_token` against `credentials.verifyToken` from the channel-account row (`403` on mismatch, `404` on unknown id). POST loads the account, parses via plugin, calls `MarkReplyUseCase` per message in the row's workspace. The legacy `/webhooks/meta` routes are removed. Co-located e2e covers verify happy/fail/notfound + a routed POST.
**Where**: `apps/api/src/modules/engine/http/controllers/meta-webhook.controller.ts` (+ `__test__/e2e/meta-webhook.spec.ts`)
**Depends on**: T6, T7, T8
**Reuses**: `ChannelPluginRegistry.get(META_PLUGIN_ID)`, `MarkReplyUseCase`, the existing `@Public()` pattern, the `createTestApp` harness.
**Requirement**: METASUB-05, METASUB-06, METASUB-07, METASUB-08

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] Controller no longer injects `ConfigService` for `meta.verifyToken`.
- [ ] Controller injects `ChannelAccountRepository.findWorkspaceAndCredentials(id)` and uses it on both branches.
- [ ] E2E test verifies: 200 + challenge on matching token; 403 on mismatch; 404 on unknown id; POST with a sample inbound payload routes correctly and `MarkReply` is called with that workspace.
- [ ] Old `/webhooks/meta` (no id) returns 404 in the e2e harness.
- [ ] Gate check passes: `bun test:e2e`
- [ ] Test count: 4 new e2e cases (verify ok / verify fail / verify unknown / post-routes).

**Tests**: e2e.
**Gate**: full

---

### T10: Drop `meta.verifyToken` from config + env + compose

**What**: Remove `meta: { verifyToken }` from `configSchema` and `load()`. Remove `APP_META_VERIFY_TOKEN` from `apps/api/.env.example` and `deploy/docker-compose.yml`. Add a `APP_META_VERIFY_TOKEN` removal note to the release notes (commit body acceptable).
**Where**: `apps/api/src/api.config.ts`, `apps/api/.env.example`, `deploy/docker-compose.yml`
**Depends on**: T9
**Reuses**: existing config loader pattern.
**Requirement**: METASUB-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] No reference to `APP_META_VERIFY_TOKEN` remains in the repo: `rg APP_META_VERIFY_TOKEN` returns empty.
- [ ] No reference to `meta.verifyToken` remains: `rg "meta\\.verifyToken"` returns empty.
- [ ] Gate check passes: `bun check`

**Tests**: none — config drop; covered indirectly by T9's e2e (the controller no longer needs the token).
**Gate**: build

---

### T11: Web form skips server-generated descriptor entries [P with T9, T10]

**What**: The channel-account form filters out descriptor entries where `serverGenerated === true` before rendering inputs and before computing `hasRequiredCredentials`. Co-located fat-helper unit test exercises both branches.
**Where**: `apps/web/src/features/channel/components/channel-account-form.tsx` + the helper file the form imports (`hasRequiredCredentials` — locate via `rg`) + `__test__/has-required-credentials.spec.ts` (web project).
**Depends on**: T2, T6
**Reuses**: existing fat helper test pattern in `apps/web/src/**/__test__`.
**Requirement**: METASUB-11, METASUB-12

**Tools**:
- MCP: NONE
- Skill: `generate-tests`

**Done when**:
- [ ] The form does NOT render an input for any descriptor entry with `serverGenerated === true`.
- [ ] `hasRequiredCredentials` ignores `serverGenerated` entries (they're not user-provided).
- [ ] Existing form behaviors (other fields, secret masking) are unchanged.
- [ ] Gate check passes: `bunx vp test --project web`
- [ ] Test count: 2 new helper cases; existing web tests unchanged.

**Tests**: web (jsdom — fat helper).
**Gate**: quick

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel after T3):
  T3 complete, then:
    ├── T4 [P]
    └── T5 [P]

Phase 3 (Sequential):
  T4 + T5 complete, then:
    T6 ──→ T7 ──→ T8

Phase 4 (Mixed):
  T8 complete:
    T9 ──→ T10
  T6 complete (already true):
    T11 [P with T9–T10]
```

**Parallelism constraint:** unit + web are parallel-safe; e2e is not. T9 (e2e)
must run sequentially with anything else touching the DB. T11 (web) is jsdom
and parallel-safe.

---

## Task Granularity Check

| Task                                          | Scope                                                    | Status      |
| --------------------------------------------- | -------------------------------------------------------- | ----------- |
| T1: Add optional `onAccountCreated` to port   | 1 interface + 1 input type                               | ✅ Granular |
| T2: Add `serverGenerated` to credential field | 1 schema, additive                                       | ✅ Granular |
| T3: `MetaSubscriptionFailedException`         | 1 class                                                  | ✅ Granular |
| T4: `meta-subscribe.ts` helpers + tests       | 1 file (+ 1 spec) — three small helpers, one composer    | ✅ Granular |
| T5: Schema extension + spec updates           | 1 schema file + 1 spec file                              | ✅ Granular |
| T6: Plugin `onAccountCreated` + descriptor    | 1 file (+ 1 spec), one hook, one descriptor delta        | ✅ Granular |
| T7: Repo additions                            | 1 file, two methods, additive                            | ✅ Granular |
| T8: Use-case refactor                         | 1 file (+ existing spec), one method change              | ✅ Granular |
| T9: Webhook controller refactor + e2e         | 1 controller file + 1 e2e spec                           | ✅ Granular |
| T10: Config + env cleanup                     | 3 files, all deletions                                   | ✅ Granular |
| T11: Web form skip server-generated           | 1 component + 1 helper file (+ 1 spec)                   | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body)   | Diagram Shows               | Status   |
| ---- | ------------------------ | --------------------------- | -------- |
| T1   | None                     | (root)                      | ✅ Match |
| T2   | None                     | T1 → T2                     | ✅ Match (linear bootstrap, T1 first by convention; no semantic dep) |
| T3   | None                     | T2 → T3                     | ✅ Match (same — sequential bootstrap, no semantic dep) |
| T4   | T3                       | T3 → T4                     | ✅ Match |
| T5   | None (also OK after T3)  | T3 → T5                     | ✅ Match (drawn after T3 for ordering; no semantic dep) |
| T6   | T1, T3, T4, T5, T2       | T4 + T5 → T6                | ✅ Match (T1/T2/T3 implied via Phase 1 completion) |
| T7   | None                     | T6 → T7                     | ✅ Match (placed after T6 for sequential clarity; no semantic dep) |
| T8   | T1, T6, T7               | T6 → T7 → T8                | ✅ Match |
| T9   | T6, T7, T8               | T8 → T9                     | ✅ Match |
| T10  | T9                       | T9 → T10                    | ✅ Match |
| T11  | T2, T6                   | T6 → T11 (parallel with T9) | ✅ Match |

Phase-1 ordering between T1/T2/T3 is for legibility (one bootstrap concern at a
time) — they have no inter-task dependencies.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified                              | Matrix Requires                | Task Says   | Status |
| ---- | -------------------------------------------------------- | ------------------------------ | ----------- | ------ |
| T1   | Port interface (declaration only)                        | none (no behavior)             | none        | ✅ OK  |
| T2   | Shared contract schema (declaration only)                | none (additive optional)       | none        | ✅ OK  |
| T3   | Exception class (constructor only)                       | none (thin glue)               | none        | ✅ OK  |
| T4   | Pure helpers (fat — request body + error decoration)     | unit                           | unit        | ✅ OK  |
| T5   | Zod schema (fat — branches per required field)           | unit                           | unit        | ✅ OK  |
| T6   | Plugin implementation (fat — hook orchestration)         | unit                           | unit        | ✅ OK  |
| T7   | Repository methods (thin CRUD — straight SELECT/INSERT)  | none (e2e covers via T9)       | none        | ✅ OK  |
| T8   | Use-case (fat — branching on hook presence + failure)    | unit                           | unit        | ✅ OK  |
| T9   | HTTP controller                                          | e2e                            | e2e         | ✅ OK  |
| T10  | Config schema deletion + env files                       | none (boot is covered by e2e)  | none        | ✅ OK  |
| T11  | Web fat helper + thin component                          | web (helper); none (component) | web         | ✅ OK  |

---

## Commit Plan

One commit per task, conventional commits:

- T1: `refactor(channel-core): add optional onAccountCreated hook to ChannelPlugin port`
- T2: `feat(api-contracts): add serverGenerated flag to channel credential field`
- T3: `feat(channel-meta): add MetaSubscriptionFailedException`
- T4: `feat(channel-meta): add meta-subscribe helpers for app + WABA subscription`
- T5: `feat(channel-meta): extend metaCredentialsSchema with appId/appSecret/verifyToken`
- T6: `feat(channel-meta): implement onAccountCreated to auto-subscribe Meta webhook`
- T7: `feat(channel-persistence): accept explicit id and add findWorkspaceAndCredentials`
- T8: `refactor(channel-core): pre-mint id and invoke plugin onAccountCreated in create`
- T9: `feat(engine-meta-webhook): route by channelAccountId per-channel verify token`
- T10: `chore(api-config): drop APP_META_VERIFY_TOKEN now that channels carry their own`
- T11: `feat(web-channel): skip server-generated credential fields in account form`
