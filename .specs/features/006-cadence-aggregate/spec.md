# Cadence Aggregate Specification

## Problem Statement

`Cadence` is the v0.1 aggregate (not a workflow graph): a named, ordered sequence of
`Step`s with a stop policy and closed-vocabulary exit hooks (`onReply`, `onExhausted`,
`onComplete`). The engine will execute it; this slice models and CRUDs it so a BDR can
define "5 neutral WhatsApp follow-ups, stop on reply, mark lost on exhaustion."

## Goals

- [ ] `Cadence` (workspace-owned: `name`, `status`, `stopOnReply`, hook action lists).
- [ ] Ordered `Step`s (`delayMinutes`, `jitterMinutes`, `channelStrategy`,
      `channelPluginId`, optional `templateId`); order derived from array position.
- [ ] Closed-vocabulary `CadenceAction` for hooks: `move_stage`, `mark_lost`,
      `log_activity`, `notify_user`, `set_field`, `webhook_out` — validated by shape.
- [ ] CRUD: create (full aggregate, validated + persisted in one transaction), list,
      get (with steps), update (full replace), delete.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `EntryTrigger` (pipeline+stage → cadence) | Ships with the engine slice that consumes it on `lead.stage_entered` |
| Executing the cadence (scheduler/dispatch) | Engine slice |
| Conditional branching / per-step multi-channel | Out of scope for v0.1 (`docs/v0.1-scope.md`) |
| `Lead`/`LeadJourney`/`TouchAttempt` | Engine slice (mirrored/created during ingestion) |

---

## User Stories

### P1: Define a cadence aggregate ⭐ MVP

**Acceptance Criteria**:

1. WHEN a cadence is created with a name and one or more steps THEN it SHALL persist the
   cadence and its steps (order = array index) in a single transaction and return its id.
2. WHEN a cadence is created with zero steps THEN it SHALL reject (`EmptyCadenceException`, 422).
3. WHEN a step names a `channelPluginId` not in the registry THEN it SHALL reject
   (`UnknownChannelPluginException`).
4. WHEN a step references a `templateId` not in the workspace THEN it SHALL reject
   (`TemplateNotFoundException`); WHEN the template's `channelPluginId` differs from the
   step's THEN it SHALL reject (`TemplateChannelMismatchException`, 422).
5. WHEN a hook action has an unknown `type` or missing required params THEN creation
   SHALL reject (422, contract validation).
6. WHEN a non-admin calls write endpoints THEN it SHALL reject (403).

**Independent Test**: create a 2-step cadence referencing a real plugin + template,
read it back with steps; assert empty-steps, bad-plugin, bad-template, and
template-channel-mismatch rejections.

### P1: List, get, update, delete cadences ⭐ MVP

**Acceptance Criteria**:

1. WHEN cadences are listed THEN the response SHALL include id, name, status, and step
   count for the workspace.
2. WHEN a cadence is fetched by id in the workspace THEN it SHALL include its ordered
   steps and hooks; a foreign id SHALL reject (`CadenceNotFoundException`).
3. WHEN a cadence is updated THEN its fields and steps SHALL be fully replaced in one
   transaction (re-validated like create).
4. WHEN a cadence is deleted THEN it and its steps SHALL be removed (cascade).

**Independent Test**: create, list (count = steps), get, update (replace steps), delete.

---

## Edge Cases

- WHEN a step omits `templateId` THEN it is a freeform step (valid; engine sends inline
  text inside the 24h window, else the journey errors `template_required`).
- WHEN `jitterMinutes`/`delayMinutes` is negative THEN reject (contract: `>= 0`).
- WHEN update replaces steps THEN old steps are deleted before new ones are inserted
  (no orphan, no order collision).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CAD-01 | P1: create + transaction | Tasks | Verified |
| CAD-02 | P1: step plugin/template validation | Tasks | Verified |
| CAD-03 | P1: hook action vocabulary | Tasks | Verified |
| CAD-04 | P1: list/get/update/delete | Tasks | Verified |

**Coverage:** 4 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] Create/update are atomic (cadence + steps) and fully validated.
- [ ] The engine (next slice) can read a cadence with ordered steps + hooks.
</content>
