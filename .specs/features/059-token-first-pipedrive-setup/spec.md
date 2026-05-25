# Token-first Pipedrive connector setup — Specification

## Problem Statement

Today an operator who wants to connect Pipedrive must paste **both** an API
token and a company domain. The company domain comes from the URL bar of an
already-signed-in Pipedrive tab — a friction point the customer has explicitly
called out in `~/Downloads/automacao-fup.md`. Pipedrive itself returns the
domain over `GET /v1/users/me`, so the second field is asking the operator to
do something the backend can do reliably. The current form also surfaces two
infrastructure-grade fields (`activityType`, `phoneFieldKey`) at top level
when the v1.0 pilot defaults are correct 99% of the time.

## Goals

- [ ] An operator pastes the Pipedrive API token, clicks **Connect**, and a
      connector account is created with `companyDomain` auto-derived. Zero
      domain lookup steps.
- [ ] `companyDomain` remains manually overridable for the rare custom-host
      Pipedrive deployment, surfaced under **Advanced settings**.
- [ ] `phoneFieldKey` and `activityType` move into the same **Advanced
      settings** section, so the primary form is one secret + one optional
      override. Stored credentials shape is unchanged.

## Out of Scope

Explicitly excluded.

| Feature | Reason |
| --- | --- |
| OAuth-based Pipedrive connection | Roadmap: Future Considerations. Token-first is what the pilot needs. |
| Multi-CRM equivalent (HubSpot etc.) | Roadmap Phase 1.5 — second CRM. This slice is Pipedrive-only. |
| Editing an existing connector via this form | Connector update endpoint is itself a documented v0.1 gap (STATE Decisions §SETTLED notes); separate slice. |
| Re-deriving `companyDomain` periodically | Pipedrive's domain is account-stable; no need to refresh. |
| Generic "preview" endpoint for non-Pipedrive connectors | The derivation is connector-specific. The new hook is generic, but the wiring is Pipedrive's job. |

---

## User Stories

### P1: Paste-token connect ⭐ MVP

**User Story**: As an operator setting up the pilot, I want to connect
Pipedrive by pasting **only** my API token so that I do not need to look up
my company domain.

**Why P1**: This is the core friction the customer flagged. Without it the
pilot setup remains a two-step token + domain hunt.

**Acceptance Criteria**:

1. WHEN the operator picks Pipedrive in the connector form and the form
   renders THEN system SHALL show **one** primary credential input labeled
   "API token", plus a connector name input, plus a collapsed **Advanced
   settings** section. The current top-level `Company domain`, `Activity
   type`, and `Phone field key` fields SHALL NOT appear at the primary level.
2. WHEN the operator submits the form with only a valid API token THEN system
   SHALL call `GET /v1/users/me` against `https://api.pipedrive.com/v1`
   (a domain-independent host) using the provided token, read
   `data.company_domain` from the response, and persist the connector account
   with that derived `companyDomain` together with the token and server-
   generated `webhookToken`.
3. WHEN `/v1/users/me` returns 401 or 403 THEN system SHALL reject the create
   request with HTTP 422, code `crm.token-invalid`, and a human-readable
   message that says the token is not accepted by Pipedrive. The connector
   account SHALL NOT be persisted.
4. WHEN `/v1/users/me` returns 200 but the response body does not carry a
   non-empty `data.company_domain` string THEN system SHALL reject with HTTP
   422, code `crm.company-domain-unresolved`, and a message that asks the
   operator to provide the domain under Advanced settings.
5. WHEN `/v1/users/me` fails for any other reason (network error, non-2xx
   other than 401/403, malformed JSON) THEN system SHALL reject with HTTP
   422, code `crm.directory-failed`, and an actionable message.
6. WHEN the operator submits the form THEN system SHALL still strip any
   client-supplied `webhookToken` (the feature-053 contract is preserved) and
   server-generate a fresh one.

**Independent Test**: Can demo by setting `APP_DATABASE_URL` to a fresh DB,
seeding a workspace, then `curl -X POST .../connector-accounts` with body
`{ connectorId: 'pipedrive', name: 'Demo', credentials: { apiToken: '<token>' } }`
and verifying the persisted row has `companyDomain` populated by /users/me.

---

### P1: Manual companyDomain override ⭐ MVP

**User Story**: As an operator on a custom-host Pipedrive (e.g.
`acme.pipedrive.com` that does not resolve to the standard public domain),
I want to manually set the company domain so that I can still connect when
auto-derive cannot reach my Pipedrive host.

**Why P1**: Customer self-host or proxied Pipedrive accounts exist; without
the override, those accounts cannot be connected at all.

**Acceptance Criteria**:

1. WHEN the operator opens **Advanced settings** THEN system SHALL show a
   `Company domain` text input (optional), an `Activity type` text input
   (placeholder `task`), and a `Phone field key` text input (optional).
2. WHEN the operator submits the form with a non-empty `companyDomain` in
   the credentials payload THEN system SHALL skip the `/users/me` call,
   persist `companyDomain` verbatim, and rely on the regular validate step
   to reject mismatched shapes. Auto-derive runs **only** when the operator
   omits `companyDomain`.
3. WHEN the operator submits the form with `companyDomain` present but
   blank/whitespace THEN system SHALL treat that as "omitted" — auto-derive
   runs as if the field was not sent.
