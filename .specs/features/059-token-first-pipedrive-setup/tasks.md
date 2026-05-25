# Token-first Pipedrive connector setup — Tasks

Sequential. Each task ends with `bun check` green before moving on (per
AGENTS.md Definition of Done).

## T1 — Contracts: add `pipedriveCredentialsInputSchema` and exports

**What:** In `packages/api-contracts/src/crm/pipedrive-credentials.contract.ts`,
add `pipedriveCredentialsInputSchema` as a `.strict()` `z.object` with
`apiToken` (required, secret), `companyDomain` (optional, text — registered
on the registry), `activityType` (with `.default('task')`), and
`phoneFieldKey` (optional). Export the inferred type
`PipedriveCredentialsInput`. Re-export from `crm/index.ts`.

**Depends on:** —

**Reuses:**
- `pipedriveCredentialsSchema.shape.apiToken` for the apiToken field.
- `credentialFieldRegistry` for the optional `companyDomain` entry's meta.

**Done when:**
- `bunx vp test --project unit --run packages/api-contracts/src/shared/credentials/__test__` still green.
- The new schema rejects `webhookToken` as unknown (strict).
- The new schema accepts `{ apiToken: 'x' }` with `activityType` defaulting
  to `'task'`.

**Tests (via `generate-tests`):** focused unit on the schema's branches —
required apiToken, optional companyDomain (omitted vs empty vs filled), default
activityType, strict rejection of `webhookToken`.

**Gate:** `bun typecheck && bun test packages/api-contracts`.

---

## T2 — Port: add `inputSchema` + `prepareCredentials` to the CRM connector

**What:** In
`apps/api/src/modules/crm/core/connector/crm-connector.ts`,
`crm-connector-manifest.ts`, and `define-crm-connector.ts`:

1. Add `inputSchema?: I` (typed as `ZodType` with default to `S` via
   generic) to `CrmConnectorManifest`.
2. Add `prepareCredentials?(input: { credentials: z.infer<I> }):
   Promise<z.infer<S>>` to `CRMConnector`.
3. In `defineCrmConnector(spec)`, derive `credentialFields` from
   `manifest.inputSchema ?? manifest.configSchema`.

**Depends on:** —

**Reuses:** the `describeCredentialFields` walker (no changes needed —
`.optional()` is already handled).

**Done when:**
- Existing pipedrive connector still compiles (no `inputSchema` declared yet
  — fallback path used).
- A unit test asserts that `defineCrmConnector` walks `inputSchema` when
  provided.

**Tests:** focused unit on `defineCrmConnector`'s fallback vs override path.

**Gate:** `bun typecheck && bun test --project unit apps/api/src/modules/crm/core/connector`.

---

## T3 — Registry: `prepareCredentials(id, raw)` method

**What:** In
`apps/api/src/modules/crm/core/connector/crm-connector-registry.ts`,
add `async prepareCredentials(id, raw)` per the design D5 flow:

1. Look up the connector by id.
2. Pick `inputSchema ?? configSchema`, `safeParse(raw)` → on failure throw
   `InvalidConnectorCredentialsException`.
3. If `prepareCredentials` hook exists, `await` it; else pass through.
4. `safeParse(enriched)` against `configSchema` → on failure throw
   `InvalidConnectorCredentialsException`.
5. Return the storage-shaped value.

**Depends on:** T2.

**Reuses:** existing `InvalidConnectorCredentialsException` and `get(id)`.

**Done when:**
- Unit tests cover four branches: invalid input, no hook (passthrough),
  hook returns bad shape (rejected), hook returns good shape (returned).
- Hook-thrown exceptions bubble unchanged (covered by a fifth test).

**Tests:** five unit specs against the registry, using a fake connector
fixture.

**Gate:** `bun typecheck && bun test --project unit apps/api/src/modules/crm/core/connector`.

---

## T4 — Pipedrive errors

**What:** In `apps/api/src/modules/crm/core/errors/crm.errors.ts` add:

- `PipedriveTokenInvalidException` → `code: 'crm.token-invalid'`.
- `PipedriveCompanyDomainUnresolvedException` →
  `code: 'crm.company-domain-unresolved'`.

