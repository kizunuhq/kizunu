# Channel Credentials Zod Builder — Tasks

**Design**: `.specs/features/056-channel-credentials-zod-builder/design.md`
**Status**: Draft

---

## Execution Plan

```
Phase 1 (Shared foundation — sequential):
  T1 → T2 → T3

Phase 2 (Channel contracts + port — sequential, on top of T3):
  T3 → T4 → T5 → T6 → T7

Phase 3 (Plugin & wiring migration — sequential, in-tree):
  T7 → T8 → T9 → T10 → T11

Phase 4 (Web form migration):
  T11 → T12 → T13

Phase 5 (Definition of Done):
  T13 → T14
```

Sequential throughout. Each task touches files the next one builds on; integration
test DB is not parallel-safe so e2e/integration gates run serialized anyway.

---

## Task Breakdown

### T1: Create `CredentialField` + `CredentialFieldKind` + `CredentialFields` types in contracts/shared

**What**: Add the canonical credential-field types in
`packages/api-contracts/src/shared/credentials/`. Match enums.md §1
(`CredentialFieldKind` as const-object + derived type). Export
`CredentialField`, `CredentialFields` (flat | discriminated union), and an
`index.ts` barrel.
**Where**:
- `packages/api-contracts/src/shared/credentials/credential-field-kind.ts`
- `packages/api-contracts/src/shared/credentials/credential-field.ts`
- `packages/api-contracts/src/shared/credentials/credential-fields.ts`
- `packages/api-contracts/src/shared/credentials/index.ts`
**Depends on**: None
**Reuses**: enums.md §1 (`as const` object pattern, see
`apps/api/src/modules/engine/core/domain/journey-event.ts` as canonical example).
**Requirement**: CCZB-09, CCZB-17

**Done when**:
- [ ] Three type files exist, one type per file, no comments other than
      `comments.md`-compliant *why* lines.
- [ ] `CredentialFieldKind = { Text: 'text', Secret: 'secret' } as const` with
      derived type.
- [ ] `CredentialField` interface has `key, label, kind, required,
      serverGenerated?`.
- [ ] `CredentialFields` is the `flat | discriminated` discriminated union.
- [ ] Barrel re-exports all four (kind value + kind type + field + fields).
- [ ] `bun typecheck` is green.

