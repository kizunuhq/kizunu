# 049 — Cadence Sending Window Specification

## Problem Statement

`JourneyDispatcher.dispatchOne` gates dispatch only on `nextTouchAt <= now`.
Cadences have no `sendingWindow` (timezone + days + hours), so a touch
scheduled at 03:17 local time fires at 03:17. Documented as a HIGH item in
`.specs/codebase/CONCERNS.md` ("Dispatcher gaps: ..., sendingWindow ...").

The pilot needs business-hours sends both for UX (BDRs and leads expect
office-hour outreach) and for WhatsApp reputation (off-hour cold sends
draw spam flags).

## Goals

- [ ] `Cadence` aggregate gains a nullable `sendingWindow` field carrying
      timezone + allowed days + start/end minute-of-day.
- [ ] When `dispatchOne` finds a due running journey whose cadence has a
      `sendingWindow` AND `now` (mapped to the window's timezone) falls
      outside the window, the dispatcher slides `nextTouchAt` forward to
      the next valid slot and returns without sending.
- [ ] Cadences without a `sendingWindow` keep current behavior (dispatch
      whenever `nextTouchAt <= now`).
- [ ] Web admin UI accepts a small set of fixed presets (e.g. "Business
      hours (Mon-Fri, 9am-6pm)") via a Zod-backed form on cadence
      create/edit; full custom input lands in a follow-up. P1 ships only
      the engine + contract.

## Out of Scope

| Excluded | Reason |
| --- | --- |
| Per-step sending window (different windows per cadence step) | Cadence-level is sufficient for pilot. Per-step needs a step-level field + per-step slide logic. |
| Holidays / blackout dates | Phase 2.1+. Requires a per-workspace holiday calendar. |
| Lead-timezone routing (use the lead's TZ instead of the workspace's) | Pilot uses a single TZ per cadence. Lead-TZ needs a phone-prefix → TZ heuristic or a new Lead field. |
| Web admin form for full custom windows | P1 ships preset chooser only; freeform editor is a follow-up. |
| Migrating existing cadences to a default window | Existing cadences keep `sendingWindow: null` (always-on); operators opt in explicitly. |

---

## User Stories

### P1: Dispatcher honors a cadence's sending window ⭐ MVP

**User Story:** As a BDR, when my cadence is configured to send only
Monday-Friday 9am-6pm in São Paulo, I want the engine to delay any touch
that lands outside that window to the next valid slot — without me
re-scheduling each journey by hand.

**Why P1:** Without this, cadences fire 24/7 the moment `nextTouchAt`
passes. Customer UX risk + WhatsApp rep risk.

**Acceptance Criteria:**

1. WHEN a journey is due AND its cadence's `sendingWindow` is `null` THEN
   the dispatcher SHALL proceed (current behavior).
2. WHEN a journey is due AND `now` (mapped to the window's `timezone`)
   falls **within** `[startMinute, endMinute)` AND the local day-of-week
   is in `days` THEN the dispatcher SHALL proceed.
3. WHEN a journey is due AND `now` (mapped to the window's `timezone`)
   falls **outside** the window THEN the dispatcher SHALL update
   `nextTouchAt` to the next valid slot AND return without dispatching;
   the journey stays `running`.
4. WHEN sliding forward AND today (in the window's TZ) is allowed but
   `now` is past `endMinute` THEN `nextTouchAt` SHALL be set to the next
   allowed day's `startMinute`.
5. WHEN sliding forward AND today is allowed AND `now < startMinute` THEN
   `nextTouchAt` SHALL be set to today's `startMinute`.
6. WHEN sliding forward AND today is not an allowed day THEN
   `nextTouchAt` SHALL be set to the next allowed day's `startMinute`.

**Independent Test:** Pure unit tests on a `SlideToWindow.slide(window, now)`
helper with fixed-clock fixtures spanning each branch.

**Requirement IDs:** `WIN-01`, `WIN-02`, `WIN-03`, `WIN-04`, `WIN-05`, `WIN-06`.

---

### P1: Cadence aggregate persists the sending window

**User Story:** As an admin creating a cadence via the API, I want to set
a sending window so future touches respect it.

**Why P1:** No way to drive P1 story 1 without a place to store the value.

**Acceptance Criteria:**

1. WHEN admin creates a cadence with
   `sendingWindow: { timezone: 'America/Sao_Paulo', days: [1,2,3,4,5], startMinute: 540, endMinute: 1080 }`
   THEN the row SHALL persist with that exact shape.
2. WHEN admin creates a cadence omitting `sendingWindow` THEN the row's
   `sendingWindow` SHALL be `null` and behavior matches the "always-on"
   path.
3. WHEN `sendingWindow.timezone` is not a valid IANA name (e.g.
   `'Mars/Olympus_Mons'`) THEN the create endpoint SHALL reject with
   `422` `cadence.invalid-sending-window`.
4. WHEN `sendingWindow.days` is empty OR contains numbers outside `0..6`
   OR `startMinute >= endMinute` THEN the create endpoint SHALL reject
   with `422` `cadence.invalid-sending-window`.

**Independent Test:** E2E spec exercising the create endpoint with a
valid + each invalid scenario.

**Requirement IDs:** `WIN-07`, `WIN-08`, `WIN-09`.

---

### P2: Web admin can choose a preset sending window on cadence create/edit

**User Story:** As an admin, when I create a cadence I want a "Business
hours" preset I can pick from a dropdown, so I don't have to learn the
zod shape.

**Why P2:** Convenience; the API accepts the field directly. Ships in
the same PR.

**Acceptance Criteria:**

1. WHEN admin opens the cadence create form THEN a "Sending window"
   dropdown SHALL show: "Always on", "Business hours (Mon-Fri, 9am-6pm,
   workspace TZ)", "Weekdays only (Mon-Fri, 8am-8pm, workspace TZ)".
2. WHEN admin picks a preset other than "Always on" AND submits THEN
   the request SHALL include the matching `sendingWindow` body.
3. (Out of scope for P2: arbitrary custom window editing — phase 2.1.)

**Independent Test:** Web unit spec on the preset chooser's `formSchema`
transform.

**Requirement IDs:** `WIN-10`, `WIN-11`.

---

## Edge Cases

- WHEN the window crosses midnight (`endMinute < startMinute`) THEN the
  create endpoint SHALL reject with `422` `cadence.invalid-sending-window`.
  Cross-midnight windows are out of scope for v0.1.
- WHEN the resolved next-valid slot would be more than 7 days away (e.g.
  `days: [6]` and we just missed Saturday, slide → next Saturday) THEN the
  slider SHALL still produce the right `nextTouchAt`. The 7-day cap is
  enforced by the pure function's iteration bound (7 day-loops max).
- WHEN the timezone observes DST and the slide lands on the transition
  hour THEN the resolved instant SHALL use Intl-computed offset (no
  hand-rolled DST math). Documented; not separately tested.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| WIN-01 | P1 dispatcher honors | Design | Pending |
| WIN-02 | P1 dispatcher honors | Design | Pending |
| WIN-03 | P1 dispatcher honors | Design | Pending |
| WIN-04 | P1 dispatcher honors | Design | Pending |
| WIN-05 | P1 dispatcher honors | Design | Pending |
| WIN-06 | P1 dispatcher honors | Design | Pending |
| WIN-07 | P1 cadence persists | Design | Pending |
| WIN-08 | P1 cadence persists | Design | Pending |
| WIN-09 | P1 cadence persists | Design | Pending |
| WIN-10 | P2 web preset chooser | Design | Pending |
| WIN-11 | P2 web preset chooser | Design | Pending |

---

## Success Criteria

- [ ] Pure-function `slideToWindow(window, now)` unit-tested across all
      six branches (within / before-startMinute / past-endMinute /
      not-allowed-today / DST-day / cross-week-slide).
- [ ] Integration test: a journey whose `nextTouchAt` lands at 03:00
      local time slides forward to the next allowed slot; subsequent
      dispatch sends as normal.
- [ ] Integration test: a journey whose `nextTouchAt` falls inside the
      window dispatches normally (no slide).
- [ ] E2E: cadence create accepts a valid window; rejects each invalid
      shape with the expected 422 code.
- [ ] No regression: cadences without a `sendingWindow` (null) still
      dispatch as today.
