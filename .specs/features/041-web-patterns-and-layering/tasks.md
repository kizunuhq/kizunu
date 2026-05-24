# 041 — Web Patterns and Layering Tasks

Atomic tasks. Each has a single commit. Status starts Pending; moves to
In Progress when picked, Done when its gate passes.

## Conventions

- One commit per task; conventional commits; subject describes outcome.
- Gate per task: `bun check` must remain green after the task lands.
- Composite tasks (T-04..T-08) keep components ≤50 lines and functions ≤30
  lines (`react.md` §9, `code-standards.md` §10). No PT strings, no
  section-marker comments.
- Tasks T-01..T-03 are pure documentation; their gate is `bun check` (it runs
  format/lint over markdown via `vp` config) plus a manual read-through.

## Task list

### T-01 — Write ADR-007 + index update

**Maps to:** WEB-04, WEB-05, WEB-06, WEB-12.
**What:** Create `docs/adr/007-web-frontend-layering.md` per design §"Artifact 1".
Update `docs/adr/README.md` to add the row (Accepted).
**Where:** `docs/adr/007-web-frontend-layering.md`, `docs/adr/README.md`.
**Done when:** ADR exists with all six sections; index lists it as Accepted;
the transition clause is in *Decision Outcome* + *Consequences*.
**Gate:** `bun check`.

### T-02 — Write `.agents/rules/web-patterns.md`

**Maps to:** WEB-01, WEB-02, WEB-11.
**What:** New rule file per design §"Artifact 2" with sections 1–11. Cross-link
to ADR-007, `react.md`, `comments.md`, `code-standards.md`, `conventions.md`.
**Where:** `.agents/rules/web-patterns.md`.
**Done when:** All eleven sections present; code examples use English-only
identifiers, no PT strings, no section-marker comments; references to existing
composites use the actual current props (`PageHeader.actions`,
`DataTable.{columns,rows,rowKey,emptyTitle,...,onRowClick?,footer?}`).
**Gate:** `bun check`.

### T-03 — Add `FormError` composite

**Maps to:** WEB-08, WEB-09, WEB-10.
**What:** New `apps/web/src/components/composed/form-error.tsx`. Alert-styled
wrapper with `role="alert"`, destructive border/background, ≤25 lines.
Single prop: `{ children: ReactNode }`.
**Where:** `apps/web/src/components/composed/form-error.tsx`.
**Done when:** Importable as `@kizunu/web/components/composed/form-error`;
renders children in an alert region with the design-system destructive tone.
**Gate:** `bun check`.

### T-04 — Add `TablePagination` composite

**Maps to:** WEB-08, WEB-09, WEB-10.
**What:** New `apps/web/src/components/composed/table-pagination.tsx`.
Props per design: `{ page, pageSize, totalCount, pageCount, onPageChange,
onPageSizeChange? }`. Renders page X of Y, prev/next buttons (disabled at
boundaries), optional page-size select. ≤50 lines.
**Where:** `apps/web/src/components/composed/table-pagination.tsx`.
**Done when:** Importable; clicking prev/next calls `onPageChange` with the
next page; boundary buttons are disabled; renders nothing when `pageCount <= 1`
and no `onPageSizeChange` is provided.
**Gate:** `bun check`.

### T-05 — Add `ResourceDialog` composite

**Maps to:** WEB-08, WEB-09, WEB-10.
**What:** New `apps/web/src/components/composed/resource-dialog.tsx`. Props
per design: `{ open, onOpenChange, title, description?, formId?, onAction?,
actionLabel, isPending?, isActionEnabled?, tone?: 'default' | 'destructive',
children }`. Composes the primitive `Dialog`. When `formId` is set, action
button is `type='submit' form={formId}`; otherwise `type='button' onClick`.
Cancel button always renders. ≤50 lines.
**Where:** `apps/web/src/components/composed/resource-dialog.tsx`.
**Done when:** Importable; smoke-renders with both `formId` and `onAction`
modes; the action button is disabled when `isPending` or `isActionEnabled === false`.
**Gate:** `bun check`.

