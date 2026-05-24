# 051 — Cadence Sending Window Presets Specification

## Problem Statement

Feature 049 shipped the engine + contract for `sendingWindow` but
deferred the web admin chooser (T6). Today the cadence create form
sends `sendingWindow: null` unconditionally; admins have no UI path to
opt into business-hours sends.

## Goals

- [ ] Cadence form (create + edit) gains a sending-window preset
      dropdown with three options.
- [ ] Selecting a preset translates to the correct `SendingWindow`
      shape on submit (or `null` for "Always on").
- [ ] No new schema change. No new contract — uses the existing
      `SendingWindowSchema` from feature 049.

## Out of Scope

- Custom/freeform window editor (Phase 2.1+). The preset chooser is
  enough for the pilot; freeform is a UX surface that warrants its
  own design.
- Per-step window. Cadence-level only.
- Lead-timezone routing (use lead's TZ instead of cadence's). Future
  consideration.

---

## User Stories

### P1: Cadence form preset chooser ⭐ MVP

**User Story:** As an admin creating a cadence, I want a dropdown that
lets me pick "Business hours" so my BDRs' WhatsApp touches don't fire
at 3am.

**Acceptance Criteria:**

1. WHEN admin opens the cadence form THEN a "Sending window" Select
   SHALL display three options: "Always on (default)", "Business hours
   (Mon-Fri, 9am-6pm, São Paulo)", "Weekdays (Mon-Fri, 8am-8pm, São
   Paulo)".
2. WHEN admin picks "Always on" AND submits THEN the request body's
   `sendingWindow` SHALL be `null`.
3. WHEN admin picks "Business hours" AND submits THEN the body's
   `sendingWindow` SHALL be `{ timezone: 'America/Sao_Paulo', days:
   [1,2,3,4,5], startMinute: 540, endMinute: 1080 }`.
4. WHEN admin picks "Weekdays (extended)" AND submits THEN the body's
   `sendingWindow` SHALL be `{ timezone: 'America/Sao_Paulo', days:
   [1,2,3,4,5], startMinute: 480, endMinute: 1200 }`.

**Requirement IDs:** `WIN-PRESET-01`, `WIN-PRESET-02`, `WIN-PRESET-03`,
`WIN-PRESET-04`.

---

## Success Criteria

- Web unit test on the preset-to-window mapping function.
- `bun check` green.
- Existing cadence flow (always-on cadence) keeps working.
