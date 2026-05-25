# Provider setup wizard shell — Specification

## Problem Statement

The current settings surface is a fragmented audit: CRM connectors live
on one page, channels on another, cadences/templates on a third, entry
triggers on yet another. A first-run pilot operator has no path that
says "do these six things, in this order, and you're done". A wizard
shell would knit the existing edit surfaces together — the steps reuse
existing endpoints, not new code.

## Goals

- [ ] An operator visiting `/_app/setup` lands on a wizard that lists
      the six pilot steps with **status** badges (Done / In progress /
      Not started) computed from existing endpoints (connectors list,
      channels list, cadences list, entry-triggers list, routing-
      readiness from feature 062, health endpoints from 060/061).
- [ ] Each step navigates to the existing settings page that owns the
      data. The wizard does NOT replicate forms — it links into them.
- [ ] The wizard route is dismissable; the operator can return any time
      via a side-nav link.
- [ ] Subsequent slices (`064`, `065`, `066`) inline the actual step
      forms where it makes UX sense. This slice ships **only the
      shell + state-machine + status logic**, no new forms.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Inline form rendering | Features 064–066 own those. |
| Saving wizard progress | Status is derived from data state, not stored. |
| Auto-redirect on incomplete setup | Operator-driven; no forced redirect. |

---

## User Stories

### P1: Wizard shell route ⭐ MVP

**Acceptance Criteria**:

1. WHEN the operator navigates to `/_app/setup` THEN the page SHALL
   render a list of six steps with a status badge each:
   1. Connect Pipedrive — Done when ≥1 connector account exists.
   2. Connect WhatsApp — Done when ≥1 channel account exists.
   3. Map BDR routing — Done when every active member is Ready (per
      feature 062).
   4. Create templates — Done when ≥1 template exists.
   5. Create cadence — Done when ≥1 cadence exists.
   6. Set entry trigger — Done when ≥1 entry trigger exists.
2. WHEN the operator clicks a step row THEN it SHALL navigate to the
   step's existing settings page (`/settings/connectors`,
   `/settings/channels`, `/settings/members`, `/_app/workspace/cadences`,
   `/settings/connectors` again for triggers).
3. WHEN no active workspace is selected THEN the page SHALL show an
   empty state.
4. The wizard's status calculations SHALL run client-side via existing
   query hooks — no new API endpoints.

### P2: App-shell entry

**Acceptance Criteria**:

1. The app shell sidebar SHALL gain a "Setup" entry pointing at
   `/_app/setup` so the wizard is discoverable.

---

## Edge Cases

- Multiple connectors/channels/cadences → step is Done as long as ≥1
  exists; counts are not displayed in the shell.
- Routing readiness returns 0 active members → step 3 shows "Not started"
  (no badge regression).

---

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| PSW-01 | P1 shell | Pending |
| PSW-02 | P1 navigation | Pending |
| PSW-03 | P1 client-side derivation | Pending |
| PSW-04 | P2 nav entry | Pending |

## Success Criteria

- [ ] `bun check` green.
- [ ] One new route, no new endpoints, no schema change.
