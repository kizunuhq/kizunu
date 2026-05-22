# Engine Ingestion Specification

## Problem Statement

The pilot starts when a deal enters a follow-up stage. The CRM connector already
normalizes that to `lead.stage_entered`; the engine must now turn it into a running
`LeadJourney`. This slice adds the `Lead` + `LeadJourney` tables, the start-journey
use-case (resolve the cadence via `EntryTrigger`, mirror the `Lead`, create the
journey), and the per-connector CRM webhook endpoint that drives it.

## Goals

- [ ] `leads` (workspace + connector-account scoped, mirrored from CRM: `externalId`,
      `ownerExternalId`, `phone`) and `lead_journeys` (status conforms to
      `LeadJourneyStatus` via `Assert<Equal>`, `currentStepOrder`, `nextTouchAt`).
- [ ] `StartJourneyUseCase`: on `lead.stage_entered`, look up the `EntryTrigger`; if one
      maps the stage, fetch + upsert the `Lead` and create a running `LeadJourney`
      (first `nextTouchAt` from the cadence's first step delay). Idempotent: no second
      non-terminal journey for the same lead + cadence.
- [ ] Per-connector CRM webhook (`POST /webhooks/crm/:connectorAccountId`, public):
      resolve the account, `connector.parseWebhook`, run each event through ingestion,
      always acknowledge 200.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Scheduler / dispatch / `TouchAttempt` | Feature 009 (this slice only creates journeys) |
| Inbound reply (Meta webhook) | Feature 010 |
| Mapping `ownerExternalId` → Kizunu user | Deferred; `ownerUserId` stays null until reassignment UI |
| Event-key dedup table | Idempotency is enforced at the lead+cadence journey level for v0.1 |
| Webhook signing/secret beyond the unguessable account id | Hardening follow-up (flagged in CONCERNS) |

---

## User Stories

### P1: Start a journey from a stage-entered event ⭐ MVP

**Acceptance Criteria**:

1. WHEN a `lead.stage_entered` event arrives and an `EntryTrigger` maps
   `(connectorAccountId, stageId)` to a cadence THEN the system SHALL upsert the `Lead`
   (from `connector.fetchLead`) and create a `running` `LeadJourney` for that cadence.
2. WHEN no `EntryTrigger` maps the stage THEN the system SHALL do nothing (no lead, no
   journey) and not error.
3. WHEN a non-terminal journey already exists for the lead + cadence THEN the system
   SHALL NOT create a second one (idempotent re-entry).
4. WHEN the journey is created THEN `nextTouchAt` SHALL be `now + firstStep.delayMinutes`
   and `currentStepOrder` SHALL be `-1` (no step dispatched yet).

**Independent Test**: drive ingestion with a fake connector + an entry trigger; assert
lead upsert + journey creation, no-op without a trigger, and idempotent re-entry.

### P1: CRM webhook endpoint ⭐ MVP

**Acceptance Criteria**:

1. WHEN `POST /webhooks/crm/:connectorAccountId` receives a payload THEN it SHALL
   resolve the connector account, parse the payload via its connector, run each event
   through ingestion, and respond 200 — even when there are zero events.
2. WHEN the `connectorAccountId` does not exist THEN it SHALL respond 404.

**Independent Test**: e2e/integration is heavy (auth-less public route); covered by the
ingestion use-case unit/integration and a controller-level check of resolve + parse.

---

## Edge Cases

- WHEN `connector.fetchLead` yields no phone THEN the `Lead` is still created (phone
  null); the scheduler will later move the journey to `error_state` if it cannot send.
- WHEN the same deal re-enters the same stage THEN the existing non-terminal journey is
  kept (no duplicate).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ING-01 | P1: start journey + cadence resolution | Tasks | Verified |
| ING-02 | P1: idempotent re-entry | Tasks | Verified |
| ING-03 | P1: lead upsert + nextTouchAt | Tasks | Verified |
| ING-04 | P1: CRM webhook endpoint | Tasks | Verified |

**Coverage:** 4 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] A stage-entered event with a matching trigger produces exactly one running journey.
- [ ] The scheduler (009) can pick up journeys by `nextTouchAt <= now`.
</content>
