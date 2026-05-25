# WhatsApp Coex as a second channel plugin — Tasks

**Design**: `.specs/features/058-meta-whatsapp-coex-as-plugin/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Contract foundation (sequential)

T1 → T2 → T3

T1 introduces the `ChannelPluginConnect` enum + `metaCoexistenceCredentialsSchema`.
T2 extends the manifest interface + `defineChannelPlugin` defaulting/branching.
T3 extends the `ChannelPlugins` response contract + `AvailablePlugin` interface.

### Phase 2: API plugin + helper relocation (parallel after T2)

```
T2 ──┬─→ T4 ─┐
     └─→ T5 ─┴─→ T6 → T7
T1 ─→ T4
```

- T4 [P]: build `meta-whatsapp-coex.plugin.ts` (depends on T1, T2).
- T5 [P]: relocate `finalizeMetaCoexConnection` / `CoexConnectionInput` to
  `meta-whatsapp-coex/meta-coex-finalize.ts`.
- T6: wire both plugins into `ChannelModule`'s `CHANNEL_PLUGINS` factory.
- T7: update `ListAvailablePluginsUseCase` to expose `connect`, and
  exercise the response shape via e2e against `GET /channel-plugins`.

### Phase 3: Connect endpoint, webhook, data migration (sequential)

T8 → T9 → T10 → T11

- T8: update `ConnectMetaCoexUseCase` to write `pluginId='meta-whatsapp-coex'`;
  update `connect-meta-coex.contract.ts` literal.
- T9: fix `MetaWebhookController.receive` to dispatch by the row's
  actual `pluginId`; extend `ChannelAccountRepository.findWorkspaceAndCredentials`
  to return `pluginId`.
- T10: generate the data migration (`bun db:generate`) and add the
  custom SQL UPDATE; verify Drizzle checksums.
- T11: integration spec proving the migration flips pre-existing
  coexistence rows and is a no-op on Cloud API rows / empty schemas.

### Phase 4: Web client (parallel after T3 + T7 + T8)

```
T3 ─┐
T7 ─┼─→ T12 ─┬─→ T13 ─→ T16
T8 ─┘       ├─→ T14
            └─→ T15
```

- T12: add `MetaPluginId` / `META_PLUGIN_IDS` / `isMetaPluginId` helpers
  in `@kizunu/api-contracts/channel/meta-plugin-ids.ts`; update
  `template-form.tsx` to use them.
- T13: build `ConnectMetaCoexPanel` (dialog-friendly variant or shared
  `useEmbeddedSignup` hook + thin renderer).
- T14: add `hideAction` prop to `ResourceDialog` (one-line UI primitive
  change + tiny test).
- T15: branch `ChannelAccountForm` on `manifest.connect.kind` and wire
  `ConnectMetaCoexPanel` for OAuth; `CreateChannelAccountDialog` passes
  `hideAction` based on selected plugin.
- T16: convert `/workspace/connect-meta-coex` to a `beforeLoad` redirect
  to `/settings/channels?addCoex=1`; `settings/channels/index.tsx`
  reads `addCoex` from the validated search schema and auto-opens the
  dialog with Coex preselected.

### Phase 5: End-to-end verification (sequential)

T17 → T18

- T17: E2E spec for the full Coex onboarding path: `GET /channel-plugins`
  returns the new plugin; `POST .../meta-whatsapp/connect` writes a row
  with `pluginId='meta-whatsapp-coex'`; webhook against that row routes
  parseInbound correctly.
- T18: full `bun check` + `thermo-nuclear-code-quality-review` + manual
  browser verification via the `run`/`verify` skill against a Coex
  sandbox (or a stubbed FB flow if a sandbox isn't available).

---

## Task Breakdown

### T1: Add `ChannelPluginConnect` enum and `metaCoexistenceCredentialsSchema` export

**What**: Create the new enum file in the channel core, and add the
coexistence-only schema export to the contracts package with an
`Assert<Equal<...>>` to the existing union variant.

**Where**:
- `apps/api/src/modules/channel/core/plugin/channel-plugin-connect.ts` (new)
- `packages/api-contracts/src/channel/meta-credentials.contract.ts` (additive)
- `packages/api-contracts/src/channel/index.ts` (re-export)

**Depends on**: none.

**Reuses**: enum pattern from
`apps/api/src/modules/workspace/core/domain/verification-token.ts`;
`Assert<Equal>` from `@kizunu/nestjs-shared`.

**Requirement**: COEX-03 (typed `connect`), COEX-10/11 (the schema the
migrated rows parse against).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` for the type-assertion + a focused schema
  parse test.

**Done when**:
- [ ] `ChannelPluginConnect`, `ChannelPluginConnectKind`, `OauthProvider`
  exported.
