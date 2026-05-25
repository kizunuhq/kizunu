# Channel Credentials Zod Builder — Specification

## Problem Statement

The channels module abstracts per-plugin credentials behind a Zod `configSchema`
and a hand-written `credentialFields` array, but every type from those schemas is
discarded the moment it crosses the `ChannelPlugin` port. Every method signs as
`credentials: unknown` / returns `Promise<unknown>`; every plugin re-runs
`schema.parse(credentials)` on entry; the API contract types credentials as
`z.record(z.string(), z.unknown())`; and the web form runs a hand-rolled
`hasRequiredCredentials` post-check next to its `zodResolver`. The plugin's Zod
schema and its `credentialFields` array describe the same shape twice and drift
silently. Connectors will inherit the same disease (and worse — JSON textarea
input) when their port lands, so the abstraction needs fixing before that
multiplies.

## Goals

- [ ] Plugin code reads and writes `MetaCredentials` directly — no `unknown`
      parameters, no `Promise<unknown>` returns, no per-method `schema.parse`.
- [ ] `MetaWhatsappPlugin.manifest.credentialFields` is **derived** from the
      Zod schema (via `.meta()` annotations + a shared walker), not declared by
      hand.
- [ ] The Meta credential schemas live in `@kizunu/api-contracts/channel/` and
      are imported by both the API plugin and the web form. The contract for
      `CreateChannelAccountRequestSchema.credentials` is no longer
      `z.record(z.string(), z.unknown())` semantically — operator submissions
      validate against the active plugin's schema on both sides.
- [ ] `apps/web/.../channel-account-form.tsx` uses `zodResolver` on the shared
      schema only; `hasRequiredCredentials` and the runtime field-presence check
      are removed.
- [ ] Shared `@kizunu/api-contracts/shared/credentials/` foundation
      (`CredentialField`, `CredentialFields` flat/discriminated union,
      `describeCredentialFields(schema)` walker) is in place and proven against
      (a) Meta's discriminated `channelMode` union and (b) a Pipedrive-shaped
      flat schema mock, so Feature 057 (connectors) reuses it unchanged.
- [ ] `bun check` green; commitlint clean; Conventional Commits.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| CRM / connector module changes | Feature 057. This spec only sets up the shared layer; 057 consumes it. |
| Dynamic plugin loading or `z.toJSONSchema` round-trip | All plugins are in-monorepo; schemas can be imported directly from `@kizunu/api-contracts`. |
| Adding a new channel plugin beyond Meta | Out of scope; the work is type-system refactoring, not a new provider. |
| Rewriting the credentials storage column shape | `jsonb` stays; `ChannelAccount.credentials: unknown` is the legitimate `unknown` boundary. |
| Generalizing `CredentialFieldsInput` to handle `select/url/textarea` field kinds | Today's `text|secret` is enough for Meta; future kinds added when a real plugin needs them. |
| Changing the registry's DI shape or moving plugins out of the module | Pure type/abstraction work — no module re-wiring. |

---

## User Stories

### P1: Plugin author handles typed credentials end-to-end ⭐ MVP

**User Story**: As a channel-plugin author, I want my plugin methods to take and
return my Zod-inferred credentials type, so that I stop re-parsing on every call
and stop returning `Promise<unknown>` from enrichment hooks.

**Why P1**: This is the central pain point — the `unknown` leak inside business
code. Without it, the plugin's enrichment chain (`onAccountCreated`,
`refreshCredentials`) is opaque to the use-case layer, and every method opens
with a redundant `schema.parse`.

**Acceptance Criteria**:

1. WHEN `MetaWhatsappPlugin` is declared via `defineChannelPlugin(spec)` with
   `metaCredentialsSchema` as its `configSchema`, THEN TypeScript SHALL infer
   `MetaCredentials` for the `credentials` parameter of `send`, `parseInbound`,
   `directory`, `refreshCredentials`, and `onAccountCreated`.
2. WHEN `MetaWhatsappPlugin.send` / `parseInbound` / `directory` /
   `refreshCredentials` / `onAccountCreated` are called via the registry's
   typed-bridge methods, THEN the plugin body SHALL receive already-parsed,
   typed credentials and SHALL NOT call `schema.parse` again.
