# Journeys and Engagement Specification

## Problem Statement

`/workspace/journeys` today shows status filter buttons + a bespoke table
with no `PageHeader`, no empty state, no skeleton loading, and the status
column is a colored `Badge` rather than the status-dot pattern the rest of
the new UI uses. The "Pause owner" admin action — wired in the api-client
since feature 019 — has no UI; same with "Reassign leads." This part lights
up the most-used journey view + ships a discrete "Pause this owner's
journeys" action on the members surface.

## Goals

- [ ] `/workspace/journeys` becomes a polished list view: `PageHeader`
      (kicker "Operations"), mono filter chips, `DataTable` with status
      dot + label, skeleton loading, empty state.
- [ ] Add a "Pause journeys" action on each member row in the members
      table (uses `usePauseOwnerJourneys`).
- [ ] Filter state lives in the URL (`?status=running` etc.) so deep
      links preserve the active filter.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| `/journeys/$id` detail page | Backend has no journey-detail endpoint yet; needs a new contract. |
| Reassign UI | Needs a source-owner + target-owner picker UI; bigger flow. Defer. |
| Search by lead name | Requires backend search support. Defer. |
| Realtime / sockets | TanStack Query refetch on focus is enough for v0.1. |
| Bulk-select for actions | Per-action endpoints are owner-scoped, not journey-scoped — bulk pause-owner is already what the existing endpoint does. |

---

## User Stories

### P1: Journeys list reads cleanly ⭐ MVP

**Acceptance Criteria**:
1. WHEN the user lands on `/workspace/journeys` THEN the page SHALL render a `PageHeader` ("Journeys", kicker "Operations") and a row of filter chips below (All / Running / Replied / Exhausted / Error).
2. WHEN the active filter changes THEN the URL SHALL update with `?status=<value>` (or no param for All); deep links preserve the filter.
3. WHEN the list is loading THEN it SHALL render 3 skeleton rows via the `DataTable` composed primitive.
4. WHEN the list is empty under the active filter THEN it SHALL render an `EmptyState` matching the filter ("No running journeys" / "No replied journeys" / etc.).
5. WHEN a journey row renders THEN the status SHALL render as a colored dot + plain label (no `Badge` background tint), matching the dashboard pattern.
6. WHEN the timestamp renders THEN it SHALL be mono.

---

### P1: Pause this owner's journeys ⭐ MVP

**Acceptance Criteria**:
1. WHEN the user views the members table on `/settings/members` THEN each row SHALL include a "Pause journeys" action button (alongside the existing Activate/Deactivate).
2. WHEN the user clicks "Pause journeys" THEN the page SHALL call `usePauseOwnerJourneys.mutate(member.userId)` and show a toast on success/error.
3. WHEN the mutation is pending THEN the button SHALL show "Pausing…" and be disabled.

---

## Edge Cases

- WHEN `?status=` is an unknown value THEN the page SHALL default to All.
- WHEN the user has no active workspace THEN the existing "No active workspace selected." placeholder SHALL render (unchanged).

---

## Requirement Traceability

| ID | Story | Status |
| -- | ----- | ------ |
| JOUR-01 | P1: PageHeader + filter chips | Pending |
| JOUR-02 | P1: URL-preserving filter | Pending |
| JOUR-03 | P1: Skeleton rows on load | Pending |
| JOUR-04 | P1: EmptyState per filter | Pending |
| JOUR-05 | P1: Status dot, no background | Pending |
| JOUR-06 | P1: Mono timestamp | Pending |
| JOUR-07 | P1: Pause-owner button on members row | Pending |
| JOUR-08 | P1: Pause toast feedback | Pending |

---

## Success Criteria

- [ ] Journeys page polished per spec.
- [ ] Pause-owner action present + functional on members table.
- [ ] `bun check` is green.