- [ ] `metaCoexistenceCredentialsSchema` + `MetaCoexistenceCredentials`
  re-exported; `Assert<Equal<MetaCoexistenceCredentials, OldDiscriminatedVariant>>` passes typecheck.
- [ ] Schema accepts a valid coexistence row and rejects a malformed one
  (one unit spec).
- [ ] Gate passes: `bun test:unit && bun typecheck`.
- [ ] Test count: existing passing + 1+ new tests.

**Tests**: unit (web jsdom not needed — pure zod + types).
**Gate**: quick.

---

### T2: Extend `ChannelPluginManifest` and `defineChannelPlugin` for `connect`

**What**: Add the optional `connect` field on the manifest interface,
default it to `{ kind: 'credentials' }` in `defineChannelPlugin`, and
relax the flat-credentialFields assertion to skip OAuth plugins.

**Where**:
- `apps/api/src/modules/channel/core/plugin/channel-plugin-manifest.ts`
- `apps/api/src/modules/channel/core/plugin/define-channel-plugin.ts`
- `apps/api/src/modules/channel/core/plugin/__test__/unit/define-channel-plugin.spec.ts` (new or extended)

**Depends on**: T1.

**Reuses**: existing `defineChannelPlugin` factory + its
`PluginCredentialsShapeUnsupportedException` guard.

**Requirement**: COEX-03.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (fat: the new conditional in
  `defineChannelPlugin`).

**Done when**:
- [ ] `ChannelPluginManifest` carries `connect?: ChannelPluginConnect`.
- [ ] `defineChannelPlugin` returns a manifest with `connect`
  defaulting to `{ kind: 'credentials' }` when omitted, preserved
  when present.
- [ ] When `manifest.connect.kind === 'oauth'`, the flat-credentialFields
  assertion is skipped and `credentialFields` is set to `[]`.
- [ ] One unit spec each for: default-credentials, explicit-credentials,
  explicit-oauth-with-empty-fields, oauth-with-non-object-schema-rejected.
- [ ] Gate passes: `bun test:unit && bun typecheck`.

**Tests**: unit.
**Gate**: quick.

---

### T3: Extend `ChannelPluginsResponseSchema` with `connect`

**What**: Add `connect: ChannelPluginConnectSchema` to the contract and
the inferred response type.

**Where**: `packages/api-contracts/src/channel/channel-plugins.contract.ts`.

**Depends on**: T1.

**Reuses**: existing zod discriminator usage in the contracts package.

**Requirement**: COEX-03.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (small unit spec on schema parsing).

**Done when**:
- [ ] `ChannelPluginConnectSchema` exported.
- [ ] Response schema carries `connect` per plugin.
- [ ] Unit spec: a credentials-shape and an oauth-shape entry both parse.
- [ ] Gate passes: `bun test:unit && bun typecheck`.

**Tests**: unit.
**Gate**: quick.

---

### T4: Build `meta-whatsapp-coex` plugin

**What**: New plugin builder under
`apps/api/src/modules/channel/plugins/meta-whatsapp-coex/`. Delegates
send/parseInbound/directory/validate to the same modules the Cloud API
plugin uses; defines `refreshCredentials` (no discriminator branch); no
`onAccountCreated`.

**Where**:
- `apps/api/src/modules/channel/plugins/meta-whatsapp-coex/meta-whatsapp-coex.plugin.ts` (new)
- `apps/api/src/modules/channel/plugins/meta-whatsapp-coex/__test__/unit/meta-whatsapp-coex.plugin.spec.ts` (new)

**Depends on**: T1, T2.

**Reuses**: `sendMetaMessage`, `parseMetaInbound`, `listMetaTemplates`,
`listMetaPhoneNumbers`, `isWithinServiceWindow`, `exchangeForRefreshedToken`,
`defineChannelPlugin`.

**Requirement**: COEX-01, COEX-02, COEX-11.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (fat: the plugin's `refreshCredentials` is
  a branch the unit spec proves; everything else is thin delegation
  covered by the existing meta-send/meta-inbound unit specs).

**Done when**:
- [ ] Plugin instance has manifest id `'meta-whatsapp-coex'`, name
  `'WhatsApp (Coex / Embedded Signup)'`, capabilities `[Freeform, Template]`,
  `connect: { kind: 'oauth', provider: 'meta-coex' }`,
  `configSchema: metaCoexistenceCredentialsSchema`.
- [ ] `refreshCredentials` calls `exchangeForRefreshedToken` and returns
  the merged credentials with new `accessToken` + `accessTokenExpiresAt`.
- [ ] Unit spec covers the refresh branch and one send/parseInbound
  delegation smoke test.