3. WHEN `onAccountCreated` returns enriched credentials (e.g.
   `MetaCloudApiCredentials`), THEN its return type SHALL be
   `Promise<MetaCredentials>` (not `Promise<unknown>`), and
   `CreateChannelAccountUseCase.enrich` SHALL receive the typed result without
   casts.
4. WHEN a new channel plugin is added later, THEN it SHALL be required to use
   `defineChannelPlugin({ ... })` (the raw `implements ChannelPlugin<...>`
   pathway is not exercised inside the module).

**Independent Test**: Compile-time check via `bun typecheck`; runtime call into
`registry.send('meta-whatsapp', payload, rawCredentialsRow)` returns the same
result as today's path with one fewer parse call.

---

### P1: Registry parses credentials at a single seam ⭐ MVP

**User Story**: As a use-case author, I want the channel-plugin registry to give
me typed bridges (`registry.send`, `registry.directory`,
`registry.refreshCredentials`, `registry.onAccountCreated`) so that I stop
calling `plugin.X(payload, rawCredentials)` directly and stop juggling `unknown`
in business code.

**Why P1**: The registry already validates on the way in (`validateCredentials`)
but throws away the parsed value. Making it the one place credentials get parsed
collapses N re-parses into one and moves the only `unknown → typed` boundary out
of the plugin.

**Acceptance Criteria**:

1. WHEN a use-case needs to call `plugin.send`, `plugin.parseInbound`,
   `plugin.directory`, `plugin.refreshCredentials`, or `plugin.onAccountCreated`,
   THEN it SHALL go through the corresponding `registry.<method>(id, ..., rawCredentials)`
   bridge, never `registry.get(id).<method>(...)` with raw credentials.
2. WHEN `registry.<method>` is called with credentials that fail
   `configSchema.safeParse`, THEN it SHALL throw
   `InvalidChannelCredentialsException(id)` (same as `validateCredentials`
   today), so the externally observable error envelope does not change.
3. WHEN the `OAuthRefreshService` rolls a Coex token, THEN it SHALL go through
   `registry.refreshCredentials(id, channelAccountId, rawRow.credentials)` and
   the persisted result SHALL still be a `MetaCredentials` shape.
4. WHEN `MetaInboundController` (or whatever handles webhooks) calls
   `parseInbound`, THEN it SHALL go through `registry.parseInbound(id, raw,
   rawCredentials)` and the typed return SHALL flow into the engine.

**Independent Test**: All channel use-case integration tests (`create`,
`refresh`, `directory`, `send` paths) stay green after the bridge migration —
behaviour preserved, no new `.parse` calls visible in plugin bodies.

---

### P1: `credentialFields` is derived from the schema, not declared twice ⭐ MVP

**User Story**: As a plugin author, I want to annotate each schema field with
`.meta({ label, kind, serverGenerated })` once and have the manifest's
`credentialFields` array derived automatically, so that the wire shape sent to
the web cannot drift from the schema that validates it.

**Why P1**: Today the Meta plugin declares `credentialFields` by hand right next
to `metaCredentialsClientSchema`, duplicating five fields. A rename in the
schema does not propagate; reviewers have no enforcement.

**Acceptance Criteria**:

1. WHEN `metaCredentialsSchema` (or its client-input projection) is annotated
   with `.meta({ label, kind, serverGenerated? })` on each field, THEN the
   shared `describeCredentialFields(schema)` walker SHALL return the same
   `CredentialField[]` that `GET /channel-plugins` returns today.
2. WHEN the plugin's manifest is constructed inside `defineChannelPlugin`, THEN
   `credentialFields` SHALL be derived from the schema and SHALL NOT be
   accepted as a hand-written array on the spec.
3. WHEN the schema is a `z.discriminatedUnion` (Meta), THEN
   `describeCredentialFields` SHALL emit a `{ kind: 'discriminated', key,
   variants }` shape; WHEN the schema is a flat `z.object` (Pipedrive-shaped),
   THEN it SHALL emit a `{ kind: 'flat', fields }` shape.
4. WHEN the API responds to `GET /channel-plugins`, THEN the response shape
   SHALL be backward-compatible with the existing
   `ChannelPluginsResponseSchema`: each plugin entry exposes a flat
   `credentialFields` array suitable for the **operator-input** subset (i.e.
   the client-schema projection for Meta — the `cloud_api`-only fields minus
   server-generated ones). The discriminated representation is an internal
   detail of the walker and Feature 057's UI.

