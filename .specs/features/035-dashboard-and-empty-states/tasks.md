# Dashboard Home and Empty States Tasks

**Design**: `.specs/features/035-dashboard-and-empty-states/design.md`

---

## Execution Plan

```
T1 (KpiTile composed primitive) ──┐
T2 (KpiGrid) needs T1
T3 (RecentJourneysCard)
T4 (FirstRunChecklist + ChecklistItem)
T5 (DashboardHome composing T2-T4) needs T2, T3, T4
T6 (workspace/index.tsx replacement) needs T5
T7 (bun check)
T8 (Chrome validation)
T9 (PR + CI + squash)
```

---

## Tasks

### T1: KpiTile composed primitive

**Where**: `apps/web/src/components/composed/kpi-tile.tsx`

**Done when**:
- [ ] Props match spec (`label`, `value`, `isPending`, `accent`).
- [ ] Skeleton on `isPending`.
- [ ] Accent dot mapping: success → `--kizunu-green`, warning → `--kizunu-yellow-600`, danger → `--kizunu-pink`.
- [ ] Mono kicker label.
- [ ] `border-border rounded-[2px] p-4` container, no shadow, no nested card.

**Commit**: `feat(web): add KpiTile composed primitive`

---

### T2: KpiGrid

**Where**: `apps/web/src/features/dashboard/components/kpi-grid.tsx`

**Done when**:
- [ ] Calls four `useLeadJourneys` (running, replied, exhausted, error_state).
- [ ] Renders 4 `KpiTile`s in `grid-cols-2 md:grid-cols-4`.
- [ ] Errors render `—`.

**Commit**: `feat(web): add dashboard KpiGrid`

---

### T3: RecentJourneysCard

**Where**: `apps/web/src/features/dashboard/components/recent-journeys-card.tsx`

**Done when**:
- [ ] Reads `useLeadJourneys(wid)` (no status).
- [ ] Empty → returns `null`.
- [ ] Loading → 3 skeleton rows.
- [ ] Loaded → top 5 rows: lead name, status dot, next-touch (mono), CaretRight link to `/workspace/journeys`.

**Commit**: `feat(web): add RecentJourneysCard`

---

### T4: FirstRunChecklist + ChecklistItem

**Where**: `apps/web/src/features/dashboard/components/first-run-checklist.tsx`

**Done when**:
- [ ] Reads `useCurrentUser`, `useWorkspaceChannels`, `useCadences`, `useTemplates`, `useWorkspaceConnectors`.
- [ ] 5 items with done/incomplete flags + route targets.
- [ ] All done → renders `null`.
- [ ] Each incomplete row has a "Go" button.

**Commit**: `feat(web): add FirstRunChecklist`

---

### T5: DashboardHome

**Where**: `apps/web/src/features/dashboard/components/dashboard-home.tsx`

**Done when**:
- [ ] PageHeader on top.
- [ ] KpiGrid below.
- [ ] RecentJourneysCard if journeys exist.
- [ ] Otherwise EmptyState pointing at `/workspace/cadences`.
- [ ] FirstRunChecklist below.

**Commit**: `feat(web): add DashboardHome composer`

---

### T6: Replace stub at `/_app/workspace/`

**Where**: `apps/web/src/routes/_app/workspace/index.tsx`

**Done when**:
- [ ] Renders `<DashboardHome />` instead of the TODO stub.

**Commit**: `feat(web): wire DashboardHome into /_app/workspace/`

---

### T7: bun check

---

### T8: Chrome validation

- [ ] Verify all four KPIs render
- [ ] Verify recent journeys list (or empty state)
- [ ] Verify checklist with at least one row done, one not

---

### T9: PR + CI + squash
