# Engine Dispatcher Specification

## Problem Statement

Ingestion creates running `LeadJourney`s with a `nextTouchAt`. The engine must now
**dispatch** them: an in-process poller picks up due journeys, sends the next step's
touch through the resolved channel, logs it to the CRM, advances the journey, and on
exhaustion runs the cadence's `onExhausted` actions. This is decisions D1 (row lock,
`TouchAttempt` idempotency) and D5 (DB poller).

## Goals

- [ ] `touch_attempts` table, unique `(leadJourneyId, stepOrder)` (idempotency).
- [ ] A pure `resolveNextStep(currentStepOrder, stepCount)` → dispatch step *k* or exhaust.
- [ ] `CadenceActionExecutor`: runs closed-vocabulary actions (`move_stage`, `mark_lost`,
      `log_activity`, `set_field` → CRM connector; `notify_user`, `webhook_out` → internal).
- [ ] `JourneyDispatcher.dispatchDue()`: per due running journey, inside a transaction
      with a pessimistic row lock — re-check `running`, resolve the step, resolve the
      lead-owner's primary channel (none → `error_state`), insert a `TouchAttempt`,
      `validate → Decision` (error → `error_state`), `send`, record the attempt, log a
      CRM activity, advance `nextTouchAt` (+ jitter). On exhaustion → `exhausted` +
      `onExhausted` actions.
- [ ] An in-process poller (`setInterval`, no Redis/BullMQ) calling `dispatchDue()`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Inbound reply (Meta webhook → `replied` → `onReply`) | Feature 010 (reuses the executor) |
| `paused_owner_inactive` handling + bulk reassign | Feature 010 |
| CRM-owner → Kizunu user mapping | Separate; until then a lead with no `ownerUserId` → `error_state` (no channel) |
| `sendingWindow` (timezone/days/hours) | Deferred; dispatch respects only `nextTouchAt` + jitter for v0.1 (flagged) |
| Freeform-body steps | The pilot is template-only (cadences run outside the 24h window); freeform mode without a template → `error_state` |

---

## User Stories

### P1: Dispatch a due step ⭐ MVP

**Acceptance Criteria**:

1. WHEN a running journey is due (`nextTouchAt <= now`) and its next step resolves to a
   registered channel with the lead-owner's primary account THEN the engine SHALL insert
   a `TouchAttempt(journeyId, stepOrder)`, send via the plugin, record the result + the
   provider message id, log a CRM activity, and advance `currentStepOrder` and
   `nextTouchAt` (next step delay + jitter).
2. WHEN the lead owner has no primary channel for the step's plugin THEN the journey
   SHALL move to `error_state` and no touch SHALL be sent.
3. WHEN `validate` returns `error` (e.g. `template_required`) THEN the journey SHALL move
   to `error_state` and no send SHALL occur.
4. WHEN a `TouchAttempt(journeyId, stepOrder)` already exists THEN the step SHALL NOT be
   sent again (idempotency under retry/race).

**Independent Test**: dispatch a due journey with a fake plugin/connector + a seeded
primary channel; assert send + attempt + activity + advance; assert no-channel and
validate-error both → `error_state`; assert a second dispatch of the same step is a no-op.

### P1: Exhaust after the last step ⭐ MVP

**Acceptance Criteria**:

1. WHEN a due journey has no further step THEN it SHALL move to `exhausted` and its
   cadence's `onExhausted` actions SHALL run (e.g. `mark_lost` via the CRM connector).

**Independent Test**: drive a journey past its last step; assert `exhausted` + the
`onExhausted` action executed.

### P1: Poller picks up due journeys ⭐ MVP

**Acceptance Criteria**:

1. WHEN the poller ticks THEN it SHALL dispatch every running journey with
   `nextTouchAt <= now` and skip non-running ones (cancellation needs no job removal).

---

## Edge Cases

- WHEN dispatch throws mid-step THEN the transaction rolls back; the `TouchAttempt` row
  (committed in the same tx) is rolled back too, so the step is retried next tick.
- WHEN the lead has no phone THEN `validate`/`send` cannot target a recipient → the
  journey moves to `error_state`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DSP-01 | P1: dispatch a step (send/attempt/activity/advance) | Tasks | Pending |
| DSP-02 | P1: no-channel / validate-error → error_state | Tasks | Pending |
| DSP-03 | P1: TouchAttempt idempotency | Tasks | Pending |
| DSP-04 | P1: exhaustion → onExhausted | Tasks | Pending |
| DSP-05 | P1: poller dispatches due journeys | Tasks | Pending |

**Coverage:** 5 total, mapped to tasks.

---

## Success Criteria

- [ ] `bun check` green; CI-strict lint clean.
- [ ] A due journey produces exactly one touch per step (idempotent), advances, and
      exhausts into `onExhausted`.
- [ ] No touch is sent when the channel/validate fails — the journey errors explicitly.
</content>