**Tests**: none (pure type declarations; covered by T2's walker tests).
**Gate**: build (`bun typecheck` subset is enough; full gate at T14).
**Commit**: `feat(api-contracts): add shared credential-field types`

---

### T2: Implement `describeCredentialFields` walker + `PluginCredentialsShapeUnsupportedException`

**What**: Add the introspection walker that turns a Zod schema into a
`CredentialFields` payload. Handles `ZodObject` (flat),
`ZodDiscriminatedUnion` (discriminated), unwraps one layer of
`ZodOptional`/`ZodDefault`/`ZodEffects`, throws
`PluginCredentialsShapeUnsupportedException` on anything else, and falls back
to `label = key`, `kind = 'text'` when `.meta()` is absent.
**Where**:
- `packages/api-contracts/src/shared/credentials/describe-credential-fields.ts`
- `packages/api-contracts/src/shared/credentials/plugin-credentials-shape-unsupported.exception.ts`
- `packages/api-contracts/src/shared/credentials/__test__/describe-credential-fields.spec.ts`
**Depends on**: T1
**Reuses**: Zod v4 introspection (`shape`, `_def.type`, `_def.discriminator`,
`_def.options`, `isOptional()`, `meta()`). Sample probe verified in design.md.
**Requirement**: CCZB-09, CCZB-10, CCZB-11, CCZB-17, CCZB-18, CCZB-19,
CCZB-20, CCZB-E1, CCZB-E2

**Done when**:
- [ ] `describeCredentialFields(schema)` returns the documented shapes for
      flat / discriminated inputs.
- [ ] Unit spec covers (a) flat Pipedrive-shaped fixture with required,
      optional, default, and `.meta({ serverGenerated: true })`; (b) Meta's
      discriminatedUnion fixture; (c) schema without `.meta()` (fallback);
      (d) unsupported shape (`z.string()` directly) throws
      `PluginCredentialsShapeUnsupportedException`.
- [ ] Walker uses **`generate-tests`** skill to author tests (thin/fat
      classification: walker is fat — branches per field kind / wrapper /
      schema shape).
- [ ] `bun test:unit --project unit` for this file is green.
- [ ] Gate check: `bun test:unit`.

**Tests**: unit (fat: pure transform with branches per shape).
**Gate**: quick.
**Commit**: `feat(api-contracts): describe credential fields from zod schema`

---

### T3: Move Meta credential schemas to `@kizunu/api-contracts/channel/meta-credentials.ts` with `.meta()` annotations

**What**: Move `cloudApiCredentialsSchema`, `coexistenceCredentialsSchema`,
`metaCredentialsSchema`, `metaCredentialsClientSchema`, `MetaCredentials`,
`MetaCloudApiCredentials`, `MetaCoexistenceCredentials`, `MetaCredentialsClientInput`
from `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts`
into `packages/api-contracts/src/channel/meta-credentials.ts`. Annotate every
field with `.meta({ label, kind, serverGenerated? })`. Delete the API-module
copy. Update all imports across the API + web to use the new path.
**Where**:
- New: `packages/api-contracts/src/channel/meta-credentials.ts`
- Delete: `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts`
- Edit imports in: `meta-whatsapp.plugin.ts`, `meta-send.ts`, `meta-inbound.ts`,
  `meta-subscribe.ts`, `meta-coex-token.ts`, `connect-meta-coex.use-case.ts`,
  meta-credentials test file (moved to `apps/api/.../__test__/unit/meta-credentials.spec.ts`
  or kept as a contracts-level fixture — see T2 fixture).
**Depends on**: T2 (walker exists so meta annotations are useful immediately)
**Reuses**: existing `oauthCredentialFields` from
`packages/api-contracts/src/shared/oauth-credential-fields.ts` (annotate
those fields with `.meta()` once, here).
**Requirement**: CCZB-03 (preserves enrichment return type), CCZB-09 (schema
is annotated), CCZB-10, CCZB-11

**Done when**:
- [ ] New file exists in contracts with the same external shape as today
      (same field set, `.strict()` preserved, discriminator union preserved).
- [ ] Every field carries `.meta({ label, kind: 'text' | 'secret', serverGenerated? })`.
- [ ] `oauthCredentialFields` mixin gains `.meta()` annotations.
- [ ] Old `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-credentials.ts`
      is removed and its consumers point at the contracts package.
- [ ] No `../../../` imports introduced (`scripts/check-import-depth.ts`
      green).
- [ ] `bun typecheck` green; `bun test:unit` green.

**Tests**: none (pure schema move + meta annotations; behaviour unchanged
because parsing rules are identical; T2 walker tests already prove the
introspection works).
**Gate**: quick.
**Commit**: `feat(api-contracts): move meta credential schemas with field meta`

---

### T4: Make `OnAccountCreatedInput`, `RefreshCredentialsInput`, `DirectoryInput` generic on the credentials type

**What**: Convert the three port-input shapes from `credentials: unknown` to
`credentials: T` with `T = unknown` default, so they can flow `z.infer<S>`
when the port becomes generic. Update call sites that explicitly annotate
these types to pass the new generic (or leave them at default).
**Where**:
- `apps/api/src/modules/channel/core/plugin/on-account-created-input.ts`
- `apps/api/src/modules/channel/core/plugin/refresh-credentials-input.ts`
- `apps/api/src/modules/_shared/directory/directory-input.ts`
**Depends on**: T3
**Reuses**: existing interfaces' fields.
**Requirement**: CCZB-01, CCZB-03

**Done when**:
- [ ] Each interface is `interface XInput<T = unknown>` with `credentials: T`.
- [ ] Consumer files compile against the default; no behavioural change.
- [ ] `bun typecheck` green.

**Tests**: none (pure type signature change covered by downstream tasks'
typecheck).
**Gate**: build.
**Commit**: `refactor(api/channel): make port-input shapes generic on credentials`

---

### T5: Make `ChannelPluginManifest<S>` and `ChannelPlugin<S>` generic

**What**: Convert both interfaces to take `S extends ZodTypeAny = ZodTypeAny`.
On the manifest, `configSchema: S` and `credentialFields: CredentialFields`
(the discriminated/flat shape). On the plugin, every credentials parameter
becomes `z.infer<S>`; optional methods now return `Promise<z.infer<S>>` instead
of `Promise<unknown>`.
**Where**:
- `apps/api/src/modules/channel/core/plugin/channel-plugin-manifest.ts`
- `apps/api/src/modules/channel/core/plugin/channel-plugin.ts`
- Update `apps/api/src/modules/channel/core/plugin/__test__/fake-channel-plugin.ts`
  to satisfy the new types (the test fake stays simple — it can pass
  `ZodTypeAny` and a tiny schema with one field).
**Depends on**: T4
**Reuses**: existing import surface.
**Requirement**: CCZB-01, CCZB-03

**Done when**:
- [ ] Both interfaces compile with the generic.
- [ ] `FakeChannelPlugin` updated (still implements the interface; uses its
      existing tiny config schema as `S`).
- [ ] `bun typecheck` green (the rest of the codebase still passes because
      `S` defaults to `ZodTypeAny`, keeping `z.infer<ZodTypeAny>` = `any` for
      legacy direct-call paths — those paths get removed in T7+).

**Tests**: none (T2 + T8+ exercise it).
**Gate**: build.
**Commit**: `refactor(api/channel): make ChannelPlugin and manifest generic on schema`

---

### T6: Add `defineChannelPlugin<S>` factory

**What**: Add the factory function that builds a `ChannelPlugin<S>` from a
spec that *omits* `credentialFields` on the manifest. The factory runs
`describeCredentialFields(spec.manifest.configSchema)` and stamps the derived
fields onto the manifest before returning. Unsupported shapes throw at
construction time.
**Where**:
- `apps/api/src/modules/channel/core/plugin/define-channel-plugin.ts`
- `apps/api/src/modules/channel/core/plugin/__test__/unit/define-channel-plugin.spec.ts`
**Depends on**: T5, T2 (walker), T1 (types)
**Reuses**: `describeCredentialFields`.
**Requirement**: CCZB-04, CCZB-09, CCZB-10, CCZB-E2

**Done when**:
- [ ] `defineChannelPlugin<S>(spec)` exists with the spec type
      `ChannelPluginSpec<S> = Omit<ChannelPlugin<S>, 'manifest'> & { manifest:
      Omit<ChannelPluginManifest<S>, 'credentialFields'> }`.
- [ ] Unit test (via `generate-tests`) covers: (a) factory output has derived
      `credentialFields` matching the schema; (b) `S` infers `z.infer<S>`
      inside method signatures (compile-time check using a `Expect<Equal<>>`
      helper or a typed test consumer); (c) factory throws when the schema is
      unsupported.
- [ ] `bun test:unit` green.

**Tests**: unit (fat — derivation logic, inference).
**Gate**: quick.
**Commit**: `feat(api/channel): add defineChannelPlugin factory`

---

### T7: Add typed-bridge methods to `ChannelPluginRegistry`

**What**: Add `send`, `parseInbound`, `directory`, `refreshCredentials`,
`onAccountCreated` methods on the registry. Each parses once via a shared
private `parse(id, raw)` helper, throws `InvalidChannelCredentialsException`
on failure, then calls the plugin's method with the typed value. The
`onAccountCreated` bridge **also re-validates** the plugin's return against
the same schema before returning, per design.
**Where**:
- `apps/api/src/modules/channel/core/plugin/channel-plugin-registry.ts`
- `apps/api/src/modules/channel/core/plugin/__test__/unit/channel-plugin-registry.spec.ts`
**Depends on**: T5, T6
**Reuses**: existing `InvalidChannelCredentialsException`,
`UnknownChannelPluginException`; existing `validateCredentials` left in place
(create path).
**Requirement**: CCZB-02, CCZB-05, CCZB-06, CCZB-07, CCZB-08, CCZB-E3,
CCZB-E5, CCZB-E6

**Done when**:
- [ ] Five bridge methods added; signatures per design.md.
- [ ] Shared `parse(id, raw)` private helper.
- [ ] `onAccountCreated` bridge re-parses plugin return; absence of plugin
      hook → returns input unchanged.
- [ ] Unit spec (`generate-tests`) covers: (a) each bridge calls the plugin
      with parsed credentials; (b) invalid credentials → 422 path
      (`InvalidChannelCredentialsException`); (c) unknown id →
      `UnknownChannelPluginException`; (d) `onAccountCreated` re-validates
      returned credentials; (e) missing optional hook short-circuits.
- [ ] `bun test:unit` green.

**Tests**: unit (fat — five branches × invalid-creds branch × unknown-id
branch).
**Gate**: quick.
**Commit**: `feat(api/channel): typed-bridge methods on plugin registry`

---

### T8: Rebuild `MetaWhatsappPlugin` via `defineChannelPlugin` (closure, no class)

**What**: Replace the `class MetaWhatsappPlugin implements ChannelPlugin {}`
declaration with a `buildMetaWhatsappPlugin({ baseUrl, fetchFn, config })`
factory that returns `defineChannelPlugin({ ... })`. The two private helpers
(`onCloudApiAccountCreated`, `onCoexAccountCreated`) become module-scope
functions. Drop every per-method `metaCredentialsSchema.parse(credentials)` —
the registry parses now. Drop the hand-written `credentialFields` array.
**Where**:
- `apps/api/src/modules/channel/plugins/meta-whatsapp/meta-whatsapp.plugin.ts`
- `apps/api/src/modules/channel/channel.module.ts` (update provider wiring:
  factory function instead of `useClass: MetaWhatsappPlugin`).
- Updated test files: any spec under `apps/api/.../plugins/meta-whatsapp/__test__/`
  that instantiates the plugin must use `buildMetaWhatsappPlugin(...)`.
**Depends on**: T6, T7, T3
**Reuses**: every helper currently imported by the class
(`sendMetaMessage`, `parseMetaInbound`, `listMetaTemplates`, `listMetaPhoneNumbers`,
`subscribeMetaChannel`, `subscribeWabaToMeta`, `exchangeForRefreshedToken`,
`isWithinServiceWindow`).
**Requirement**: CCZB-01, CCZB-02, CCZB-04, CCZB-09

**Done when**:
- [ ] `buildMetaWhatsappPlugin(deps)` exported; `MetaWhatsappPlugin` class
      removed.
- [ ] No `.parse(credentials)` calls remain inside the plugin's body.
- [ ] Manifest has no literal `credentialFields` array — derived by factory.
- [ ] All existing `meta-whatsapp.plugin.spec.ts`, `meta-credentials.spec.ts`,
      `meta-subscribe.spec.ts`, `meta-coex-token.spec.ts`,
      `meta-credential-fields.spec.ts` pass against the new shape (update via
      `generate-tests` skill — fat code, exact same behaviour, signatures
      change).
- [ ] `bun test:unit` + `bun test:integration` (channel repository) green.

**Tests**: unit (existing meta tests, signatures updated). Integration tests
in the channel repository remain unchanged behaviourally.
**Gate**: full.
**Commit**: `refactor(api/channel/meta): build plugin via defineChannelPlugin`

---

### T9: Migrate `CreateChannelAccountUseCase` and integration consumers to the registry bridges

**What**: Switch every direct `plugin.X(...)` call to its registry bridge.
Specifically:
- `CreateChannelAccountUseCase`: drop local `enrich(plugin, ...)`, call
  `registry.onAccountCreated(id, { channelAccountId, appUrl }, validatedCreds)`.
- `OAuthRefreshService`: call `registry.refreshCredentials(id,
  channelAccountId, rawCreds)`.
- `GetChannelDirectoryUseCase`: call `registry.directory(id, { accountId,
  resource, ... }, rawCreds)`.
- Any engine send path calling `plugin.send(...)` → `registry.send(...)`.
- Meta inbound handler calling `plugin.parseInbound(...)` →
  `registry.parseInbound(...)`.
**Where**:
- `apps/api/src/modules/channel/core/use-cases/create-channel-account.use-case.ts`
- `apps/api/src/modules/channel/core/services/oauth-refresh.service.ts`
- `apps/api/src/modules/channel/core/use-cases/get-channel-directory.use-case.ts`
- Engine module wherever the channel plugin is invoked for `send` (likely
  `apps/api/src/modules/engine/...`) — search and migrate.
- Meta inbound controller / handler — search and migrate.
- Update related test files via `generate-tests` (fat use-case specs).
**Depends on**: T7, T8
**Reuses**: existing use-case structure.
**Requirement**: CCZB-05, CCZB-06, CCZB-07, CCZB-08

**Done when**:
- [ ] `rg "plugin.send\(|plugin.parseInbound\(|plugin.directory\(|plugin.refreshCredentials\(|plugin.onAccountCreated\("
      apps/api/src/` returns 0 hits outside the registry and its tests.
- [ ] All channel-touching use-case unit tests pass.
- [ ] `bun test:e2e` (channel-account flow if present) and
      `bun test:integration` green.

**Tests**: unit (use-case fat tests updated). Integration/e2e covers the
service & controller flows.
**Gate**: full.
**Commit**: `refactor(api/channel): route plugin calls through registry bridges`

---

### T10: Server-side `GET /channel-plugins` response uses derived `credentialFields`

**What**: Update `ListAvailablePluginsUseCase` so the response builds its
`credentialFields` from the manifest's derived `CredentialFields` payload,
flattening the discriminated case to the operator-input fields (client-schema
projection) to preserve the existing wire shape. No changes to
`ChannelPluginsResponseSchema`.
**Where**:
- `apps/api/src/modules/channel/core/use-cases/list-available-plugins.use-case.ts`
- Existing e2e: `apps/api/src/**/__test__/e2e/*channel-plugins*` (verify
  response unchanged).
**Depends on**: T8
**Reuses**: contract `ChannelPluginsResponseSchema`,
`metaCredentialsClientSchema` (already the operator subset).
**Requirement**: CCZB-12

**Done when**:
- [ ] Use-case maps `manifest.credentialFields` (a `CredentialFields`) to the
      flat array contract: if `discriminated`, take the variant matching
      `metaCredentialsClientSchema`'s `channelMode` (i.e. `cloud_api`); if
      `flat`, return as-is. Filter out server-generated fields from the wire
      response if they are not present on the operator input schema.
- [ ] Existing e2e for `GET /channel-plugins` passes unchanged.

**Tests**: e2e (controller path).
**Gate**: full.
**Commit**: `refactor(api/channel): derive list-plugins response from manifest`

---

### T11: Add web client-side plugin schema registry (`-utils/plugin-client-schemas.ts`)

**What**: Add a tiny map of `pluginId → ZodTypeAny` on the web side, with one
entry today (`'meta-whatsapp': metaCredentialsClientSchema`). Used by the
form's dynamic resolver. Document the contract for Feature 057 (it adds
`pipedrive`).
**Where**:
- `apps/web/src/routes/_app/settings/channels/-utils/plugin-client-schemas.ts`
**Depends on**: T3
**Reuses**: `metaCredentialsClientSchema` from `@kizunu/api-contracts/channel`.
**Requirement**: CCZB-13, CCZB-14

