# Dashboard Home and Empty States Design

**Spec**: `.specs/features/035-dashboard-and-empty-states/spec.md`
**Status**: Draft

---

## Architecture Overview

```
routes/_app/workspace/index.tsx (replaced)
└── DashboardHome
    ├── PageHeader (title "Overview", kicker "Operations")
    ├── KpiGrid (4 KpiTiles, fed by 4 useLeadJourneys queries with status filter)
    ├── RecentJourneysCard (top 5 from useLeadJourneys with no filter; renders only when journeys exist)
    ├── FirstRunChecklist (5 items reading useCurrentUser, useWorkspaceChannels, useCadences, useTemplates, useWorkspaceConnectors)
    └── EmptyState (only when total journey count = 0)
```

---

## Components

### `DashboardHome`

- **Location**: `apps/web/src/features/dashboard/components/dashboard-home.tsx`
- **Purpose**: Top-level orchestrator; reads `useCurrentUser` for the active workspace and renders the sub-cards.
- **No props**.

### `KpiTile` (composed primitive)

- **Location**: `apps/web/src/components/composed/kpi-tile.tsx`
- **Props**: `{ label: string; value: ReactNode; isPending?: boolean; accent?: 'default' | 'success' | 'warning' | 'danger' }`
- **Renders**: a small card-like block (no real `Card` wrap — flat `border-border` rounded-[2px] container with `p-4`); label on top (mono kicker), value below (text-2xl, font-mono, font-medium) with optional accent dot.

### `KpiGrid`

- **Location**: `apps/web/src/features/dashboard/components/kpi-grid.tsx`
- **Renders**: 4-column grid (`grid-cols-2 md:grid-cols-4`).
- **Data flow**: four `useLeadJourneys(workspaceId, status)` calls, each returns a count. Errors → `—`.

### `RecentJourneysCard`

- **Location**: `apps/web/src/features/dashboard/components/recent-journeys-card.tsx`
- **Renders**: section header + 5-row list of journeys; row uses `lead name · status dot · next-touch timestamp · CaretRight`.
- **Empty handling**: returns `null` (the dashboard's outer empty state covers it).

### `FirstRunChecklist`

- **Location**: `apps/web/src/features/dashboard/components/first-run-checklist.tsx`
- **Renders**: 5 rows; each row is a `ChecklistItem` (label + done indicator + optional "Go" button).
- **Optionally hidden**: when all 5 are done, renders nothing (per AUTH-09 — pick the "hide entirely" branch to reduce clutter for mature workspaces).

### `ChecklistItem`

- **Location**: same dir; sub-component of `FirstRunChecklist`.
- **Props**: `{ label: string; done: boolean; toHref: string }`.

---

## Data Flow

`useLeadJourneys` is the only call we make four times (once per status). React Query caches each `[workspaceId, status]` combination separately, so the dashboard makes 4 GETs on cold load but uses the cache thereafter. The query key already includes `status`.

Counts:
- Running: `useLeadJourneys(wid, 'running')`
- Replied: `useLeadJourneys(wid, 'replied')`
- Exhausted: `useLeadJourneys(wid, 'exhausted')`
- Error: `useLeadJourneys(wid, 'error_state')`

A 5th call (`useLeadJourneys(wid)` with no status) gives the recent-journeys list and the total-count check for the empty state.

---

## Reuse

| Existing | Use |
| -------- | --- |
| `PageHeader` (Part 1) | Page title + kicker |
| `EmptyState` (Part 1) | Empty-workspace state |
| `Skeleton` (Part 1) | Loading state |
| `DataTable` (Part 1) | Not used — recent-journeys card is a simpler list, not a table |
| `useCurrentUser`, `useLeadJourneys`, `useCadences`, `useWorkspaceChannels`, `useWorkspaceConnectors`, `useTemplates` | Counts + booleans |
| Phosphor icons: `Circle`, `CheckCircle`, `CaretRight`, `Lightning`, `Stack`, `Plugs`, `PlugsConnected`, `EnvelopeSimple` | Iconography |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| 4 status queries vs aggregated counts endpoint | 4 separate `useLeadJourneys` calls | The contract returns the full list per status; a count endpoint would be cleaner but isn't built. Adding one is out of scope; 4 cached queries is fine for v0.1 traffic. |
| Recent journeys ordering | Most recent `nextTouchAt` first (DESC) | The journeys contract returns no inherent sort; use what's there and document. The dashboard isn't real-time, so "recent" means "in the list when fetched". |
| Empty checklist when all done | Hide the section entirely | Less visual clutter for mature workspaces; the "Get started" framing only applies to first-run. |
| Recent journeys row → /workspace/journeys (not detail) | Detail surface lands in Part 6 | A row that links to the list filtered by lead would be ideal; for v0.1 we ship the simpler link. |

---

## Tests

All thin presentational over fat hooks → no dedicated tests per TESTING.md. Visual validation in Chrome covers it.

---

## Migration

Single PR; route file replaced; no feature flag.