### T-06 — Add `DeleteResourceDialog` composite

**Maps to:** WEB-08, WEB-09, WEB-10.
**What:** New `apps/web/src/components/composed/delete-resource-dialog.tsx`.
Props per design: `{ open, onOpenChange, resourceType, resourceName, onDelete,
isDeleting?, errorMessage? }`. Composes `ResourceDialog` with `tone='destructive'`;
internal `useState` for the typed confirmation; resets via `useEffect` on close;
destructive button enabled only when typed value equals `resourceName`
(case-insensitive). ≤50 lines.
**Where:** `apps/web/src/components/composed/delete-resource-dialog.tsx`.
**Done when:** Importable; typing the resource name enables the destructive
button; closing the dialog clears the confirmation input on next open.
**Gate:** `bun check`.

### T-07 — Extend `DataTable` with `onRowClick` and `footer`

**Maps to:** WEB-08, WEB-10.
**What:** Additive edit to existing
`apps/web/src/components/composed/data-table.tsx`:
- Add optional `onRowClick?: (row: Row) => void` and `footer?: ReactNode` to
  `DataTableProps`.
- Forward `onRowClick` to `DataTableRow`; when present, set `onClick` and
  `className="cursor-pointer hover:bg-muted/50"` on `TableRow`.
- When `footer` is provided, render it after `Table` inside the same wrapper
  (wrap both in a `<div className="space-y-4">` only when `footer` is set, to
  preserve current layout when not set).
**Where:** `apps/web/src/components/composed/data-table.tsx`.
**Done when:** Existing call sites compile and render identically (both props
default to undefined); a new caller passing `onRowClick` sees clickable rows;
a new caller passing `footer={<TablePagination ... />}` sees the pagination
beneath the table.
**Gate:** `bun check`.

### T-08 — Rewrite `STRUCTURE.md` web section + `docs/web-structure.md` + `AGENTS.md` bullet

**Maps to:** WEB-03.
**What:**
- `.specs/codebase/STRUCTURE.md`: replace the existing web bullet with a
  paragraph describing the route-colocated tree, the `components/` promotion
  rule, and `features/` as legacy/deprecated for new work; reference
  `.agents/rules/web-patterns.md` and ADR-007.
- `docs/web-structure.md`: full rewrite per design §"Artifact 3". Route
  sigils glossary, the new tree, where-things-live table for a web feature.
- `AGENTS.md`: under "Conventions and rules" list, add a bullet for
  `web-patterns.md` matching the style of the existing bullets. No other
  edits.
**Where:** `.specs/codebase/STRUCTURE.md`, `docs/web-structure.md`,
`AGENTS.md`.
**Done when:** All three files describe the route-colocated tree consistently
and link to `.agents/rules/web-patterns.md` + ADR-007.
**Gate:** `bun check`.

## Dependencies

- T-02 should land *after* T-01 (the rule references ADR-007).
- T-07 should land *after* T-04 (the rule example in T-02 references the
  `footer` slot, which T-07 introduces; alternative: land them in any order
  and verify the rule's example references `footer` only as documented).
- T-06 must land *after* T-05 (`DeleteResourceDialog` composes `ResourceDialog`).
- T-08 is independent but cleanest as the last commit so it references the
  newly-landed ADR and rule.

Recommended order: T-03, T-04, T-05, T-06, T-07, T-01, T-02, T-08.

## Coverage

| Requirement | Tasks |
| ----------- | ----- |
| WEB-01 | T-02 |
| WEB-02 | T-02 |
| WEB-03 | T-08 |
| WEB-04 | T-01 |
| WEB-05 | T-01 |
| WEB-06 | T-01 |
| WEB-07 | (implicit — all composite tasks reuse existing where present) |
| WEB-08 | T-03, T-04, T-05, T-06, T-07 |
| WEB-09 | T-03, T-04, T-05, T-06 |
| WEB-10 | every task (gate is `bun check`) |
| WEB-11 | T-02 |
| WEB-12 | T-01 |

12 of 12 requirements mapped (WEB-07 is satisfied by the policy of reusing
existing composites — no task creates a duplicate).
