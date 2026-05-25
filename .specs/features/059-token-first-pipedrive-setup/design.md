# Token-first Pipedrive connector setup — Design

## Architectural decisions

### D1 — CRM port gains `inputSchema` and `prepareCredentials`

Mirror exactly the channel-plugin pattern landed in features 029/031/056:

- `CrmConnectorManifest.inputSchema?: ZodType` is the **create-input** shape.
  When omitted, the registry falls back to `configSchema` (no-op, current
  behavior for every existing connector).
- `CRMConnector.prepareCredentials?` is a hook invoked **after** input
  validation, **before** storage validation. Signature:

  ```ts
  prepareCredentials?(input: { credentials: z.infer<I> }): Promise<z.infer<S>>
  ```

  where `I = inputSchema ?? configSchema` and `S = configSchema`. Returning
  a value that does not parse against `configSchema` raises
  `InvalidConnectorCredentialsException` from the registry (same behavior
  as the channel `onAccountCreated` re-parse guard).

Rejected alternative: introducing a web-side "preview connector" endpoint
that the form calls before submit. It splits the round-trip into two HTTP
calls + two layers of token handling, and it forces the web to know each
connector's quirks. The hook pattern keeps both Web and Server simple.

### D2 — Pipedrive input vs storage schemas

In `@kizunu/api-contracts/crm/pipedrive-credentials.contract.ts`:

```ts
export const pipedriveCredentialsSchema = z.object({   // STORAGE (unchanged)
  apiToken: …secret-required,
  companyDomain: …text-required,
  activityType: …text-default('task'),
  phoneFieldKey: …text-optional,
  webhookToken: …secret-optional-serverGenerated,
}).strict()

export const pipedriveCredentialsInputSchema = z.object({   // CREATE INPUT (new)
  apiToken: pipedriveCredentialsSchema.shape.apiToken,
  companyDomain: z.string().min(1).optional()
    .register(credentialFieldRegistry, { label: 'Company domain', type: 'text' }),
  activityType: pipedriveCredentialsSchema.shape.activityType,
  phoneFieldKey: pipedriveCredentialsSchema.shape.phoneFieldKey,
}).strict()
```

Notes:

- We deliberately register the **input** schema's `companyDomain` separately
  with the same registry meta. The walker reads `required = false` because
  the input version is `.optional()`. Storage stays `.min(1)` required.
- `webhookToken` is **omitted** from `pipedriveCredentialsInputSchema`
  entirely. The create use-case still strips client-supplied `webhookToken`
  defensively, but the input schema would now reject it as an unknown key
  due to `.strict()`. The use-case strip stays for one-version backward
  compatibility and to keep the legacy curl behavior described in TFP-edge.
  Followup deletion is fine in a later feature once we are sure no
  installed deploys pass `webhookToken` from a client.
- We do **not** export an `inputSchema` for non-Pipedrive connectors — the
  manifest field is optional and the fallback handles them.

### D3 — Pipedrive `prepareCredentials` implementation

Lives in a new helper module
`apps/api/src/modules/crm/plugins/pipedrive/pipedrive-prepare.ts`
exporting:

```ts
preparePipedriveCredentials(ctx: { fetchFn, baseUrlOverride? }, input: PipedriveCredentialsInput): Promise<PipedriveCredentialsStorage>
```

Flow:

1. If `input.companyDomain` is a non-empty, non-whitespace string → return
   `{ apiToken, companyDomain, activityType, phoneFieldKey? }` immediately.
2. Otherwise call `GET https://api.pipedrive.com/v1/users/me?api_token=<token>`
   (or `baseUrlOverride/users/me?api_token=…` in tests). Behavior:
   - 401 or 403 → throw `PipedriveTokenInvalidException` (new) →
     `422 crm.token-invalid`.
   - Other non-2xx → throw existing `CrmRequestFailedException` (rendered as
     `crm.directory-failed` per the existing error filter mapping).
     If the existing mapping does not cover this code, add an explicit
     filter; see D5.
   - 2xx → parse the JSON, read `data.company_domain`. If absent or empty →
     throw `PipedriveCompanyDomainUnresolvedException` (new) → `422
     crm.company-domain-unresolved`.
   - Otherwise return the credentials with `companyDomain` filled in.

We deliberately call the **domain-independent** Pipedrive endpoint
`https://api.pipedrive.com/v1/users/me`. Pipedrive supports this exact
URL: it routes by token instead of subdomain. The PipedriveApi class's
existing `pipedriveBaseUrl(companyDomain)` cannot be used here because at
this point we do not yet know the domain. We use a constant
`PIPEDRIVE_API_BASE = 'https://api.pipedrive.com/v1'` in the new helper.

