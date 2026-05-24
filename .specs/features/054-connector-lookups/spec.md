# 054 — Connector Lookups Specification

## Problem Statement

Several Kizunu admin surfaces still ask the operator to paste raw external
identifiers — Pipedrive user IDs (member-connector-identity admin), Pipedrive
pipeline/stage IDs (entry triggers), Meta template names + WABA phone-number
IDs (Coex onboarding, cadence steps). Every paste is a context switch to the
provider's UI, a copy-paste error waiting to happen, and a silent typo means
the cadence fires against the wrong stage or template. Pilots feel this on
day one, when their onboarding is the slowest part of the v0.1 promise.

We need provider-backed lookups so each ID field becomes a labeled picker
populated live from the provider's own API, using the workspace's existing
connector credentials.

## Goals

- [ ] Replace every raw-ID input in the admin UI with a labeled lookup for
      Pipedrive users, pipelines, stages, custom fields, Meta WhatsApp
      templates, and Meta WABA phone numbers.
- [ ] Add a single generalized "directory" capability to the channel and
      CRM plugin contracts so a new provider only needs to implement the
      resources it actually exposes.
- [ ] Cache directory responses in-memory per (account, resource) for a
      short window (default 60s) without ever crossing workspace boundaries.
- [ ] Surface provider-side failures (token expired, rate-limited, asset
      revoked) as actionable UI states — never as a silent empty list.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Surfacing the Coex onboarding route in the sidebar | Separate small UX feature; covered by a follow-up `feat(web)` PR. |
| Submitting / creating templates from Kizunu to Meta | Mutation surface; feature 054 stays read-only. |
| Full "Meta connector" settings page redesign | This feature only adds lookup fields where IDs are pasted today. |
| HubSpot / Telegram directory implementations | The contract is generalized so they slot in later; implementations land in their own features. |
| Persistent (cross-process / Redis) caching | In-memory per pod is enough for v0.1; revisit when we add a second API replica. |
| Search-as-you-type with provider-side filtering | The first cut is fetch-all-then-filter-client-side; resource lists are small in the pilot range (<200 users, <50 pipelines). |

---

## User Stories

### P1: Pipedrive user lookup on member-connector-identity admin ⭐ MVP

**User Story**: As a workspace admin, I want to pick the Pipedrive user
that a Kizunu member maps to from a labeled dropdown, so I don't have to
copy IDs out of Pipedrive's settings page.

**Why P1**: It's the highest-traffic paste-an-ID surface today — every new
member added to the workspace hits it — and it's the only one where typos
cause silent lead-routing failures (a wrong `externalId` makes the
backfill drop ownership on the floor).

**Acceptance Criteria**:

1. WHEN an admin opens the create/edit member-identity dialog
   THEN the system SHALL show a Combobox listing every active Pipedrive
   user on the selected connector account, labeled `Name <email>`, sorted
   alphabetically by name, with the external ID held as the option value.
2. WHEN the connector account's credentials are valid AND the directory has
   been fetched in the last 60 seconds for the same `(accountId, "users")`
   pair THEN the system SHALL serve the cached list and SHALL NOT call
   Pipedrive's API.
3. WHEN the admin clicks the "Refresh" affordance on the lookup THEN the
   system SHALL bypass the cache for that single `(accountId, "users")`
   pair, fetch fresh, and update the visible list.
4. WHEN Pipedrive returns 401 / token-expired for the directory call THEN
   the system SHALL surface a "Reconnect this connector" CTA in the
   lookup's empty state, linking to the connector account's settings
   page, AND SHALL NOT show a generic toast.
5. WHEN the connector account belongs to a different workspace than the
   caller's active workspace THEN the API SHALL respond 404 (consistent
   with the existing `ConnectorAccountNotFoundException` envelope) BEFORE
   any call to Pipedrive is made.

**Independent Test**: Open `/_app/settings/connectors/member-identities`,
create an identity against a real Pipedrive account, see the user list
populated, confirm the form submits the underlying ID (verifiable via the
admin list page showing the same name). Disconnect the account at
Pipedrive (revoke token), re-open the dialog → see the reconnect CTA.

---

### P2: Pipedrive pipelines and stages lookup on entry trigger config ⭐ MVP

