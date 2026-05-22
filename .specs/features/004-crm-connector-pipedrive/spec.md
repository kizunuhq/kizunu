# CRM Connector + Pipedrive Specification

## Problem Statement

The pilot starts when a BDR moves a Pipedrive deal into a follow-up stage, and ends
with Activity logging / stage moves / mark-lost back in Pipedrive. v0.1 needs the
`CRMConnector` port (decision D3) so cadences consume a normalized vocabulary and
never see Pipedrive, plus the per-workspace `ConnectorAccount` (API token + config)
and the real Pipedrive connector (`parseWebhook` normalization + outbound actions).

## Goals

- [ ] Freeze the `CRMConnector` port: `manifest`, `parseWebhook → NormalizedEvent[]`,
      `fetchLead`, `logActivity`, `moveStage`, `markLost`, `setField` (D3).
- [ ] `CRMConnectorRegistry` resolves connectors by id and validates `ConnectorAccount`
      credentials against the connector's `configSchema`.
- [ ] `ConnectorAccount` (workspace-owned, one per connector instance, token + config)
      with admin CRUD; credentials never returned by reads.
- [ ] Pipedrive connector: `parseWebhook` normalizes `deal.updated` filtered by
      `stage_id` transition (`previous` + `current`) into `lead.stage_entered`, with the
      idempotency key `pipedrive:deal:{id}:event:{event}:{timestamp}`; outbound actions
      call the Pipedrive API.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `EntryTrigger` (pipeline+stage → cadence) | References `cadenceId`; ships with the Cadence/Engine slice |
| Webhook ingestion endpoint (HTTP) that starts cadences | Needs `LeadJourney`/engine; ships with the engine slice |
| Throttled outbound queue + retry/backoff | Engine dispatch concern (D3's queue lives with the engine) |
| OAuth (vs API token) | Cloud-only; v0.1 uses a per-workspace API token |
| Credential encryption at rest | Same flagged concern as channel credentials (CONCERNS) |

---

## User Stories

### P1: CRM connector port + registry ⭐ MVP

**Acceptance Criteria**:

1. WHEN a connector is registered THEN the registry SHALL resolve it by id and reject
   unknown ids (`UnknownCrmConnectorException`) and duplicate ids (fail fast).
2. WHEN credentials are validated THEN the registry SHALL run the connector
   `configSchema`, throwing `InvalidConnectorCredentialsException` (422) on failure.

**Independent Test**: register the Pipedrive connector, resolve it, assert unknown/dup
throw and credential validation accepts/rejects.

### P1: ConnectorAccount CRUD ⭐ MVP

**Acceptance Criteria**:

1. WHEN an admin creates a connector account with a registered `connectorId` and valid
   credentials THEN it SHALL persist scoped to the workspace and return its id.
2. WHEN credentials fail the connector `configSchema` THEN create SHALL reject (422),
   no row written.
3. WHEN accounts are listed THEN the response SHALL include id, connectorId, name,
   timestamps and SHALL NOT include credentials.
4. WHEN a non-admin calls create/list THEN it SHALL reject (403).

**Independent Test**: create a Pipedrive account, list it (no credentials), assert bad
credentials rejected.

### P1: Pipedrive parseWebhook normalization ⭐ MVP

**Acceptance Criteria**:

1. WHEN a `deal.updated` webhook moves `stage_id` from `previous` to a different
   `current` THEN `parseWebhook` SHALL emit one `NormalizedEvent`
   `{ type: 'lead.stage_entered', externalId: deal.id, ownerExternalId: deal.user_id,
   occurredAt, raw, stageId: current, idempotencyKey }`.
2. WHEN `stage_id` is unchanged (`previous.stage_id === current.stage_id`) THEN
   `parseWebhook` SHALL emit `[]` (no stage transition).
3. WHEN the event is not `deal.updated` or the body is malformed THEN `parseWebhook`
   SHALL emit `[]` (never throw).
4. The idempotency key SHALL be `pipedrive:deal:{id}:event:{event}:{timestamp}`.

**Independent Test**: feed a stage-change payload, a no-change payload, a non-deal
payload, and junk; assert events + idempotency key.

### P2: Pipedrive outbound actions

**Acceptance Criteria**:

1. WHEN `logActivity` is called THEN it SHALL POST an activity (with `user_id` = deal
   owner) and return `{ externalActivityId }`.
2. WHEN `moveStage` / `markLost` / `setField` are called THEN they SHALL PUT/PATCH the
   deal accordingly (`markLost` sets `status=lost` + `lost_reason`).
3. WHEN the Pipedrive API responds non-OK THEN the action SHALL surface a
   `CrmRequestFailedException` (or a failed result) rather than silently succeeding.

**Independent Test**: call each action with a fake fetch; assert request shape and
error handling.

---

## Edge Cases

- WHEN a webhook payload nests `previous`/`current` without `stage_id` THEN treat as no
  transition (`[]`).
- WHEN `fetchLead` returns a deal without an owner THEN `ownerExternalId` is null/empty
  and the normalized lead reflects that.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CRM-01 | P1: port + registry | Tasks | Verified |
| CRM-02 | P1: ConnectorAccount CRUD | Tasks | Verified |
| CRM-03 | P1: Pipedrive parseWebhook | Tasks | Verified |
| CRM-04 | P2: Pipedrive outbound actions | Tasks | Verified |

**Coverage:** 4 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] `parseWebhook` never throws and only emits on a real stage transition.
- [ ] Cadences/engine can depend on `NormalizedEvent` without any Pipedrive type.
- [ ] No endpoint returns connector credentials.
</content>
