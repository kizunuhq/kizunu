# Journeys and Engagement Design

**Spec**: `.specs/features/038-journeys-and-engagement/spec.md`

---

## Architecture

```
routes/_app/workspace/journeys.tsx (modified — adds validateSearch + new view)
└── JourneysView (modified)
    ├── PageHeader
    ├── filter chips (mono kicker style)
    └── DataTable
        └── rows with status-dot + mono timestamp

apps/web/src/features/workspace/components/member-row.tsx (modified)
└── extra "Pause journeys" button + toast wiring
```

---

## Components

### `JourneysView` (modified)

- Replace ad-hoc Button-based filter chips with a small `JourneyFilterChips` sub-component using `xs` buttons in `outline`/`default` variant.
- Replace `JourneysTable` direct render with `DataTable` (composed) — columns: Lead, Status, Step, Next touch. Each column uses the new `DataTableColumn` shape; the EmptyState is built into `DataTable`.
- Status cell renders `<StatusDot status={...} /> <span>{status}</span>` via a small inline `StatusDot` helper.

### `journeys.tsx` route

- Add `validateSearch` parsing `?status=<value>` (default to `undefined` for All).
- Thread the status into `JourneysView` along with an `onStatusChange` handler that writes the new value back to the URL.

### `MemberRow` (modified)

- Add a `Pause journeys` button after Activate/Deactivate.
- Mutation: `usePauseOwnerJourneys(workspaceId).mutate(member.userId, { onSuccess: () => toast.success(...), onError: (e) => toast.error(getApiErrorMessage(e)) })`.

### `MembersTable` (modified)

- Pass `workspaceId` down to `MemberRow` (or initialize the pause hook in MembersTable and pass the bound mutate).
- Add a fourth column header (or reuse the existing "Actions" column if any).

---

## Reuse

- `PageHeader`, `EmptyState`, `DataTable` (Part 1)
- `Button` (existing)
- `useLeadJourneys`, `usePauseOwnerJourneys` (existing hooks)
- `sonner` toast + `getApiErrorMessage` (existing)
- `Badge` no longer used on the journeys table; stays on the members table

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Filter chips as small buttons not Tabs | The 5 chips are short labels and we want them inline; tabs would force a heavier layout shift on each change. |
| URL preservation via search param | TanStack Router's `validateSearch` + `useSearch` make this a 3-line addition. |
| Pause-owner button placement | Inline on member row (next to Activate) — minimum extra real estate, max discoverability. |
| Status dot color mapping | Already established in dashboard's `RecentJourneysCard`. Extract into shared if it grows; for now duplicate. |

---

## Tests

All thin → none.