- [ ] Gate passes: `bun test:unit && bun typecheck`.

**Tests**: unit.
**Gate**: quick.

---

### T5: Relocate `finalizeMetaCoexConnection` to the Coex plugin folder

**What**: Move the helper + its `CoexConnectionInput` interface from
`meta-whatsapp.plugin.ts` to a new
`meta-whatsapp-coex/meta-coex-finalize.ts`. Update the single import
in `ConnectMetaCoexUseCase`.

**Where**:
- `apps/api/src/modules/channel/plugins/meta-whatsapp-coex/meta-coex-finalize.ts` (new)
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts` (remove)
- `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts` (import path)

**Depends on**: T2 (parallel-safe with T4, but T6 must come after both).

**Reuses**: existing helper body verbatim.

**Requirement**: COEX-11 (preserves Coex onboarding behavior).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` is not invoked — pure relocation. Existing
  `meta-coex-token.spec.ts` and the e2e in T17 cover behavior.

**Done when**:
- [ ] `finalizeMetaCoexConnection` and `CoexConnectionInput` exported
  from `meta-whatsapp-coex/meta-coex-finalize.ts`.
- [ ] `meta-whatsapp.plugin.ts` no longer references these symbols.
- [ ] `ConnectMetaCoexUseCase` import updated.
- [ ] Gate passes: `bun typecheck && bun test:unit`.

**Tests**: none (relocation; covered by existing unit + e2e specs).
**Gate**: quick.

---

### T6: Register both plugins in `ChannelModule.CHANNEL_PLUGINS`

**What**: Update the factory in `channel.module.ts` to return both
`buildMetaWhatsappPlugin(...)` and `buildMetaWhatsappCoexPlugin(...)`.

**Where**: `apps/api/src/modules/channel/channel.module.ts`.

**Depends on**: T4, T5.

**Reuses**: existing factory shape (already injects `ConfigService`).