**Independent Test**: A unit test on `describeCredentialFields` with the
Meta-style discriminated schema produces the exact array Meta's manifest
declares today; a second test with a Pipedrive-shaped schema produces a flat
array matching Pipedrive's stored credentials. The `GET /channel-plugins` e2e
test produces the same response as before the change.

---

### P1: Web form uses `zodResolver` on the contracts-package schema ⭐ MVP

**User Story**: As a user creating a channel account, I want the form to
validate credentials with the same Zod schema the API uses, so that an invalid
field is caught before submit and the error message matches the server's.

**Why P1**: Today `channel-account-form.tsx` registers `zodResolver` on
`CreateChannelAccountRequestSchema` (which leaves `credentials` open) and then
runs a manual `hasRequiredCredentials` post-check on submit. This is a
duplicated, weaker validator that does not catch field-shape errors (e.g. an
empty `appId`).

**Acceptance Criteria**:

1. WHEN the operator picks a plugin in the form, THEN the form SHALL switch its
   resolver/schema to the **client-schema projection** for that plugin
   (imported from `@kizunu/api-contracts/channel/<plugin>-credentials`) and
   validate per-field on submit.
2. WHEN the operator submits with a missing/invalid credential field, THEN the
   form SHALL show a per-field error via `FieldError`, sourced from RHF's
   `errors.credentials.<key>.message` and not from a hand-rolled
   `hasRequiredCredentials` branch.
3. WHEN the form is submitted with all fields valid, THEN the POST body's
   `credentials` SHALL be the schema-parsed object (no `Record<string, unknown>`
   leftover).
