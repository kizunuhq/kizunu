# Web Journeys + My Channels Specification

## Problem Statement

Two read/action workspace views are missing: operators need to see lead journeys
(active/paused/error) and BDRs need to pick their primary channel. Both have APIs
(`useLeadJourneys`, `useMyChannels` + `useSetPrimaryChannel`); this slice builds the
screens.

## Goals

- [ ] Journeys view: table of the workspace's journeys (lead, cadence, status, step,
      next touch) with a status filter.
- [ ] My channels view: the channels the user can access, with a "set primary" action.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Inbox / conversations | No inbound-message storage backend in v0.1 (documented gap) |
| FE unit tests | No web test harness; verified via `bun check` + build |

---

## User Stories

### P1: Journeys view ⭐ MVP
1. WHEN opened THEN the workspace's journeys SHALL list with lead name, cadence, status
   badge, step, and next touch.
2. WHEN a status filter is chosen THEN only journeys with that status SHALL show.

### P1: My channels view ⭐ MVP
1. WHEN opened THEN the user's accessible channels SHALL list with a primary indicator.
2. WHEN "set primary" is clicked THEN that channel SHALL become the user's primary for
   its plugin and the list SHALL reflect it.

**Independent Test (manual/typecheck)**: open both pages; filter journeys; set a primary.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| JNL-01 | P1: journeys list + filter | Tasks | Verified |
| JNL-02 | P1: my channels + set primary | Tasks | Verified |

**Coverage:** 2 total.

## Success Criteria

- [ ] `bun check` green + web build; built from installed shadcn primitives.
</content>