### D4 — Pipedrive connector wiring

`buildPipedriveConnector` (the existing `defineCrmConnector` call) adds:

```ts
manifest: {
  …,
  configSchema: pipedriveCredentialsSchema,
  inputSchema: pipedriveCredentialsInputSchema,
  …,
},
async prepareCredentials(input) {
  return preparePipedriveCredentials({ fetchFn, baseUrlOverride }, input.credentials)
},
```

`describeCredentialFields(manifest.inputSchema ?? manifest.configSchema)` is
the **only** change inside `defineCrmConnector`. The discriminated-union
guard there stays — we do not allow input schemas to be discriminated for
this slice. Easy add when a CRM needs it.

### D5 — Registry changes

`CrmConnectorRegistry.validateCredentials(id, raw)` — keep parsing against
`configSchema` (used by `update` flows where the stored shape is the
authority).

Add new method:

```ts
async prepareCredentials(id: string, rawInput: unknown): Promise<unknown> {
  const connector = this.get(id)
  const inputSchema = connector.manifest.inputSchema ?? connector.manifest.configSchema
  const inputParsed = inputSchema.safeParse(rawInput)
  if (!inputParsed.success) throw new InvalidConnectorCredentialsException(id)
  const enriched = connector.prepareCredentials
    ? await connector.prepareCredentials({ credentials: inputParsed.data })
    : inputParsed.data
  const storageParsed = connector.manifest.configSchema.safeParse(enriched)
  if (!storageParsed.success) throw new InvalidConnectorCredentialsException(id)
  return storageParsed.data
}
```

Connector-thrown exceptions (TokenInvalid, CompanyDomainUnresolved) MUST
bubble up to the use-case unchanged — the registry only re-throws on
schema mismatches.

### D6 — `CreateConnectorAccountUseCase` rewrite

```ts
async execute(input) {
  const sanitized = stripClientWebhookToken(input.credentials)
  const prepared = await this.registry.prepareCredentials(input.connectorId, sanitized)
  const enriched = withServerWebhookToken(prepared)
  const { id } = await this.accounts.create({…, credentials: enriched})
  return { id, … }
}
```

The pre-existing `registry.validateCredentials` call is **replaced** by
`registry.prepareCredentials`. We no longer want plain storage-shape
validation here.

### D7 — New error types and HTTP mapping

Two new exceptions in `apps/api/src/modules/crm/core/errors/crm.errors.ts`:

```ts
export class PipedriveTokenInvalidException extends ApplicationException {
  constructor() {
    super({ code: 'crm.token-invalid', message: 'Pipedrive rejected the API token.' })
  }
}
export class PipedriveCompanyDomainUnresolvedException extends ApplicationException {
  constructor() {
    super({
      code: 'crm.company-domain-unresolved',
      message: 'Could not derive the Pipedrive company domain from /users/me. Provide it under Advanced settings.',
    })
  }
}
```

Both render via the existing `ApplicationExceptionFilter` to HTTP 422 with
the error envelope `{ code, message, context }` — no controller change.

### D8 — Web form rewrite

`apps/web/src/routes/_app/settings/connectors/-components/connector-account-form-body.tsx`
gains, **only** when `connectorId === 'pipedrive'`, the following layout:

```
[ Name input ]                              (mandatory, primary)
[ API token input ]                         (mandatory, primary)

[ ▶ Advanced settings ]                     (collapsed by default)
  [ Company domain input ]                  (optional override)
  [ Activity type input ]                   (optional, placeholder 'task')
  [ Phone field key input ]                 (optional)
```

Implementation: a small `<Collapsible>` from shadcn primitives wraps the
non-primary fields. We will:

- Add `@base-ui/react/collapsible` via `shadcn` skill, or, if missing,
  hand-roll a 20-line `<details>`-based collapsible composed primitive
  (consistent with `react.md` §0 — bespoke is fine when no primitive fits).
- The decision between `<Collapsible>` and `<details>` is taken in Tasks,
  after running `shadcn search collapsible`.

The component remains a **dumb** form per `web-patterns.md` §3: it owns
`useForm` against `pipedriveCredentialsInputSchema` (the contract is the
source of truth), exposes the same `{ formId, isPending, error, onSubmit }`
shape, and the parent dialog wires the mutation.

**`<Collapsible>` open state** is local component state, not RHF state —
matches `react.md` §3 (state close to use).

Non-Pipedrive connectors keep the existing field-walking rendering
unchanged: the manifest's `credentialFields` (now derived from
`inputSchema`) drives a flat list. Only Pipedrive declares an
inputSchema today, so only Pipedrive renders a `.optional()` field
(`companyDomain`) which we wrap in the Advanced section. Generic
"required vs optional" splitting of the field list is **out of scope** —
this slice ships only the Pipedrive-specific layout.

