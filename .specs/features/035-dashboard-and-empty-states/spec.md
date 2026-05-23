# Dashboard Home and Empty States Specification

## Problem Statement

`/_app/workspace/` today renders the single line `TODO: workspace overview`.
The first screen every signed-in user sees is a stub. With the cadence engine,
channels, connectors, and journeys all live, the dashboard is the natural
landing for "what's running right now". This part turns the stub into a real
overview screen.

## Goals

- [ ] Replace the stub at `apps/web/src/routes/_app/workspace/index.tsx` with
      a real dashboard home showing four KPIs (active journeys, replied,
      exhausted, error), the most recent journeys (top 5), and a first-run
      checklist that points new operators at the setup steps they haven't
      completed yet.
- [ ] Ship a small `KpiTile` composed primitive so later parts can reuse it
      on settings/journey-detail screens.
- [ ] The screen renders cleanly when the workspace is empty (no journeys
      yet) — `EmptyState` is the placeholder.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| ASCII aurora `Background` component | Still deferred; the dashboard uses static treatments per DESIGN.md tokens. |
| Realtime/WebSocket updates | TanStack Query refetch on focus is enough; sockets land later if needed. |
| Per-channel breakdown / channel health | Belongs in a future "channels" detail surface. |
| Charts or sparklines | No charting library yet; counts are enough for v0.1. |
| "Activity feed" with all event types | Out of scope; the recent-journeys card is the only feed. |
| Quick action buttons (create cadence, invite member) modals | The first-run checklist links to the destination pages; no inline modals here. |
| Date-range filters ("today", "this week") | Counts are point-in-time; date filtering ships when the journey list grows that complexity. |

---

## User Stories

### P1: Dashboard home shows what's running ⭐ MVP

**User Story**: As a signed-in operator landing on `/workspace`, I want to
see at a glance how many journeys are running, how many replied, how many
exhausted, and how many errored — without clicking into the Journeys page.

**Acceptance Criteria**:

1. WHEN the user lands on `/_app/workspace/` THEN the page SHALL render
   four KPI tiles in a 4-column grid (collapsing to 2-column on smaller
   screens), one each for: Running, Replied, Exhausted, Error.
2. WHEN the workspace has zero journeys overall THEN the KPI grid SHALL
   still render (all tiles show 0) and a single `EmptyState` SHALL render
   below explaining the workspace has no journeys yet, with a link to
   `/workspace/cadences` to create the first cadence.
3. WHEN data is loading THEN each tile SHALL show a `Skeleton` matching
   the tile's height.
4. WHEN any journey query errors THEN the tile SHALL render a `—`
   placeholder (no toast — dashboard is read-only).
5. WHEN counts render THEN they SHALL use `font-mono` per DESIGN.md.

**Independent Test**: Visit `/workspace`, verify four KPI tiles render with
counts and labels.

---

### P1: Recent journeys card ⭐ MVP

**User Story**: As an operator who just had a cadence run, I want to see
the most recent journeys (top 5) from the dashboard so I can jump in
without filtering the full list.

**Acceptance Criteria**:

1. WHEN the user lands on `/workspace` AND the workspace has ≥1 journey
   THEN the page SHALL render a "Recent journeys" card listing the top 5
   most recent journeys, each row showing lead name, status, next-touch
   timestamp (mono, ISO-ish).
2. WHEN the workspace has 0 journeys THEN this card SHALL NOT render
   (the empty state below the KPIs covers it).
3. WHEN data is loading THEN three skeleton rows SHALL render.
4. WHEN the user clicks a row THEN the link SHALL navigate to
   `/workspace/journeys` (per-journey detail is Part 6).

**Independent Test**: After seeding journeys, verify the card lists 5,
each row's link navigates to the journeys list.

---

### P1: First-run checklist ⭐ MVP

**User Story**: As a new operator who just registered, I want a checklist
that walks me through verifying email, connecting a channel, creating a
template, creating a cadence, and connecting a CRM — so I don't have to
guess what to do first.

**Acceptance Criteria**:

1. WHEN the dashboard renders THEN it SHALL render a "Get started"
   checklist card below the recent-journeys card with these items:
   - Verify your email (done when `user.emailVerifiedAt` is set)
   - Connect a channel (done when `useWorkspaceChannels` returns ≥1)
   - Create a template (done when `useTemplates` returns ≥1)
   - Create a cadence (done when `useCadences` returns ≥1)
   - Connect a CRM (done when `useWorkspaceConnectors` returns ≥1)
2. WHEN every item is complete THEN the checklist SHALL still render but
   with a single "All set" line and no action buttons (or hide entirely
   — pick one: hide entirely for less visual clutter when the workspace
   is mature).
3. WHEN an item is incomplete THEN it SHALL render with a phosphor
   `Circle` icon (`text-muted-foreground`) and a "Go" button linking to
   the right route.
4. WHEN an item is complete THEN it SHALL render with a phosphor
   `CheckCircle` icon (`text-kizunu-green` — sanctioned use of the green
   accent as a "status indicator dot" per DESIGN.md §1.4) and no action.

**Independent Test**: Sign in as a fresh user (no channels/cadences/etc.),
confirm all five items render uncompleted; complete one (e.g., create a
cadence), refresh, confirm the row's icon flips.

---

### P2: KpiTile composed primitive

**User Story**: As a developer building later screens (settings, journey
detail), I want a reusable `KpiTile` so I don't redo the "label + count +
optional accent" layout every time.

**Acceptance Criteria**:

1. WHEN `KpiTile` is imported THEN it SHALL accept props
   `label: string`, `value: ReactNode`, `isPending?: boolean`,
   `accent?: 'default' | 'success' | 'warning' | 'danger'`.
2. WHEN `isPending` is true THEN the value SHALL render as a `Skeleton`.
3. WHEN `accent === 'default'` THEN the value SHALL render in
   `text-foreground`.
4. WHEN `accent` is non-default THEN the value SHALL render with a small
   status dot (`text-kizunu-green` for success, `text-kizunu-yellow-600`
   for warning, `text-kizunu-pink` for danger) plus the foreground value.
5. WHEN the label renders THEN it SHALL use the mono kicker style
   (`font-mono text-xs uppercase tracking-wide text-muted-foreground`).

**Independent Test**: Render four `KpiTile`s in a sandbox, one per accent,
confirm dot color, label style, value typography.

---

## Edge Cases

- WHEN `useCurrentUser` returns `activeWorkspaceId === null` THEN the
  dashboard SHALL render the KPI grid with all `—` placeholders and a
  single message explaining the user has no active workspace.
- WHEN the journey queries return non-200 errors THEN the corresponding
  tile SHALL render `—` and the page does not crash.
- WHEN the workspace has many journeys but none match a status filter
  THEN that tile shows 0 (not `—`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DASH-01 | P1: 4-KPI grid | Design | Pending |
| DASH-02 | P1: Empty-workspace state | Design | Pending |
| DASH-03 | P1: Skeleton on load | Design | Pending |
| DASH-04 | P1: Error tolerance | Design | Pending |
| DASH-05 | P1: Mono count formatting | Design | Pending |
| DASH-06 | P1: Recent journeys card | Design | Pending |
| DASH-07 | P1: Recent journeys link out | Design | Pending |
| DASH-08 | P1: First-run checklist 5 items | Design | Pending |
| DASH-09 | P1: All-set state | Design | Pending |
| DASH-10 | P1: Incomplete item button | Design | Pending |
| DASH-11 | P1: Complete item icon | Design | Pending |
| DASH-12 | P2: KpiTile primitive shape | Design | Pending |

**Coverage:** 12 total, all map to tasks.

---

## Success Criteria

- [ ] `/_app/workspace/` renders the new dashboard, no more `TODO`.
- [ ] All four KPIs render with skeletons → counts on data load.
- [ ] First-run checklist reflects real workspace state.
- [ ] `bun check` is green.
- [ ] Chrome validation across a populated + an empty workspace.
- [ ] PR merged.