**Requirement**: COEX-01.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` is not invoked — wiring change is covered by
  T7's e2e on `GET /channel-plugins`.

**Done when**:
- [ ] Factory returns both plugins; both receive the same
  `{ appId, appSecret }` config.
- [ ] Boot does not throw `DuplicateChannelPluginException` (two
  different ids).
- [ ] Gate passes: `bun typecheck`.

**Tests**: none (orchestration; covered by T7 e2e).
**Gate**: quick.

---

### T7: `ListAvailablePluginsUseCase` exposes `connect`; e2e on `GET /channel-plugins`

**What**: Update the use case to surface the `connect` descriptor on
each `AvailablePlugin`, and add an e2e spec asserting both plugins are
listed with the right descriptors.

**Where**:
- `apps/api/src/modules/channel/core/use-cases/list-available-plugins.use-case.ts`
- `apps/api/src/__test__/e2e/channel-plugins.spec.ts` (extend)

**Depends on**: T3, T6.

**Reuses**: existing controller / use case wiring.

**Requirement**: COEX-01, COEX-03.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (the e2e classifies this as a thin
  orchestration HTTP test).

**Done when**:
- [ ] `AvailablePlugin` interface carries `connect`.
- [ ] Use case forwards `manifest.connect` to the response.
- [ ] E2E asserts response contains both `meta-whatsapp`
  (`connect.kind='credentials'`) and `meta-whatsapp-coex`
  (`connect.kind='oauth'`, `provider='meta-coex'`).
- [ ] Gate passes: `bun test:e2e`.

**Tests**: e2e.
**Gate**: full.

---

### T8: `ConnectMetaCoexUseCase` writes `pluginId='meta-whatsapp-coex'`; contract literal updated

**What**: Rename the local constant, switch the row write to the new
id, update the use case's output type, and flip the literal in the
response contract.

**Where**:
- `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts`
- `packages/api-contracts/src/channel/connect-meta-coex.contract.ts`
- `apps/api/src/modules/channel/core/use-cases/__test__/unit/connect-meta-coex.use-case.spec.ts` if present, or new
  (only if `generate-tests` classifies the use case as fat).

**Depends on**: T7 (so the new plugin is registered before any row
writes happen against the new id).

**Reuses**: existing use case body.

**Requirement**: COEX-02, COEX-12.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (the use case is mostly thin orchestration,
  fat parts are `assertConfigured` and the exchange step — both already
  unit-tested elsewhere if specs exist).

**Done when**:
- [ ] Use case writes `pluginId='meta-whatsapp-coex'` and returns it.
- [ ] Response contract literal is `meta-whatsapp-coex`.
- [ ] Existing unit specs (if any) updated for the new id.
- [ ] Gate passes: `bun test:unit && bun typecheck`.

**Tests**: unit (only the fat assertions in the use case; thin
orchestration covered by T17 e2e).
**Gate**: quick.

---

### T9: Webhook controller + repository: dispatch by row's `pluginId`

**What**: Extend `ChannelAccountRepository.findWorkspaceAndCredentials`
to return `pluginId`. Update `MetaWebhookController.receive` to call
`registry.parseInbound(account.pluginId, ...)`. Remove the hard-coded
`META_PLUGIN_ID` constant from the controller.

**Where**:
- `apps/api/src/modules/channel/persistence/channel-account.repository.ts`
- `apps/api/src/modules/engine/http/controllers/meta-webhook.controller.ts`
- `apps/api/src/modules/channel/persistence/__test__/integration/channel-account.repository.spec.ts` (extend)

**Depends on**: T6 (the new plugin must be registered before a row's id
routes to it).

**Reuses**: existing repository method + registry dispatch.

**Requirement**: COEX-11 (existing rows keep working).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (integration: repository query result includes
  `pluginId`; e2e in T17 verifies webhook routing).

**Done when**:
- [ ] Repository method returns `{ workspaceId, pluginId, credentials }`.
- [ ] Controller uses `account.pluginId` for `parseInbound`.
- [ ] No `META_PLUGIN_ID` constant remains in
  `meta-webhook.controller.ts`.
- [ ] Integration spec asserts the new field is present.
- [ ] Gate passes: `bun test:integration && bun test:e2e`.

**Tests**: integration (repository); e2e covered in T17.
**Gate**: full.

---

### T10: Generate data migration flipping Coex rows' `pluginId`

**What**: Add a Drizzle custom migration with the UPDATE statement;
regenerate checksums via `bun db:generate` (NOT hand-edited).

**Where**:
- `apps/api/drizzle/<NNNN>_coex_plugin_id_flip.sql` (generated)
- `apps/api/drizzle/.checksums.json` (regenerated)

**Depends on**: T9 (so the webhook fix is in place before rows flip).

**Reuses**: existing Drizzle custom migration support; the
`drizzle-checksums.ts verify` gate.

**Requirement**: COEX-10, COEX-13, COEX-18.

**Tools**:
- MCP: NONE
- Skill: NONE for code (migration is generated). `generate-tests` for
  the integration spec in T11.

**Done when**:
- [ ] Custom migration contains the exact SQL from design.md.
- [ ] `bun db:setup` and `bun db:test:setup` apply the migration
  cleanly.
- [ ] `bun scripts/drizzle-checksums.ts verify` passes (no manual edits).
- [ ] Gate passes: `bun typecheck && bun scripts/drizzle-checksums.ts verify`.

**Tests**: none for code (migration); behavior proven by T11.
**Gate**: build.

---

### T11: Integration spec proving migration behavior

**What**: Integration spec that pre-seeds rows in `kizunu_test`:
- a `pluginId='meta-whatsapp'` + `channelMode='cloud_api'` row,
- a `pluginId='meta-whatsapp'` + `channelMode='coexistence'` row,
- a `pluginId='meta-whatsapp'` + corrupt credentials row,
then runs `db:migrate` and asserts:
- only the coexistence row's id flipped,
- the cloud_api row is unchanged,
- the corrupt row is unchanged,
- a second migration run is a no-op.

**Where**:
`apps/api/src/__test__/integration/coex-pluginid-migration.spec.ts` (new).

**Depends on**: T10.

**Reuses**: integration harness (`__test__/integration/db.ts`,
`truncateAll`).

**Requirement**: COEX-10, COEX-13, COEX-18.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (integration test).

**Done when**:
- [ ] All four assertions above pass.
- [ ] Gate passes: `bun test:integration`.

**Tests**: integration.
**Gate**: full.

---

### T12: `MetaPluginId` helpers + `template-form.tsx` update

**What**: New module
`packages/api-contracts/src/channel/meta-plugin-ids.ts` exporting
`MetaPluginId`, `META_PLUGIN_IDS`, `isMetaPluginId`. Update both
references in `template-form.tsx` to accept both ids.

**Where**:
- `packages/api-contracts/src/channel/meta-plugin-ids.ts` (new)
- `packages/api-contracts/src/channel/index.ts` (re-export)
- `apps/web/src/routes/_app/workspace/cadences/-components/template-form.tsx`

**Depends on**: none functionally (can run in Phase 1 alongside T1).
**Scheduled**: Phase 4 to keep web/api commits separate. Mark `[P]`
within Phase 4.

**Reuses**: enum-as-const-object pattern (`.agents/rules/enums.md` §1).

**Requirement**: COEX-11 (Coex accounts remain Meta in the cadence
template form).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (web jsdom unit spec on the helper).

**Done when**:
- [ ] Helpers exported with correct types.
- [ ] `template-form.tsx` channel filter uses `isMetaPluginId`; the
  `channelPluginId === 'meta-whatsapp'` checks accept both ids.
- [ ] Web unit spec covers the helper (true for both ids, false for
  others).
- [ ] Gate passes: `bunx vp test --project web && bun typecheck`.

**Tests**: web.
**Gate**: quick.

---

### T13: `ConnectMetaCoexPanel` (dialog-friendly OAuth panel) [P]

**What**: Extract the Embedded Signup logic (FB SDK loader,
postMessage listener, code/wabaId/phoneNumberId state, submit handler)
into a dialog-friendly component. Implementation chooses between a
shared `useEmbeddedSignup` hook + two thin renderers or two
near-identical components; both options must keep components ≤50 lines
per `react.md` §9.

**Where**:
- `apps/web/src/routes/_app/settings/channels/-components/connect-meta-coex-panel.tsx` (new)
- optional `apps/web/src/routes/_app/settings/channels/-hooks/use-embedded-signup.ts` (new if hook path chosen)
- `apps/web/src/routes/_app/settings/channels/-components/__test__/connect-meta-coex-panel.spec.tsx` (new — web jsdom spec on the disabled-when-env-missing branch and the postMessage parse)

**Depends on**: T8 (the `useConnectMetaCoex` mutation hook already
exists; depends on T8 only for the contract literal alignment).

**Reuses**: existing `ConnectMetaCoex` source as the starting point;
`useConnectMetaCoex` hook unchanged.

**Requirement**: COEX-04, COEX-15, COEX-16.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (web jsdom: fat parts are env-missing
  rendering, postMessage payload parsing).

**Done when**:
- [ ] Panel renders disabled state with the spec-defined copy when
  either `VITE_META_APP_ID` or `VITE_META_COEX_CONFIG_ID` is empty,
  without loading the FB SDK.
- [ ] Panel renders the buttons + status line when env is present.
- [ ] Web unit spec covers env-missing and postMessage payload parsing.
- [ ] Gate passes: `bunx vp test --project web && bun typecheck`.

**Tests**: web.
**Gate**: quick.

---

### T14: `ResourceDialog` `hideAction` prop [P]

**What**: Add an optional `hideAction?: boolean` prop to
`ResourceDialog` that, when true, omits the standard submit button in
the footer (Cancel remains visible).

**Where**:
- `apps/web/src/components/composed/resource-dialog.tsx`
- `apps/web/src/components/composed/__test__/resource-dialog.spec.tsx` (extend or new — one assertion)

**Depends on**: none (atomic primitive change).
**Scheduled**: Phase 4 in parallel with T13 and T12.

**Reuses**: existing `ResourceDialog` primitive.

**Requirement**: COEX-06 (no two competing submit buttons).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (one focused web jsdom spec).

**Done when**:
- [ ] With `hideAction={true}`, the action button is not rendered;
  Cancel remains.
- [ ] With `hideAction` unset or `false`, behavior is unchanged.
- [ ] Web unit spec covers both paths.
- [ ] Gate passes: `bunx vp test --project web && bun typecheck`.

**Tests**: web.
**Gate**: quick.

---

### T15: Branch `ChannelAccountForm` and dialog on `connect.kind`

**What**: Resolve the selected plugin's manifest from
`useChannelPlugins()`; for `credentials` render the existing form body;
for `oauth` render `ConnectMetaCoexPanel`. `CreateChannelAccountDialog`
passes `hideAction` to `ResourceDialog` based on the selected plugin.

**Where**:
- `apps/web/src/routes/_app/settings/channels/-components/channel-account-form.tsx`
- `apps/web/src/routes/_app/settings/channels/-dialogs/create-channel-account-dialog.tsx`
- `apps/web/src/routes/_app/settings/channels/-components/__test__/channel-account-form.spec.tsx` (extend)

**Depends on**: T3, T7, T13, T14.

**Reuses**: existing form shell, `useMutationDialog`, `useChannelPlugins`.

**Requirement**: COEX-04, COEX-05, COEX-06, COEX-07, COEX-08, COEX-09,
COEX-17.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (web jsdom: the branch logic — pick
  credentials plugin renders form, pick oauth plugin renders panel and
  hides footer action; switching back resets partial state).

**Done when**:
- [ ] When operator picks Cloud API → body shows `ChannelAccountFormBody`
  and footer shows action button.
- [ ] When operator picks Coex → body shows `ConnectMetaCoexPanel` and
  footer hides action button.
- [ ] Switching between picks resets the inner body's state (existing
  `key={pluginId}` extended to also wrap the OAuth panel).
- [ ] On successful OAuth submit, dialog closes and channel-accounts
  query is invalidated.
- [ ] Web unit spec covers branching, footer toggling, and reset on switch.
- [ ] Gate passes: `bunx vp test --project web && bun typecheck`.

**Tests**: web.
**Gate**: quick.

---

### T16: Redirect `/workspace/connect-meta-coex` to settings; auto-open dialog

**What**: Replace the page's `component` with `beforeLoad`-throwing
`redirect({ to: '/_app/settings/channels', search: { addCoex: 1 } })`.
Add `instrumentsSearchSchema`-style validated `addCoex` search param
to the channels route; the page auto-opens the New Channel dialog with
the Coex plugin preselected when `addCoex===1`. Remove the now-unused
page implementation and the `-components/connect-meta-coex.tsx` (its
logic lives in the panel via T13 — keep only if T13 chose the
two-renderer route).

**Where**:
- `apps/web/src/routes/_app/workspace/connect-meta-coex/index.tsx`
- `apps/web/src/routes/_app/settings/channels/index.tsx`
- `apps/web/src/routes/_app/settings/channels/-hooks/use-channels-search.ts` (new — Zod search schema per `web-patterns.md` §4)

**Depends on**: T15.

**Reuses**: TanStack Router redirect pattern from
`routes/auth/index.tsx`.

**Requirement**: COEX-14.

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (web jsdom: search schema parse spec; redirect
  behavior is thin, covered by manual verification in T18).

**Done when**:
- [ ] Visiting `/workspace/connect-meta-coex` redirects to
  `/settings/channels?addCoex=1` with no page render.
- [ ] On `addCoex=1`, dialog opens and Coex is the preselected plugin.
- [ ] No naked-container violation (`web-patterns.md` §1.5): the
  workspace `connect-meta-coex/` folder either becomes a redirect-only
  route or is removed entirely; if removed, no other file references it.
- [ ] Gate passes: `bunx vp test --project web && bun typecheck`.

**Tests**: web.
**Gate**: quick.

---

### T17: E2E — full Coex onboarding via the dialog endpoint

**What**: E2E spec exercising the API surface end to end:
- `GET /channel-plugins` returns both plugins with the right `connect`.
- `POST /workspaces/:wid/channel-accounts/meta-whatsapp/connect` writes
  a row with `pluginId='meta-whatsapp-coex'` and `channelMode='coexistence'`.
- A subsequent `POST /webhooks/meta/:channelAccountId` with a valid
  inbound payload returns 200 and is dispatched via the new plugin's
  `parseInbound` (proven by either the response count or a side-effect
  assertion on `MarkReplyUseCase`).

**Where**:
- `apps/api/src/__test__/e2e/channel-coex-flow.spec.ts` (new)
- Reuses `__test__/e2e/channel-directory-flow.spec.ts` style fakes for
  the Meta Graph fetch.

**Depends on**: T7, T8, T9, T10, T11, T12.

**Reuses**: `createTestApp`, `bun-polyfill.ts`, existing test fakes
for Meta exchange + WABA subscribe.

**Requirement**: COEX-01..COEX-13 (vertical-slice happy path).

**Tools**:
- MCP: NONE
- Skill: `generate-tests` (this is the e2e Co-located test for the
  thin connect/webhook controllers).

**Done when**:
- [ ] All three assertions above pass.
- [ ] Gate passes: `bun test:e2e`.

**Tests**: e2e.
**Gate**: full.

---

### T18: Full `bun check`, code-quality review, browser verification

**What**: Run the full gate, the maintainability review skill, and
verify the dialog flow against a real or sandboxed Meta Coex app via
the `run`/`verify` skills. Fix anything raised.

**Where**: branch root.

**Depends on**: T1–T17.

**Reuses**: AGENTS.md "Definition of Done" checklist.

**Requirement**: every COEX-NN (final verification).

**Tools**:
- MCP: NONE
- Skill: `thermo-nuclear-code-quality-review`, `run`, `verify`.

**Done when**:
- [ ] `bun check` is green.
- [ ] `thermo-nuclear-code-quality-review` raises nothing structural;
  every nit is addressed.
- [ ] Manual verification of the dialog flow in Chrome (sandboxed FB
  app) records the success path.
- [ ] No remaining `git grep "'meta-whatsapp'"` references outside
  the documented allowlist (Cloud API plugin manifest id, seed.ts,
  test fixtures).

**Tests**: none new (verification).
**Gate**: build.

---

## Parallel Execution Map

```
Phase 1 (Sequential — contracts):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel after T2):
  ┌── T4 [P]
  ├── T5 [P]      } both gated by T2; T4 also needs T1
  └── (synchronize)
  Then T6 → T7 (sequential)