Both extend the existing `ApplicationException` base (mirror the existing
crm errors' constructor signature).

**Depends on:** —

**Reuses:** `ApplicationException`.

**Done when:** both compile; both surface as HTTP 422 with the right code
via the existing filter (e2e in T8 verifies).

**Tests:** none direct (covered by helper unit in T5 + e2e in T8).

**Gate:** `bun typecheck`.

---

## T5 — Helper: `preparePipedriveCredentials`

**What:** New file
`apps/api/src/modules/crm/plugins/pipedrive/pipedrive-prepare.ts`. Export:

```ts
const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com/v1'
interface PrepareCtx { fetchFn: FetchFn; baseUrlOverride?: string }
async function preparePipedriveCredentials(ctx: PrepareCtx, input: PipedriveCredentialsInput): Promise<PipedriveCredentials>
```

Behavior matches design D3:

- If `input.companyDomain` is non-empty (after `.trim()`), return early
  with the input verbatim.
- Else `fetchFn(${baseUrlOverride ?? PIPEDRIVE_API_BASE}/users/me?api_token=${apiToken})`.
- Map 401/403 → throw `PipedriveTokenInvalidException`.
- Other non-2xx → throw `CrmRequestFailedException` with a Pipedrive-shaped
  message.
- 2xx with no `data.company_domain` → throw `PipedriveCompanyDomainUnresolvedException`.
- 2xx with `data.company_domain` → return `{ ...input, companyDomain: <derived> }`.

JSON parsing uses `pipedriveResponseSchema.parse` (reuse from
`pipedrive-api.ts`) or a local zod object — pick whichever keeps the
helper self-contained.

**Depends on:** T1, T4.

**Reuses:** `FetchFn` type, `pipedriveResponseSchema`, `CrmRequestFailedException`.

**Done when:** the helper covers all six branches with focused unit tests.

**Tests (fat):** unit spec covering:
1. companyDomain provided → no fetch call.
2. companyDomain blank/whitespace → fetch called.
3. fetch 401 → token-invalid.
4. fetch 403 → token-invalid.
5. fetch 500 → CrmRequestFailedException.
6. fetch 2xx no data.company_domain → unresolved.
7. fetch 2xx with company_domain → derived.

**Gate:** `bun test --project unit apps/api/src/modules/crm/plugins/pipedrive`.

---

## T6 — Wire Pipedrive into the new port

**What:** In `apps/api/src/modules/crm/plugins/pipedrive/pipedrive.connector.ts`:

1. Import `pipedriveCredentialsInputSchema`.
2. Add `inputSchema: pipedriveCredentialsInputSchema` to the manifest.
3. Add `prepareCredentials: async (input) => preparePipedriveCredentials({ fetchFn, baseUrlOverride }, input.credentials)`.
4. Update the generic so `CRMConnector<typeof pipedriveCredentialsSchema>`
   becomes a two-typed `CRMConnector<typeof pipedriveCredentialsSchema, typeof pipedriveCredentialsInputSchema>` —
   the same shape the channel-plugin port uses for `<S, I>`.

**Depends on:** T2, T5.

**Reuses:** `defineCrmConnector`, `preparePipedriveCredentials`.

**Done when:** the connector compiles and the existing
`pipedrive-connector.spec.ts` unit still passes (no behavioral change to
`parseWebhook`/`fetchLead` etc.).

**Tests:** existing unit spec re-run. New tests for prepare path live in
T5.

**Gate:** `bun typecheck && bun test --project unit apps/api/src/modules/crm/plugins/pipedrive`.

---

## T7 — Use-case rewrite

**What:** In
`apps/api/src/modules/crm/core/use-cases/create-connector-account.use-case.ts`,
replace `registry.validateCredentials(connectorId, sanitized)` with
`await registry.prepareCredentials(connectorId, sanitized)`. Existing
`stripClientWebhookToken` and `withServerWebhookToken` stay.

**Depends on:** T3, T6.

**Reuses:** existing strip/enrich helpers; the new registry method.

**Done when:** the use case compiles; unit tests (if any) updated.

**Tests:** **thin**. The use case is orchestration — covered by the e2e
in T8. Skip a dedicated unit spec.

**Gate:** `bun typecheck`.

---

## T8 — E2E coverage

**What:** Extend
`apps/api/src/modules/crm/__test__/e2e/connector-account.e2e.spec.ts`
(or create one if absent) with three scenarios:

1. **Happy path:** `POST connector-accounts { credentials: { apiToken } }`
   with a mocked Pipedrive `/users/me` returning `data.company_domain`
   succeeds; persisted row has `companyDomain` set.
2. **Token invalid:** mocked `/users/me` returns 401 → 422
   `crm.token-invalid`; no row persisted.
3. **Manual override:** `POST` with `credentials: { apiToken, companyDomain: 'acme' }`
   bypasses the fetch entirely (assert with a fetch-call counter that the
   mock was not called) and persists `companyDomain: 'acme'`.

Mock the global `fetch` at the module boundary used by the connector
(consult existing e2e specs in the same module for the established pattern
— typically a `vi.spyOn(globalThis, 'fetch')`).

**Depends on:** T6, T7.

**Reuses:** existing e2e harness.

**Done when:** three scenarios green, no flake on rerun.

**Tests:** the three e2e scenarios themselves.

**Gate:** `bun test --project e2e apps/api/src/modules/crm`.

---

## T9 — Web: schema export + form rewrite

**What:**

1. In `apps/web/src/routes/_app/settings/connectors/-utils/connector-client-schemas.ts`,
   add a branch: if `connectorId === 'pipedrive'`, return
   `pipedriveCredentialsInputSchema` (NOT the storage schema). The
   existing `OPEN_FALLBACK` stays for unknown ids.
2. In `connector-account-form-body.tsx`, when `connectorId === 'pipedrive'`,
   render the Advanced-settings collapse: primary fields = the **required**
   credentialFields from the manifest (only `apiToken`), and Advanced =
   the rest. **Generic** path: keep the current flat list for non-Pipedrive
   connectors.

   Recommended structure:

   ```tsx
   const { primary, advanced } = useMemo(() => splitFields(fields), [fields])
   ```

   where `splitFields` partitions on `field.required === true`.

3. The collapsible: install via `bunx --bun shadcn@latest add collapsible`
   (per `react.md` §0 + the shadcn skill). If `shadcn search collapsible`
   reports nothing on `base-nova`, fall back to a 20-line wrapper using
   `<details>` + Tailwind animation utilities.

**Depends on:** T1.

**Reuses:** `RhfField`, `Controller`, `ConnectorCredentialFieldsInput` (the
flat renderer — used for the Advanced fields and the generic non-Pipedrive
path).

**Done when:**
- Pipedrive picker renders Name + API token primary; an "Advanced settings"
  toggle reveals Company domain, Activity type, Phone field key.
- Submitting with only API token sends `credentials: { apiToken }` (no
  empty-string companyDomain).
- Existing channel/connector specs unaffected.

**Tests (fat — the resolver wiring is fat):** new web unit spec
`pipedrive-connector-form.spec.tsx` covers:
1. Renders only Name + API token by default.
2. Clicking Advanced toggle reveals the other three inputs.
3. Submitting with API token only posts `{ apiToken }`.
4. Submitting with API token + companyDomain posts both.

**Gate:** `bun test --project web apps/web/src/routes/_app/settings/connectors`.

---

## T10 — Concerns cleanup + docs sweep

**What:**

1. Update `.specs/codebase/CONCERNS.md` if any line referenced the
   "operator must paste both apiToken and companyDomain" friction.
2. Roll the ROADMAP.md Phase 2.1 entry "Token-first Pipedrive connector
   setup" from PLANNED → COMPLETE with a short landed-notes blurb (matches
   existing style for `056`, `057`, `058`).
3. Add the new lesson to `.specs/project/STATE.md` under "Lessons" — one
   paragraph describing the new connector hook and its mirroring of the
   channel pattern.
4. (Pure-docs commit, no code.)

**Depends on:** T1–T9.

**Reuses:** existing roadmap/state structure.

**Done when:** the doc updates render cleanly, `bun check` green.

**Tests:** N/A (docs only).

**Gate:** `bun check`.

---

## Verification

After every task: `bun check` green.

After T8: confirm three new e2e specs pass deterministically (rerun once).

After T9: `bunx --bun shadcn@latest --no-prompt list` if collapsible was
installed — confirm no spurious component drift.

After T10: full `bun check` green; commit history is one focused commit
per task (10 commits total).