**Done when**:
- [ ] Map declared with one typed entry; type-safe lookup helper
      `getCredentialsSchema(pluginId)` returns a fallback open schema
      (`z.record(z.string(), z.unknown())`) when an id is unknown, so the form
      never breaks on a new plugin server-side until the web is updated.
- [ ] `bun typecheck` green.

**Tests**: none (single literal map; covered by T12's form behaviour).
**Gate**: build.
**Commit**: `feat(web/channels): client-side per-plugin credentials schema map`

---

### T12: Rewire `channel-account-form.tsx` to use `zodResolver` on the per-plugin schema and delete `hasRequiredCredentials`

**What**: Build the form's resolver from
`CreateChannelAccountRequestBaseSchema.extend({ credentials:
getCredentialsSchema(pluginId) })`, re-binding on plugin change. Delete the
`hasRequiredCredentials` post-check and its `-utils` file. The form's
`onSubmit` no longer needs the runtime fallback branch. Per-field errors
surface via `errors.credentials.<key>.message` and render with `FieldError`.
**Where**:
- `apps/web/src/routes/_app/settings/channels/-components/channel-account-form.tsx`
- Delete: `apps/web/src/routes/_app/settings/channels/-utils/has-required-credentials.ts`
- Delete: `apps/web/src/routes/_app/settings/channels/-utils/__test__/has-required-credentials.spec.ts`
- Update existing form tests via `generate-tests`:
  `apps/web/src/routes/_app/settings/channels/-components/__test__/channel-account-form.spec.tsx`,
  `credential-fields-input.spec.tsx` (no change expected there).
**Depends on**: T11, T3
**Reuses**: `userInputFields`, `CredentialFieldsInput`, `PluginSelect`,
`RhfField`, `FormError`, `@hookform/resolvers/zod`.
**Requirement**: CCZB-13, CCZB-14, CCZB-15, CCZB-16, CCZB-E4

**Done when**:
- [ ] `rg "hasRequiredCredentials" apps/web/` returns 0 hits.
- [ ] Form spec covers: (a) missing required credential surfaces per-field
      error from the resolver; (b) plugin switch resets credentials and
      re-evaluates the resolver; (c) happy-path submit unchanged.
- [ ] `bunx vp test --project web` green for the spec.

**Tests**: web (fat form logic — dynamic resolver, per-field error path).
**Gate**: quick (`bunx vp test --project web`).
**Commit**: `feat(web/channels): validate credentials with per-plugin zod schema`

---

### T13: Add walker e2e/coverage proof in tests — Pipedrive-shape fixture proves Feature 057 readiness

**What**: Add a dedicated unit test under
`packages/api-contracts/src/shared/credentials/__test__/describe-credential-fields-pipedrive-fixture.spec.ts`
that declares a Pipedrive-shaped schema (annotated) and asserts the walker
returns the exact `{ kind: 'flat', fields }` payload that Feature 057 will
consume. The fixture lives only in the test file — no production Pipedrive
code added here.
**Where**:
- `packages/api-contracts/src/shared/credentials/__test__/describe-credential-fields-pipedrive-fixture.spec.ts`
**Depends on**: T2
**Reuses**: T2's walker.
**Requirement**: CCZB-17, CCZB-18, CCZB-19, CCZB-20

**Done when**:
- [ ] Test file declares a flat `z.object({ apiToken, companyDomain,
      activityType (default), phoneFieldKey (optional), webhookToken
      (optional, serverGenerated) }).strict()`.
- [ ] Asserts walker output kind/fields/required/serverGenerated/labels.
- [ ] `bun test:unit` green.

**Tests**: unit (fat — fixture test).
**Gate**: quick.
**Commit**: `test(api-contracts): prove credentialFields walker on flat schema`

---

### T14: Full Definition-of-Done gate

**What**: Run the full DoD pipeline per AGENTS.md and resolve anything red:
`bun check` (typecheck → vp check → tests → import-depth + zod-v4 +
drizzle-naming + drizzle-checksums), then `thermo-nuclear-code-quality-review`
on the branch diff, then `review-and-ship` to finalize commits and PR. Watch
CI with `ci-watcher`; if anything is red, run `fix-ci` and re-run check.
**Where**: project-wide.
**Depends on**: T13
**Reuses**: AGENTS.md flow steps 5–11.
**Requirement**: All; success criteria checklist.

**Done when**:
- [ ] `bun check` green locally.
- [ ] `thermo-nuclear-code-quality-review` raised issues are resolved (with
      `bun check` re-run after each pass).
- [ ] `review-and-ship` produced focused conventional commits and a PR
      against `master` with verification notes.
- [ ] `ci-watcher` reports all checks green.
- [ ] PR is squash-merged to `master`; branch deleted.
- [ ] `ROADMAP.md` and `STATE.md` updated to reflect feature 056 completion.

**Tests**: full pipeline.
**Gate**: build (`bun check`) + CI.
**Commit**: (no new commit — orchestrates existing work).

---

## Parallel Execution Map

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14
```

All sequential. The DB-backed integration/e2e gates serialize anyway.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 3 type files + barrel, one cohesive concept (credential-field shape) | ✅ Granular |
| T2 | 1 walker function + 1 exception + co-located unit spec | ✅ Granular |
| T3 | Schema move + meta annotations (one file moved, imports updated) | ✅ Granular |
| T4 | 3 generic-ization changes on related port-input shapes | ✅ Granular (cohesive) |
| T5 | 2 interfaces become generic | ✅ Granular |
| T6 | 1 factory + unit spec | ✅ Granular |
| T7 | 5 bridge methods on 1 registry + unit spec | ✅ Granular (cohesive) |
| T8 | 1 plugin file rewritten + module wiring update | ✅ Granular |
| T9 | Call-site migration across 4-5 consumer files | ⚠️ Borderline — kept cohesive because every site is the same mechanical change (drop direct call, use registry bridge) and the impact tests live together |
| T10 | 1 use-case + 1 e2e validation | ✅ Granular |
| T11 | 1 utility file | ✅ Granular |
| T12 | 1 form rewrite + 2 deletions + 1 spec update | ✅ Granular |
| T13 | 1 spec file | ✅ Granular |
| T14 | Orchestration (DoD) | ✅ Granular (process step) |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5, T2, T1 | T5 → T6 (T2, T1 are transitive predecessors of T5) | ✅ |
| T7 | T5, T6 | T6 → T7 | ✅ |
| T8 | T6, T7, T3 | T7 → T8 (T6, T3 transitive) | ✅ |
| T9 | T7, T8 | T8 → T9 | ✅ |
| T10 | T8 | T9 → T10 (T8 transitive) | ✅ |
| T11 | T3 | T10 → T11 (T3 transitive) | ✅ |
| T12 | T11, T3 | T11 → T12 | ✅ |
| T13 | T2 | T12 → T13 (T2 transitive — T13 is the last fixture proof) | ✅ |
| T14 | T13 | T13 → T14 | ✅ |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Pure type declarations | none (compile-time) | none | ✅ |
| T2 | Pure helper (fat: branches per schema kind) | unit | unit | ✅ |
| T3 | Schema move + annotations (pure schemas) | none — behaviour preserved; walker is tested in T2 | none | ✅ |
| T4 | Type-only signature change | none | none | ✅ |
| T5 | Type-only generic-ization | none | none | ✅ |
| T6 | Pure factory (fat: derivation + inference + throw branch) | unit | unit | ✅ |
| T7 | Registry typed bridges (fat: 5 branches × invalid + unknown) | unit | unit | ✅ |
| T8 | Plugin rebuild (fat — same logic, new wiring); existing meta unit specs cover it | unit | unit | ✅ |
| T9 | Use-case orchestration changes; existing fat use-case unit specs + e2e flows cover behaviour | unit + e2e | full gate | ✅ |
| T10 | List-plugins use-case is thin → e2e | e2e | e2e | ✅ |
| T11 | Tiny client-side map (1 literal entry) | none — exercised by T12 | none | ✅ |
| T12 | Web form (fat: dynamic resolver + per-field error path) | web (jsdom) | web | ✅ |
| T13 | Walker fixture spec (fat — fixture coverage) | unit | unit | ✅ |
| T14 | Orchestration | full pipeline | build + CI | ✅ |

---

## Tools and skills per task

- **T2, T6, T7, T8, T9, T12, T13** — invoke the `generate-tests` skill for
  test authoring (thin/fat classification on each call).
- **T14** — invoke `thermo-nuclear-code-quality-review`, then
  `review-and-ship`, then `ci-watcher`, and `fix-ci` if CI is red.
- **T8**, **T9** — use `codegraph_callers`/`codegraph_impact` before the
  migration to confirm every `plugin.X` call site is captured.
- No MCP-specific tools (filesystem actions via Read/Edit/Write/Bash);
  codegraph for navigation.

---

## Commit plan

One commit per task. Conventional Commits:

| Task | Type | Scope | Subject |
| ---- | ---- | ----- | ------- |
| T1 | feat | api-contracts | add shared credential-field types |
| T2 | feat | api-contracts | describe credential fields from zod schema |
| T3 | feat | api-contracts | move meta credential schemas with field meta |
| T4 | refactor | api/channel | make port-input shapes generic on credentials |
| T5 | refactor | api/channel | make ChannelPlugin and manifest generic on schema |
| T6 | feat | api/channel | add defineChannelPlugin factory |
| T7 | feat | api/channel | typed-bridge methods on plugin registry |
| T8 | refactor | api/channel/meta | build plugin via defineChannelPlugin |
| T9 | refactor | api/channel | route plugin calls through registry bridges |
| T10 | refactor | api/channel | derive list-plugins response from manifest |
| T11 | feat | web/channels | client-side per-plugin credentials schema map |
| T12 | feat | web/channels | validate credentials with per-plugin zod schema |
| T13 | test | api-contracts | prove credentialFields walker on flat schema |

Last commit (T14) is review-and-ship's PR-prep; no new code commit unless
fixes are needed.
