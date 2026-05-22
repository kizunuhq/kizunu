# Engine: LeadJourney State Machine + EntryTrigger Specification

## Problem Statement

The engine executes cadences against leads as `LeadJourney`s. Two pieces can be built
and tested before the scheduler/webhooks: (1) the `LeadJourney` **state machine** —
the D1 transition rules (`running → paused | replied | exhausted | stopped |
error_state | paused_owner_inactive`) as pure, testable logic; and (2) the
`EntryTrigger` config (pipeline+stage → cadence) the engine will read on
`lead.stage_entered`. This slice delivers both; ingestion, dispatch, and inbound
reply (which create/advance journeys and write touch attempts) follow.

## Goals

- [ ] `LeadJourneyStatus` as the domain vocabulary (derived `const` object, ADR 002).
- [ ] A pure `transition(current, event)` enforcing the D1 state machine; illegal
      transitions raise `InvalidJourneyTransitionException`.
- [ ] `EntryTrigger` (workspace-owned: `connectorAccountId`, `pipelineId?`, `stageId`,
      `cadenceId`) with admin CRUD; one cadence per (connector account, stage).

## Out of Scope

| Feature | Reason |
| --- | --- |
| `Lead`/`LeadJourney`/`TouchAttempt` tables + repos | Created/written by ingestion (008) and the scheduler (009) — added with their consumers |
| Scheduler / dispatch / row lock | Feature 009 |
| Inbound webhooks + reply handling | Features 008/010 |
| Action executor (`move_stage`, …) | Feature 009/010 (needs channel/CRM orchestration) |

---

## User Stories

### P1: LeadJourney state machine ⭐ MVP

**Acceptance Criteria** (events → resulting status):

1. WHEN `reply` occurs on a `running` (or `paused`/`paused_owner_inactive`) journey THEN
   it SHALL become `replied` (a reply always stops the cadence — D1).
2. WHEN `exhaust` occurs on a `running` journey THEN it SHALL become `exhausted`.
3. WHEN `error` occurs on a `running` journey THEN it SHALL become `error_state`.
4. WHEN `pause`/`resume` occur THEN `running ↔ paused`.
5. WHEN `owner_inactive` occurs on a `running` journey THEN it SHALL become
   `paused_owner_inactive`; `owner_reactivated` returns it to `running`.
6. WHEN `stop` occurs THEN an active journey SHALL become `stopped`.
7. WHEN an event is applied to a status it is not allowed from (e.g. `exhaust` on a
   `replied` journey) THEN it SHALL raise `InvalidJourneyTransitionException`.

**Independent Test**: drive each event from legal and illegal states.

### P1: EntryTrigger CRUD ⭐ MVP

**Acceptance Criteria**:

1. WHEN an admin creates a trigger with a `connectorAccountId` and `cadenceId` both in
   the workspace THEN it SHALL persist; a foreign connector account or cadence SHALL
   reject (`ConnectorAccountNotFoundException` / `CadenceNotFoundException`).
2. WHEN a trigger already maps the same `(connectorAccountId, stageId)` THEN create
   SHALL reject (`DuplicateEntryTriggerException`, 409).
3. WHEN triggers are listed THEN the response SHALL include id, connectorAccountId,
   pipelineId, stageId, cadenceId for the workspace.
4. WHEN a trigger is deleted by id in the workspace THEN it SHALL apply; a foreign id
   SHALL reject (`EntryTriggerNotFoundException`).
5. WHEN a non-admin calls these THEN it SHALL reject (403).

**Independent Test**: create (assert dup + foreign-ref rejection), list, delete.

---

## Edge Cases

- WHEN `pipelineId` is omitted THEN the trigger matches the stage regardless of pipeline.
- WHEN the cadence referenced by a trigger is later deleted THEN the trigger row is
  removed by cascade (no dangling trigger).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ENG-01 | P1: state machine transitions | Tasks | Verified |
| ENG-02 | P1: illegal transition rejection | Tasks | Verified |
| ENG-03 | P1: EntryTrigger create + validation | Tasks | Verified |
| ENG-04 | P1: EntryTrigger list/delete | Tasks | Verified |

**Coverage:** 4 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] The state machine provably rejects every illegal transition.
- [ ] Ingestion (008) can map a `lead.stage_entered` to a cadence via an EntryTrigger.
</content>