### D9 — Cleanup of dead client filter

`connector-account-form.tsx`'s `userInputFieldsFor` helper still filters
`serverGenerated !== true`. We **keep** it: `webhookToken` is gone from
the Pipedrive input schema, so this filter is now a no-op for Pipedrive,
but it remains a defense-in-depth for future connectors whose
inputSchema (if any) still carries server-generated fields. No
behavioral change.

### D10 — Schema-walker tweak (TFP-15, accepted)

`describeCredentialFields` walks `manifest.inputSchema ?? manifest.configSchema`
via `defineCrmConnector` and `defineChannelPlugin`. For Pipedrive that
means `webhookToken` no longer appears in `GET /connectors`
`credentialFields` — clean. The channel walker is **not changed** because
Meta plugins keep `verifyToken` in their input schemas (different
property — see channel-plugin-manifest doc). No cross-module ripple.

## Architecture diagram

```
            ┌──────────────────────────────┐
Operator    │  apps/web (settings/         │
  paste     │  connectors)                 │
  token →   │   ConnectorAccountForm       │
            │     -> FormBody (RHF, zod)   │
            │        primary: apiToken     │
            │        Advanced: domain etc. │
            └──────────────┬───────────────┘
                           │ POST /workspaces/:wsId/connector-accounts
                           ▼
            ┌──────────────────────────────┐
            │  CreateConnectorAccountUC    │
            │   strip client webhookToken  │
            │     ↓                        │
            │   registry.prepareCredentials│
            │     ↓                        │
            │   add server webhookToken    │
            │     ↓                        │
            │   accounts.create (encrypt)  │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  CrmConnectorRegistry        │
            │   inputSchema.parse(raw)     │
            │     ↓                        │
            │   plugin.prepareCredentials? │
            │     ↓                        │
            │   configSchema.parse(out)    │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  Pipedrive prepare           │
            │   if companyDomain set: pass │
            │   else: GET /v1/users/me     │
            │     401/403 → token-invalid  │
            │     no domain → unresolved   │
            │     else: derive             │
            └──────────────────────────────┘
```

## Test plan summary (driven by `generate-tests`)

| Subject | Thin/fat | Test type |
| --- | --- | --- |
| `preparePipedriveCredentials` (the helper) | **fat** (branches: token bad / 4xx-other / 2xx-no-domain / 2xx-derive / explicit override) | Unit |
| `CrmConnectorRegistry.prepareCredentials` (the hook + re-validation logic) | **fat** (branches: input-invalid / hook-missing / hook-returns-bad-shape / happy) | Unit |
| `CreateConnectorAccountUseCase` (the new orchestration) | **thin** (passes through to registry + repo) | E2E covers it |
| Pipedrive credential schemas (`pipedriveCredentialsInputSchema`) | **fat** (rejects unknown keys; webhookToken not accepted; companyDomain optional) | Unit |
| Pipedrive connector e2e (`POST connector-accounts` happy + token-bad + manual override) | end-to-end | E2E |
| Web form — primary field count, Advanced toggle, RHF resolver against `pipedriveCredentialsInputSchema` | **fat** (the form *is* the resolver wiring) | Web unit (vitest + RTL) |
| Pipedrive walker output (credentialFields derived from inputSchema) | **fat** (covered by the existing pipedrive-fixture walker spec) | Unit update |

## Risks

- **R1 — Pipedrive may rate-limit the domain-independent `/users/me`
  endpoint.** Mitigation: the call only happens on connector create, which
  is single-digit per workspace per lifetime. Acceptable.
- **R2 — Hard-coding `https://api.pipedrive.com/v1` ties us to Pipedrive's
  public host.** A custom-host customer must use the manual override —
  documented in P1 story 2. Acceptable for v1.0.
- **R3 — Re-parsing the hook output against `configSchema` could surprise
  a future connector author** if the input shape differs from storage.
  Mitigation: the registry exception is explicit
  (`InvalidConnectorCredentialsException` with context); the new behavior
  exactly matches the channel module's `onAccountCreated` re-parse step,
  so the precedent is already in-tree.

## Out-of-scope (deferred)

- Generic "Advanced settings" layout in the field walker for non-Pipedrive
  connectors. The slice ships only the Pipedrive-shaped layout. When a
  second connector lands (HubSpot), revisit.
- Re-deriving `companyDomain` periodically (Pipedrive's domain is account-
  stable per their docs).
- A generic preview endpoint pattern. The hook is the v1.0 answer.
