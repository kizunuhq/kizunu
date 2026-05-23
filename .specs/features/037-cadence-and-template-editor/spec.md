# Cadence and Template Editor Specification

## Problem Statement

`/workspace/cadences` today renders a 2×2 grid of `TemplateForm /
TemplatesTable / CadenceBuilder / CadencesTable` cards. The grid puts the
"New" forms side-by-side with their lists, makes every section equal weight,
and gives the page no clear hierarchy. There's no empty state when the
workspace has no cadences yet, no `PageHeader`, no clear separation between
cadences and templates as concepts.

## Goals

- [ ] Replace the 2×2 grid with a tab-based layout — "Cadences" and
      "Templates" — so each concept gets its own focused view.
- [ ] Within each tab: the list dominates (top), the "New" form sits
      below it (collapsed by default? or a "New" button revealing the form).
- [ ] Empty states when either list is empty, pointing the user at the
      "New" form below.
- [ ] `PageHeader` on top with an Operations kicker.
- [ ] No structural changes to the form components or builder steps —
      they stay as-is.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Master-detail layout (cadence list left, builder right) | Heavier refactor; the existing builder is form-driven, not a separate editor surface. Defer to a future part. |
| Drag-to-reorder steps in the builder | Existing builder uses an ordered array editor; drag UX needs a library + per-row handles. Defer. |
| Inline step editing within the cadence list | Same. |
| Hook-action picker UI improvements | Action picker exists today; redesign deferred. |
| `CadenceValidator` inline error surfacing | The mutation already returns 422s with messages; current surfacing is adequate for v0.1. |

---

## User Stories

### P1: Cadences and templates each get a focused tab ⭐ MVP

**Acceptance Criteria**:
1. WHEN the user lands on `/workspace/cadences` THEN the page SHALL render a `PageHeader` ("Cadences", kicker "Operations") and a Tabs primitive with two tabs: Cadences (default) and Templates.
2. WHEN the Cadences tab is active THEN the page SHALL render: the cadences list at the top; a collapsed "New cadence" form below; an `EmptyState` if the list is empty pointing the user at the form.
3. WHEN the Templates tab is active THEN the page SHALL render: the templates list at the top; a collapsed "New template" form below; an `EmptyState` if the list is empty.
4. WHEN the user clicks the "New" form to expand it THEN the form SHALL slide in via a collapsible (or simply renders open by default if the list is empty).
5. WHEN switching tabs THEN the URL SHALL update with a search param (e.g. `?tab=templates`) so deep links preserve the active tab.

---

### P2: Lists get cleaner chrome

**Acceptance Criteria**:
1. WHEN the cadences/templates list renders THEN it SHALL use the existing `Table` primitive but with mono uppercase column headers per DESIGN.md (matching the `DataTable` composed style).
2. WHEN a list is loading THEN it SHALL render 3 skeleton rows (existing tables currently show "Loading…").

---

## Edge Cases

- WHEN `?tab=` is an unknown value THEN the page SHALL default to the Cadences tab.
- WHEN both lists are empty THEN both tabs SHALL still be reachable; each tab shows its own empty state.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAD-01 | P1: Tabs layout | Design | Pending |
| CAD-02 | P1: Cadences tab content | Design | Pending |
| CAD-03 | P1: Templates tab content | Design | Pending |
| CAD-04 | P1: Empty states | Design | Pending |
| CAD-05 | P1: URL preservation via search param | Design | Pending |
| CAD-06 | P2: Mono uppercase headers | Design | Pending |
| CAD-07 | P2: Skeleton rows during loading | Design | Pending |

---

## Success Criteria

- [ ] `/workspace/cadences` renders Tabs with two tabs.
- [ ] Each tab has list + "New" form + empty state.
- [ ] `?tab=` deep links work.
- [ ] `bun check` green.