4. WHEN the operator does not toggle Advanced settings THEN system SHALL
   keep the existing `activityType` default of `'task'` (already in the
   contract schema's `.default('task')`) without surfacing it.

**Independent Test**: Submit
`{ apiToken: '<token>', companyDomain: 'acme' }` and assert no `/users/me`
call goes out (use a mocked `fetchFn`), and the persisted row has
`companyDomain === 'acme'`.

---

### P2: Connector port enrichment hook

**User Story**: As a future connector author (HubSpot, RD), I want the
mechanism Pipedrive uses to auto-derive credentials to be a generic port
extension so that my connector can do the same trick (e.g. deriving an
account region from a `/me` endpoint) without forking the use-case.

**Why P2**: The pattern is the value, not the Pipedrive-specific
derivation. Encoding it as a hook costs less than encoding it once and
re-encoding it for HubSpot.

**Acceptance Criteria**:

1. WHEN a connector implementation declares
   `prepareCredentials?(input): Promise<z.infer<S>>` on the `CRMConnector`
   port THEN the registry SHALL call it after `configSchema` validation and
   before persistence — mirroring the channel module's `onAccountCreated`
   hook semantics.
2. WHEN a connector omits the hook THEN `CreateConnectorAccountUseCase`
   SHALL persist the validated credentials unchanged (current behavior).
3. WHEN the hook returns a value THEN the registry SHALL re-validate the
   hook's return against `configSchema` and reject (`InvalidConnectorCredentialsException`)
   if it no longer matches the schema. This prevents a buggy hook from
   silently storing malformed credentials.
4. WHEN the input schema for create differs from the storage schema (e.g.
   `companyDomain` optional on input, required on storage) THEN the connector
   SHALL declare `manifest.inputSchema?: ZodType` independent of
   `configSchema`. If `inputSchema` is omitted, the registry SHALL use
   `configSchema` as the input schema. The hook receives input parsed
   against `inputSchema` and returns a value parsed against `configSchema`.

**Independent Test**: A unit test on the Pipedrive connector mocks
`fetchFn`, calls the connector's `prepareCredentials({ apiToken: 'X' })`
and asserts the result includes the derived `companyDomain` from the mock
`/users/me` response.

---

### P3: Hide `webhookToken` from the credential-fields walker output

**User Story**: As the web client, I want the connector manifest endpoint
to return `credentialFields` without the `webhookToken` entry so that the
client never has to filter it in two places (today `connector-account-form.tsx`
filters via `serverGenerated !== true`; the equivalent for channels already
hides server-generated fields server-side via the manifest walker).

**Why P3**: Consistency with the channel manifest walker. It is correct
either way today; this is a tidiness item, not a correctness one.

**Acceptance Criteria**:

1. WHEN `GET /connectors` (the available-connectors endpoint added in
   feature 057) renders the Pipedrive `credentialFields` THEN it SHALL
   either continue to include the `serverGenerated: true` entry with the
   flag set (current behavior, web filters) OR omit it entirely if the
   walker is updated. **Either is acceptable**; the slice picks one and
   documents it. If we change the walker, the channel walker output is
   updated in the same step for consistency.

**Independent Test**: Hit `GET /connectors`, inspect the `credentialFields`
array on Pipedrive, and confirm `webhookToken` follows the chosen rule.

---

## Edge Cases

- WHEN the operator submits with an empty string for `apiToken` THEN system
  SHALL reject with the existing 422 `crm.invalid-credentials` from
  `configSchema` validation (`.min(1)` already enforces this on the input
  schema).
- WHEN the operator submits with `apiToken` containing whitespace or URL-
  encoded characters THEN system SHALL pass the token through verbatim —
  Pipedrive accepts opaque tokens — and let `/users/me` either accept or
  reject. No client-side normalization.
- WHEN the operator submits twice with the same name THEN system SHALL
  preserve the existing duplicate-name behavior in
  `CreateConnectorAccountUseCase` (no change in this slice).
- WHEN the network is partitioned and `/users/me` hangs THEN system SHALL
  apply the existing fetch-timeout semantics (none today; track in
  CONCERNS). This slice does not introduce a new timeout — bounded by the
  upstream Pipedrive client `fetchFn`.
- WHEN the operator hits the legacy `companyDomain`-required JSON-paste
  path (e.g. via curl with `{ companyDomain: '...' }`) THEN system SHALL
  continue to honor it (P1#2 of "Manual override").

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TFP-01 | P1 paste-token | Design | Pending |
| TFP-02 | P1 paste-token | Design | Pending |
| TFP-03 | P1 paste-token | Design | Pending |
| TFP-04 | P1 paste-token | Design | Pending |
| TFP-05 | P1 paste-token | Design | Pending |
| TFP-06 | P1 paste-token | Design | Pending |
| TFP-07 | P1 manual override | Design | Pending |
| TFP-08 | P1 manual override | Design | Pending |
| TFP-09 | P1 manual override | Design | Pending |
| TFP-10 | P1 manual override | Design | Pending |
| TFP-11 | P2 port hook | Design | Pending |
| TFP-12 | P2 port hook | Design | Pending |
| TFP-13 | P2 port hook | Design | Pending |
| TFP-14 | P2 port hook | Design | Pending |
| TFP-15 | P3 walker | Design | Pending |

**ID format:** `TFP-NN` (Token-First Pipedrive)
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 15 total, 0 mapped to tasks (Tasks phase pending).

---

## Success Criteria

- [ ] An operator can complete connector setup in `< 30 seconds` given a
      ready Pipedrive API token (down from ~2 minutes of domain-hunting).
- [ ] The web form's primary surface shows exactly **two** inputs (Name +
      API token) — measured by `<input>` count under the connector form
      when "Advanced settings" is collapsed.
- [ ] Existing e2e specs in `connector-account.controller.e2e.spec.ts` (or
      equivalent) keep passing: legacy curl with `companyDomain` provided
      still creates the account.
- [ ] `bun check` green: 0 warnings, 0 errors, all checks pass.