**User Story**: As a workspace admin, I want to pick a pipeline and then
the stage within it (the cadence's "entry stage") from labeled dropdowns,
so my entry trigger fires against the right stage even after Pipedrive's
stages get renumbered.

**Why P2**: Stage IDs change when a pipeline is rebuilt — pasted IDs go
stale silently. Picker reads the live stage name, so a rebuild surfaces
visibly the next time the admin opens the trigger.

**Acceptance Criteria**:

1. WHEN an admin opens the entry-trigger editor THEN the system SHALL show
   a `Pipeline` Combobox and a `Stage` Combobox, the latter disabled until
   a pipeline is selected.
2. WHEN the admin selects a pipeline THEN the `Stage` Combobox SHALL fetch
   that pipeline's stages (cached per `(accountId, "stages", pipelineId)`
   for 60 seconds) and display them sorted by Pipedrive's `order_nr`.
3. WHEN the admin changes the pipeline selection THEN the previously
   selected stage SHALL be cleared from the form state to prevent an
   orphan stage being submitted.
4. WHEN the connector account has no pipelines (new Pipedrive account)
   THEN the lookup SHALL display an empty state with a link to the
   provider's pipeline-management URL and SHALL NOT submit a stage value.

**Independent Test**: Build an entry trigger end-to-end against a Pipedrive
account with 2 pipelines × 5 stages each; confirm only the chosen
pipeline's stages appear under Stage; confirm switching pipelines
clears the stage.

---

### P3: Pipedrive custom fields lookup for the field resolver

**User Story**: As a workspace admin configuring template variable
resolution, I want to pick the Pipedrive custom field that feeds a
variable from a labeled list, instead of guessing the field's
hash-suffixed key.

**Why P3**: Field keys (`f3a8b1c2…`) are the worst kind of ID to paste
because they're long and look meaningful but aren't; however, the field
resolver itself is a narrower flow than the others and a non-trivial set
of pilots won't touch custom-field variables on day one.

**Acceptance Criteria**:

1. WHEN an admin opens the template variable resolver THEN the system
   SHALL show a Combobox listing every Pipedrive deal-field, labeled
   `Field name (type)`, with the field key held as the value.
2. WHEN the field list exceeds 100 entries THEN the Combobox SHALL filter
   client-side as the admin types.
3. WHEN a previously chosen field has been deleted in Pipedrive THEN the
   lookup SHALL show the stored key with a `(deleted)` suffix so the admin
   notices and can re-pick.

**Independent Test**: Configure a variable bound to a custom field;
delete that field at Pipedrive; reopen the resolver → see the deleted
indicator.

---

### P1: Meta WhatsApp template lookup on cadence step config ⭐ MVP

**User Story**: As a workspace admin building a cadence step, I want to
pick the WhatsApp template from a labeled dropdown filtered to approved
templates only, so the cadence never tries to send a paused or rejected
template.

**Why P1**: A wrong template name is a 100% delivery-failure mode — Meta
rejects the send and the cadence stalls. Filtering to `APPROVED` at the
source kills that class of error.

**Acceptance Criteria**:

1. WHEN an admin opens a cadence step editor of type "WhatsApp template
   message" THEN the system SHALL show a Combobox listing the WABA's
   templates, labeled `Name · Language · Category`, filtered server-side
   to `status === 'APPROVED'`, with the template name held as the value.
2. WHEN the admin selects a template THEN the form SHALL also capture the
   template's language code (no separate language input — the picked
   template determines it).
3. WHEN the WABA has zero approved templates THEN the lookup SHALL display
   "No approved templates yet" with a link to Meta's WABA template manager
   and SHALL block step submission with a field-level error.
4. WHEN Meta returns 401 / token-expired THEN the system SHALL surface the
   same "Reconnect this connector" CTA pattern as P1, scoped to the
   channel account (not the Pipedrive one).

**Independent Test**: Build a WhatsApp cadence step against a real WABA
with at least one approved template; submit the cadence; trigger a send;
confirm the message lands.

---

### P2: Meta WABA phone-number lookup on Coex confirmation

**User Story**: As a workspace admin finishing the Coex Embedded Signup
flow, I want the captured `phone_number_id` to be confirmed against the
WABA's phone roster (labeled `+55 11 99999-9999 (display name)`) instead
of trusting Meta's postMessage blindly.

**Why P2**: The Coex postMessage occasionally returns a phone-number ID
that's not yet visible on the WABA (during number-migration windows). A
labeled lookup catches the case before the operator confirms.

**Acceptance Criteria**:

1. WHEN the Coex flow's postMessage delivers a `phone_number_id` AND a
   `waba_id` THEN the connect-meta-coex screen SHALL list every phone on
   that WABA (labeled `E.164 (display name) — verification status`) and
   pre-select the one matching the postMessage.