Phase 3 (Sequential — connect/webhook/migration):
  T7 → T8 → T9 → T10 → T11

Phase 4 (Parallel after T3 + T7 + T8):
  ├── T12 [P]
  ├── T13 [P]
  ├── T14 [P]
  └── (synchronize)
  Then T15 (needs T13 + T14) → T16 (needs T15)

Phase 5 (Sequential — verification):
  T17 → T18
```

**Parallelism constraint:**

- T4 / T5 / T12 / T13 / T14 are `[P]`-safe — they touch independent
  files, write unit/web tests only (parallel-safe per TESTING.md), and
  share no mutable state.
- T7, T9, T11, T17 touch integration/e2e tests which are NOT
  parallel-safe (shared `kizunu_test` DB). They run sequentially in
  their phases.
- T10 (migration) must precede T11 and any e2e that exercises the new
  plugin id on stored rows.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 2-3 files (enum + schema export + index) | ✅ Granular |
| T2 | 1 interface + 1 factory + 1 test file | ✅ Granular |
| T3 | 1 contract file | ✅ Granular |
| T4 | 1 plugin file + 1 test file | ✅ Granular |
| T5 | Relocate 1 symbol pair across 3 files | ✅ Granular |
| T6 | 1 module wiring edit | ✅ Granular |
| T7 | 1 use-case edit + 1 e2e spec | ✅ Granular |
| T8 | 1 use-case + 1 contract literal (+ optional unit spec) | ✅ Granular |
| T9 | 1 repository method + 1 controller | ✅ Granular |
| T10 | 1 migration file | ✅ Granular |
| T11 | 1 integration spec | ✅ Granular |
| T12 | 1 helper module + 1 template-form update + 1 test | ✅ Granular |
| T13 | 1 component (optionally 1 hook) + 1 test | ✅ Granular |
| T14 | 1 prop + 1 test assertion | ✅ Granular |
| T15 | 2 file edits + 1 test extension | ✅ Granular |
| T16 | 1 redirect + 1 search schema + 1 page wiring | ✅ Granular |
| T17 | 1 e2e spec | ✅ Granular |
| T18 | Full gate + skills + manual | ✅ Verification phase |

All tasks are atomic.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram shows | Status |
| --- | --- | --- | --- |
| T1 | none | none (Phase 1 root) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 (Phase 1 ends with T3) | ✅ Match |
| T4 | T1, T2 | T1 → T4, T2 → T4 | ✅ Match |
| T5 | T2 | T2 → T5 | ✅ Match |
| T6 | T4, T5 | T4 → T6, T5 → T6 | ✅ Match |
| T7 | T3, T6 | T6 → T7; T3 is upstream via the contract path used by T7's e2e | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T6 | T6 → T9 (independent of T8 since T9 fixes webhook, not connect) ✱ | ✅ Match (sequenced via Phase 3 ordering) |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | none functionally; sequenced after Phase 1 | shown in Phase 4 root; depends on T3 transitively (uses contract export) | ✅ Match |
| T13 | T8 | T8 → T13 | ✅ Match |
| T14 | none | Phase 4 root | ✅ Match |
| T15 | T3, T7, T13, T14 | T3/T7/T8 → T13/T14 → T15 (T15 needs T13 + T14) | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T7, T8, T9, T10, T11, T12 | converges at Phase 5 root | ✅ Match |
| T18 | T1–T17 | terminal node | ✅ Match |

✱ T9's `Depends on` lists T6 (registry has both plugins) because the
controller fix references whatever id the repo returns — once both
plugins are registered, the controller works for either id. The Phase 3
sequence (T8 → T9 → T10) is implementation-ordering for review clarity,
not a hard data dependency.

---

## Test Co-location Validation

| Task | Code layer created / modified | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | Domain enum + zod schema (fat) | unit | unit | ✅ OK |
| T2 | Plugin factory (fat: conditional + assertion) | unit | unit | ✅ OK |
| T3 | Contract schema (thin — pure shape) | none (covered by T7 e2e) | unit (small parse spec for safety) | ✅ OK — exceeds matrix is fine |
| T4 | Plugin builder (fat: refreshCredentials branch) | unit | unit | ✅ OK |
| T5 | Code relocation, no behavior change | none | none | ✅ OK |
| T6 | Module wiring (thin orchestration) | none (covered by T7 e2e) | none | ✅ OK |
| T7 | Use-case + controller boundary (thin) | e2e | e2e | ✅ OK |
| T8 | Use-case + contract literal (mostly thin; assertConfigured is fat) | unit (for fat parts) | unit | ✅ OK |
| T9 | Repository query (carries returned shape — borderline fat) + controller | integration (repo) + e2e (controller, in T17) | integration | ✅ OK |
| T10 | Drizzle migration (data) | none (covered by T11 integration) | none | ✅ OK |
| T11 | Migration verification | integration | integration | ✅ OK |
| T12 | Web helper (fat: predicate) | web | web | ✅ OK |
| T13 | Web component (fat parts: env detection, postMessage parsing) | web | web | ✅ OK |
| T14 | Web primitive (thin) | web (minimal — one prop branch) | web | ✅ OK |
| T15 | Web composition (fat: kind branching) | web | web | ✅ OK |
| T16 | Web redirect + URL search schema (fat: schema; thin: redirect) | web | web | ✅ OK |
| T17 | Connect + webhook controllers (thin HTTP) | e2e | e2e | ✅ OK |
| T18 | Full gate + manual verification | none | none | ✅ OK |

All tasks pass test co-location. No `Tests: none` is used to defer
required tests — every "none" is either pure orchestration covered by
a sibling e2e, pure relocation, or final verification.

---

## MCPs and Skills per task

| Task | MCPs | Skills |
| --- | --- | --- |
| T1 | none | `generate-tests` (unit) |
| T2 | none | `generate-tests` (unit) |
| T3 | none | `generate-tests` (unit) |
| T4 | none | `generate-tests` (unit) |
| T5 | none | none |
| T6 | none | none |
| T7 | none | `generate-tests` (e2e) |
| T8 | none | `generate-tests` (unit for fat parts) |
| T9 | none | `generate-tests` (integration) |
| T10 | none | none (code-gen via `bun db:generate`) |
| T11 | none | `generate-tests` (integration) |
| T12 | none | `generate-tests` (web) |
| T13 | none | `generate-tests` (web) |
| T14 | none | `generate-tests` (web) |
| T15 | none | `generate-tests` (web) |
| T16 | none | `generate-tests` (web) |
| T17 | none | `generate-tests` (e2e) |
| T18 | none | `thermo-nuclear-code-quality-review`, `run`, `verify`, `review-and-ship`, `ci-watcher`, `fix-ci` (per AGENTS.md flow) |

---

## Commit plan

One conventional commit per task (`feat(api):` / `feat(web):` /
`refactor:` / `chore(db):` as appropriate). T18 is a verification phase
— fixes raised by the code-quality review become their own focused
commits.

Suggested subjects:
- T1 `feat(api-contracts): typed ChannelPluginConnect + coexistence-only schema (058)`
- T2 `feat(api): manifest gains connect descriptor; defineChannelPlugin defaults it (058)`
- T3 `feat(api-contracts): channel plugins response carries connect (058)`
- T4 `feat(api): register meta-whatsapp-coex channel plugin (058)`
- T5 `refactor(api): relocate finalizeMetaCoexConnection into coex plugin (058)`
- T6 `feat(api): wire meta-whatsapp-coex in ChannelModule (058)`
- T7 `feat(api): GET /channel-plugins exposes connect descriptor (058)`
- T8 `feat(api): ConnectMetaCoex writes pluginId=meta-whatsapp-coex (058)`
- T9 `fix(api): meta webhook parses inbound via row's pluginId (058)`
- T10 `chore(db): flip stored coexistence rows to meta-whatsapp-coex (058)`
- T11 `test(api): integration spec for coex plugin-id migration (058)`
- T12 `refactor(web): MetaPluginId helpers accept both ids in template form (058)`
- T13 `feat(web): ConnectMetaCoexPanel for in-dialog OAuth (058)`
- T14 `feat(web): ResourceDialog hideAction prop (058)`
- T15 `feat(web): channel dialog branches on plugin.connect.kind (058)`
- T16 `feat(web): redirect /workspace/connect-meta-coex to settings dialog (058)`
- T17 `test(api): e2e for meta-whatsapp-coex onboarding + webhook routing (058)`
- T18 `chore: 058 — final gate + code-quality review fixes`

---

## Notes for Execute

- Do NOT skip the `generate-tests` skill at any unit/web/integration/e2e
  step — AGENTS.md is explicit.
- The migration in T10 is **the** critical path item; T11 must run on a
  freshly seeded DB to actually exercise the UPDATE. Empty-DB regression
  is part of T11's assertions.
- T13 and T14 are the smallest tasks — start there for warm-up if
  parallel execution is unavailable.
- Browser verification in T18 requires a sandboxed Meta app or a fake
  postMessage harness; if neither is available, document the gap as a
  `SPEC_DEVIATION` in the PR description rather than silently skip.
