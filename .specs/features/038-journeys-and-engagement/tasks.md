# Journeys and Engagement Tasks

T1: Extract a shared `journey-status-dot.tsx` helper (reused by recent-journeys-card + new journeys table). Keep both consumers updated.
T2: Refactor `JourneysView` — PageHeader, filter chips, DataTable + status dot + mono timestamp + EmptyState.
T3: Update `journeys.tsx` route — `validateSearch` for `?status=` + thread through.
T4: Update members table + row — `Pause journeys` button + toast wiring via `usePauseOwnerJourneys`.
T5: bun check.
T6: PR + CI + squash.

All thin → no tests.