2. WHEN the postMessage's `phone_number_id` is NOT present on the WABA's
   roster THEN the screen SHALL show an inline warning ("This number isn't
   on your WABA yet — pick a different one or finish migration in Meta")
   and SHALL disable the Finish button until the admin selects a valid
   one.
3. WHEN the WABA roster is empty THEN the Finish button SHALL be disabled
   and the screen SHALL link out to Meta's phone-number registration
   guide.

**Independent Test**: Run the Coex flow end-to-end; verify the phone
picker matches what Meta's dashboard shows for the WABA; verify the
"missing from roster" warning by temporarily renaming the captured
phone-number ID in devtools before submit.

---

### P3: Generalized directory capability on the plugin contracts

**User Story**: As a Kizunu engineer adding a new provider (HubSpot,
Telegram), I want a single typed `directory(resource, credentials)` method
on the connector contract so I implement only what my provider supports,
without modifying the lookup endpoint or its caching layer.

**Why P3**: This is a refactor concurrent with the P1/P2 implementations —
it keeps Pipedrive and Meta from each growing one-off lookup methods. It's
listed P3 because it's a means, not an end: the user-visible value is
delivered by P1/P2 either way, but skipping this would leave the next
provider rebuilding the layer.

**Acceptance Criteria**:

1. WHEN a new connector is added without a `directory` implementation
   THEN every `GET /…/directory/:resource` call against it SHALL respond
   422 with `code: 'connector.directory-unsupported'` and `context:
   { connectorId, resource }`.
2. WHEN a connector declares a resource in its manifest's
   `directoryResources: readonly string[]` THEN the corresponding API
   endpoint SHALL accept that exact resource name and SHALL reject any
   resource not listed via 422 BEFORE any provider call.

**Independent Test**: Add a stub `directoryResources: []` to a fake plugin;
GET `/…/directory/users` → 422 `connector.directory-unsupported`. Add
`['users']` and a directory method → same call returns the user list.

---

## Edge Cases

- **Workspace scope collision.** WHEN two workspaces hold connector
  accounts with overlapping cache keys (same provider, same external
  account ID) THEN the cache key SHALL include the `workspaceId` so neither
  workspace can serve the other's data even on key collision.
- **Concurrent writes during cache window.** WHEN the admin edits a user's
  email at Pipedrive while the cache is still warm THEN the lookup SHALL
  show the stale label for up to 60 seconds; the "Refresh" affordance is
  the operator's escape hatch.
- **Provider rate-limit (429).** WHEN the provider responds 429 THEN the
  API SHALL respond 503 with `code: 'connector.rate-limited'` and SHALL
  include the provider's `Retry-After` (if present) in `context.retryAfterSeconds`;
  the UI SHALL show a "Provider is rate-limiting us — try again in N
  seconds" message.
- **Long lists.** WHEN a directory returns more than 500 entries THEN the
  API SHALL truncate to 500, sort deterministically, and SHALL set
  `meta.truncated: true` in the response body so the UI can show a
  "showing first 500 — search to narrow" hint.
- **Plugin throws unexpectedly.** WHEN the connector's `directory` method
  throws a non-ApplicationException THEN the controller SHALL log with the
  connector id + resource and respond 500 via the existing
  `ApplicationExceptionFilter` envelope.
- **Web cache eviction.** WHEN the admin disconnects then reconnects a
  connector account THEN the TanStack Query keys SHALL be invalidated on
  the next `useDirectory*` mount (caller invalidates on the
  reconnect-success hook).
- **Field-resolver deleted field.** WHEN a stored Pipedrive field key is
  no longer present in the directory THEN the lookup SHALL render it as a
  disabled option suffixed `(deleted)` and SHALL still allow form submit
  (so we don't break stored cadences mid-edit).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LOOKUP-01 | P1: Pipedrive user lookup | Design | Pending |
| LOOKUP-02 | P1: Pipedrive user lookup (cache hit) | Design | Pending |
| LOOKUP-03 | P1: Pipedrive user lookup (manual refresh) | Design | Pending |
| LOOKUP-04 | P1: Pipedrive user lookup (token-expired CTA) | Design | Pending |
| LOOKUP-05 | P1: Workspace-scoped 404 before provider call | Design | Pending |
| LOOKUP-06 | P2: Pipeline + stage cascading lookup | Design | Pending |
| LOOKUP-07 | P2: Stage cleared on pipeline change | Design | Pending |
| LOOKUP-08 | P2: Empty-pipelines empty state | Design | Pending |
| LOOKUP-09 | P3: Pipedrive custom field lookup | Design | Pending |
| LOOKUP-10 | P3: Custom field client-side filter | - | Pending |
| LOOKUP-11 | P3: Deleted-field indicator | - | Pending |
| LOOKUP-12 | P1: Meta template lookup (APPROVED only) | Design | Pending |
| LOOKUP-13 | P1: Template language auto-bound | Design | Pending |
| LOOKUP-14 | P1: Zero-approved-templates empty state | Design | Pending |
| LOOKUP-15 | P1: Meta token-expired CTA | Design | Pending |
| LOOKUP-16 | P2: WABA phone-number picker on Coex | Design | Pending |
| LOOKUP-17 | P2: Coex postMessage / WABA roster mismatch warning | Design | Pending |
| LOOKUP-18 | P2: Empty WABA roster blocks Finish | Design | Pending |
| LOOKUP-19 | P3: Generalized directory capability | Design | Pending |
| LOOKUP-20 | P3: Manifest declares directoryResources | Design | Pending |
| LOOKUP-21 | EDGE: Workspace-scoped cache key | Design | Pending |
| LOOKUP-22 | EDGE: 429 → 503 with retryAfterSeconds | Design | Pending |
| LOOKUP-23 | EDGE: 500-entry truncation + meta.truncated | Design | Pending |
| LOOKUP-24 | EDGE: Reconnect invalidates query keys | Design | Pending |

**ID format:** `LOOKUP-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 24 total, 0 mapped to tasks (Tasks phase pending), 0 unmapped ⚠️

---

## Architectural Constraints (carried into Design)

These are constraints the feature must respect; they go into `design.md`
as a starting point rather than open decisions.

- **Type-safe boundary.** Every endpoint added by this feature starts with
  a contract in `@kizunu/api-contracts` (schema + `Routes` entry), then an
  api controller, then `*.api.ts` + `use-*.ts` in `@kizunu/api-client`.
  (`AGENTS.md` "Type-safe API boundary".)
- **Per-module hexagonal.** The lookup orchestration lives as a use case
  under `apps/api/src/modules/{crm,channel}/core/use-cases/`. The
  cross-cutting cache wraps the use case at the controller boundary, not
  inside the provider plugins.
- **Plugin contracts.** Both `CRMConnector` and the channel plugin
  interface gain an optional `directory(resource, credentials, options?)`
  method plus a `manifest.directoryResources: readonly string[]`. The
  registry already exists and is unchanged.
- **Credentials.** Directory calls reuse the existing encrypted-credential
  fetch path (`ConnectorAccountRepository.findWithCredentials` on the CRM
  side and `findWorkspaceAndCredentials` on the channel side) — no new
  storage.
- **Cache.** In-memory `Map<string, { value, expiresAt }>` keyed by
  `${workspaceId}:${accountId}:${resource}:${paramsHash}`. TTL is 60s,
  configurable per-resource via a per-plugin override. Eviction is
  lazy-on-read.
- **Errors.** New error codes follow the existing envelope:
  `connector.directory-unsupported` (422), `connector.rate-limited` (503),
  `connector.token-expired` (422 — caller-recoverable via reconnect),
  `connector.directory-failed` (502 — generic upstream failure).
- **Web patterns.** Hooks land as `useDirectoryPipedriveUsers(accountId)`,
  `useDirectoryPipedriveStages(accountId, pipelineId)`, etc. — same shape
  as existing TanStack Query hooks. The "reconnect this connector" CTA is
  a composed primitive added once and reused.
- **Tests.** The thin/fat split applies. The use case + cache are fat
  (deterministic logic, error mapping, key derivation) and get unit tests.
  Provider plugins' `directory` implementations are fat (parsing
  Pipedrive/Meta JSON into normalized rows) and get unit tests with the
  same `fetchFn` injection pattern as `PipedriveApi`. The controller +
  endpoint layering is thin and covered by e2e.

---

## Success Criteria

- [ ] Every list of `Input`-typed external-ID fields in the catalogued
      surfaces is replaced; a grep for the field labels in `apps/web` shows
      zero remaining bare `<Input>` for those IDs (verifiable in PR diff).
- [ ] A pilot admin can complete the full "connect Pipedrive → set up entry
      trigger → connect WhatsApp → build cadence step → run" path without
      ever opening Pipedrive's or Meta's UI to look up an ID.
- [ ] Cache hit ratio for repeated modal opens within 60s is observably
      100% via the use-case unit test; cold opens hit the provider exactly
      once (no N+1 across the cascading pipeline → stage flow on first
      pipeline pick).
- [ ] `bun check` green; the strict layering checks (zod-v4, drizzle,
      import-depth) stay clean.
- [ ] No new tech debt entries in `CONCERNS.md` introduced by this
      feature; if any are inherited (e.g. lack of cross-pod cache),
      they're filed there with the relevant pointer.
