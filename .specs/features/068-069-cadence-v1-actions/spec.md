# Cadence v1 action builder + safety preview (068 + 069)

## Problem Statement

The cadence builder lets the operator configure `onReply.move_stage`
(optional stage ID), but the BDR handoff task (`log_activity`) and the
lost-deal action (`onExhausted.mark_lost`) are not surfaced in the UI.
Additionally the form ships no read-only preview of what's about to be
saved, so an operator with a slightly wrong cadence has no chance to
notice before activation.

## Goals

- [ ] **068**: cadence builder gains three new fields:
  - "Reply task subject" (string) — when set, adds an
    `onReply.log_activity { activityType: 'task', subject, note }`
    alongside the existing `move_stage`.
  - "Reply task note" (string, optional) — fills `note`.
  - "Lost reason" (string) — when set, adds an
    `onExhausted.mark_lost { reason }`.
- [ ] **069**: a "Preview" panel renders below the form showing the
      computed cadence: step count + total delay, sending-window summary,
      onReply / onExhausted actions, channel strategy. Read-only.

## Out of Scope

- Step-level template-variable resolution preview (deferred — covered by
  feature `048` server-side).
- Per-action editing inside the preview.

## Acceptance Criteria

1. WHEN the operator enters a Reply task subject + (optional) note THEN
   the saved cadence's `onReply` array SHALL include a `log_activity`
   action with `activityType: 'task'` + the subject + note.
2. WHEN the operator enters a Lost reason THEN the saved cadence's
   `onExhausted` array SHALL include a `mark_lost` action with that reason.
3. WHEN the operator types in any field THEN the preview panel SHALL
   update live (no save round-trip).
4. The preview SHALL render an empty-state when no steps are configured.

## Notes

The bulk of this slice is a 5-field form extension + a preview render.
The cadence-action contracts (`packages/api-contracts/src/cadence`)
already accept the action shapes; no server change.
