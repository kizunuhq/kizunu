# Wizard inline actions (064 + 065 + 066) — Specification

## Problem Statement

Feature `063` delivered the wizard shell with link-out rows. The
original `064`, `065`, `066` slices in the roadmap ask for **inline**
actions per step — the operator should be able to launch the
"Add connector / Add channel / Add cadence / Add trigger" dialog from
within the wizard, not bounce to another page.

These three slices share the same wizard route file and are each
~5 lines of UI plumbing on top of existing dialogs. Combining them
into a single PR keeps the changeset focused; they are otherwise
independent and could ship separately.

## Goals

- [ ] Step 1 (Connect Pipedrive) has an inline "Add connector" trigger
      opening the existing `CreateConnectorAccountDialog`.
- [ ] Step 2 (Connect WhatsApp) has an inline "Add channel" trigger
      opening the existing `CreateChannelAccountDialog`.
- [ ] Step 4 (Templates) has an inline "New template" trigger opening
      the existing template-create dialog.
- [ ] Step 5 (Cadence) has an inline "New cadence" trigger opening the
      existing cadence-create dialog.
- [ ] Step 6 (Entry trigger) has an inline "Add entry trigger" trigger
      opening `CreateEntryTriggerDialog`.
- [ ] All forms already use labeled provider pickers (delivered in
      features `054` + `059`); no new UI primitives needed.

## Out of Scope

- Step 3 (Routing) — review only, no create dialog (members are invited
  via `/settings/members`).
- Wizard step-by-step state machine. Status badges + inline actions are
  enough for the pilot.

## Acceptance Criteria

1. WHEN a step status is `pending` AND the step has a creator dialog
   THEN the row SHALL render an inline "Add …" button.
2. Clicking the button opens the existing dialog. On success the
   wizard SHALL re-fetch the relevant query (TanStack Query
   `invalidateQueries`).
3. WHEN a step status is `done` THEN the link-out behavior from `063`
   stays the same (the operator clicks the row to manage the resource).