4. WHEN the operator switches plugin, THEN the previous credential values SHALL
   reset (today's behaviour preserved).

**Independent Test**: Vitest+RTL spec around `channel-account-form.tsx` covers
"missing appId surfaces per-field error", "switching plugin resets credentials",
and the existing happy-path submit.

---

### P2: Shared `@kizunu/api-contracts/shared/credentials/` proven against both shapes

**User Story**: As the connector port author (Feature 057), I want the shared
credentials types and walker to already model both a flat schema and a
discriminated union, so that adopting them for Pipedrive is purely a consumer
change.

**Why P2**: Without proof against a flat schema in this feature, the connectors
adoption will rediscover gaps and force a revisit of the shared layer.

**Acceptance Criteria**:

1. WHEN the `describeCredentialFields` walker is called with a
   Pipedrive-shaped flat `z.object({...}).strict()` (declared in a test
   fixture, no production Pipedrive code added), THEN it SHALL produce a
   `{ kind: 'flat', fields: [...] }` payload with one entry per zod field and
   the `.meta()` annotations preserved.
2. WHEN the same walker is called with Meta's `z.discriminatedUnion`, THEN it
   SHALL produce a `{ kind: 'discriminated', key, variants }` payload with one
   variant per discriminator value.
3. WHEN a field is `.optional()` or has a `.default(...)`, THEN the walker
   SHALL emit `required: false` for that field (`required: true` otherwise).
4. WHEN a field's `.meta({ serverGenerated: true })` is set, THEN the walker
   SHALL emit `serverGenerated: true` on that field's entry.

**Independent Test**: A unit spec under
`packages/api-contracts/src/shared/credentials/__test__/describe-credential-fields.spec.ts`
covers all four cases.

---

### P3: Stored credentials carry a documented "shape" envelope for future migrations

**Why P3**: Not required for MVP; tracked for the future. Out of scope this
feature — no implementation.

---

## Edge Cases

- WHEN a plugin's `defineChannelPlugin` spec is given a schema without
  `.meta()` annotations on a field, THEN `describeCredentialFields` SHALL fall
  back to using the field key as the label and `text` as the kind, so partially
  annotated schemas still produce a renderable form.
- WHEN a plugin's `configSchema` is something other than `ZodObject` or
  `ZodDiscriminatedUnion` (e.g. a `ZodEffects`/`.refine()` over an object),
  THEN the walker SHALL unwrap one layer and then either succeed or throw a
  `PluginCredentialsShapeUnsupportedException` at boot — fail-fast in wiring,
  never silent.
- WHEN `registry.send` / `directory` etc. receive credentials that no longer
  validate (e.g. a schema was tightened after a row was persisted), THEN they
  SHALL throw `InvalidChannelCredentialsException(id)` with the existing 422
  envelope — same code path as today's `validateCredentials`.
- WHEN the operator switches plugin mid-form, THEN previously typed credentials
  SHALL be discarded and the resolver SHALL re-evaluate using the new plugin's
  schema (today's behaviour preserved via `setValue('credentials', {})` plus
  the swap).
- WHEN the registry is asked for an unknown plugin id, THEN the existing
  `UnknownChannelPluginException` SHALL surface (unchanged).
- WHEN `onAccountCreated` is absent on a plugin, THEN
  `registry.onAccountCreated(id, ..., creds)` SHALL return the input
  credentials unchanged (mirrors today's `enrich` fallback).

---

## Requirement Traceability

| Requirement ID | Story                                                            | Phase  | Status  |
| -------------- | ---------------------------------------------------------------- | ------ | ------- |
| CCZB-01        | P1: Plugin author handles typed credentials end-to-end           | Design | Pending |
| CCZB-02        | P1: Plugin author handles typed credentials end-to-end           | Design | Pending |
| CCZB-03        | P1: Plugin author handles typed credentials end-to-end           | Design | Pending |
| CCZB-04        | P1: Plugin author handles typed credentials end-to-end           | Design | Pending |
| CCZB-05        | P1: Registry parses credentials at a single seam                 | Design | Pending |
| CCZB-06        | P1: Registry parses credentials at a single seam                 | Design | Pending |
| CCZB-07        | P1: Registry parses credentials at a single seam                 | Design | Pending |
| CCZB-08        | P1: Registry parses credentials at a single seam                 | Design | Pending |
| CCZB-09        | P1: `credentialFields` derived from the schema                   | Design | Pending |
| CCZB-10        | P1: `credentialFields` derived from the schema                   | Design | Pending |
| CCZB-11        | P1: `credentialFields` derived from the schema                   | Design | Pending |
| CCZB-12        | P1: `credentialFields` derived from the schema                   | Design | Pending |
| CCZB-13        | P1: Web form uses `zodResolver` on the contracts-package schema  | Design | Pending |
| CCZB-14        | P1: Web form uses `zodResolver` on the contracts-package schema  | Design | Pending |
| CCZB-15        | P1: Web form uses `zodResolver` on the contracts-package schema  | Design | Pending |
| CCZB-16        | P1: Web form uses `zodResolver` on the contracts-package schema  | Design | Pending |
| CCZB-17        | P2: Shared foundation proven against both shapes                 | Design | Pending |
| CCZB-18        | P2: Shared foundation proven against both shapes                 | Design | Pending |
| CCZB-19        | P2: Shared foundation proven against both shapes                 | Design | Pending |
| CCZB-20        | P2: Shared foundation proven against both shapes                 | Design | Pending |
| CCZB-E1        | Edge: schema without `.meta()` falls back to key + text          | Design | Pending |
| CCZB-E2        | Edge: unsupported schema shape fails fast at boot                | Design | Pending |
| CCZB-E3        | Edge: tightened schema on stored row → 422 with existing code    | Design | Pending |
| CCZB-E4        | Edge: plugin switch resets credentials & re-evaluates resolver   | Design | Pending |
| CCZB-E5        | Edge: unknown plugin id → unchanged `UnknownChannelPluginException` | Design | Pending |
| CCZB-E6        | Edge: missing `onAccountCreated` returns input credentials       | Design | Pending |

**ID format:** `CCZB-NN` (channel-credentials-zod-builder)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 26 total, 0 mapped to tasks yet (Design phase next)

---

## Success Criteria

- [ ] `rg "credentials: unknown" apps/api/src/modules/channel/` returns 0 hits
      inside `MetaWhatsappPlugin` / plugin port methods (only the registry's
      raw entry-point parameter may remain `unknown`).
- [ ] `rg "schema.parse" apps/api/src/modules/channel/plugins/` returns 0 hits
      (the registry parses; plugins consume parsed values).
- [ ] `rg "hasRequiredCredentials" apps/web/` returns 0 hits.
- [ ] `MetaWhatsappPlugin.manifest.credentialFields` is a getter/derived value
      backed by `describeCredentialFields(...)`, not a literal array.
- [ ] `@kizunu/api-contracts/shared/credentials/` exports
      `CredentialField`, `CredentialFields`, `describeCredentialFields` and is
      consumed by both the channel module and the web form.
- [ ] `bun check` green.
