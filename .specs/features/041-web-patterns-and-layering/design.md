# 041 — Web Patterns and Layering Design

## Context Recap

Spec is in `spec.md`. Four calls are already locked: route-colocation,
mutation-hook shape (`{ domainName: mutate, ... }`), hook-centralized
invalidation with chained caller callbacks, URL state via Zod schema +
`use-<feature>-search` hook. Migration is opportunistic. No `apps/api/` work,
no test bootstrap, no rewriting existing `features/<f>/` or `use-*.ts`.

The deliverables collapse into three artifacts and one composite seed.

## Existing State (audited)

Already in `apps/web/src/components/`:

- `composed/page-header.tsx` — `{ title, description, kicker, actions }`
- `composed/empty-state.tsx` — `{ title, description, icon, action }`
- `composed/data-table.tsx` — `{ columns: { key, header, cell, align? },
  rows, isPending, emptyTitle, emptyDescription, emptyAction, rowKey }`
- `composed/settings-layout.tsx`, `composed/settings-row.tsx`,
  `composed/kbd.tsx`, `composed/kpi-tile.tsx`, `composed/tooltip-on-hover.tsx`
- `primitives/field.tsx` — exports `FieldSet`, `FieldLegend`, `FieldGroup`,
  `Field`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`,
  `FieldSeparator`, `FieldError` (full shadcn base-nova field family).
- `primitives/dialog.tsx`, `primitives/table.tsx`, `primitives/tabs.tsx`,
  `primitives/dropdown-menu.tsx`, `primitives/sonner.tsx` (toast).

**Already-shipped primitives the rule should reference, not duplicate:** all of
`field.tsx`'s exports for the form recipes; `dialog.tsx` as the base for
`ResourceDialog`; `sonner` for toasts.

**Already-shipped composites whose APIs we keep as-is** (no API churn — the
recent 033–039 remake stabilized them):

- `PageHeader` — rule describes the `actions` (plural) slot.
- `EmptyState` — rule describes `{ title, description, icon, action }`.
- `DataTable` — rule describes the current `{ columns, rows, isPending,
  emptyTitle, emptyDescription, emptyAction, rowKey }` shape.

**Gaps to fill** (new files, all under `apps/web/src/components/composed/`):

| Composite | Why | Prop shape |
| --------- | --- | ---------- |
| `resource-dialog.tsx` | Standard dialog chrome (header + scrollable body + footer) so feature-level dialogs (create/edit) drop straight into it | `{ open, onOpenChange, title, description?, formId?, onAction?, actionLabel, isPending?, isActionEnabled?, tone?: 'default' \| 'destructive', children }` |
| `delete-resource-dialog.tsx` | Typed-name confirmation for destructive actions | `{ open, onOpenChange, resourceType, resourceName, onDelete, isDeleting?, errorMessage? }` |
| `form-error.tsx` | Alert-style form-level error (distinct from `FieldError`); used in form pages and create/edit dialogs | `{ children: ReactNode }` |
| `table-pagination.tsx` | Footer pagination block for `DataTable`; consumed via a sibling slot under the table | `{ page, pageSize, totalCount, pageCount, onPageChange, onPageSizeChange? }` |

**DataTable additive props** (additive, non-breaking; needed for the rule to
have a row-click recipe and a pagination slot):

- `onRowClick?: (row: Row) => void` — wires the row to a click handler with
  `cursor-pointer` styling when present.
- `footer?: ReactNode` — slot beneath the table for `TablePagination` or other
  per-page footers. Naming `footer` (not `pagination`) so the slot stays
  generic.

Out of this branch: sort props on `DataTable` (`sortField`, `sortDir`,
`onSortChange`) — defer until a feature actually needs sort. The rule notes
the seam so a follow-up can add it without an ADR change.

## Artifact 1 — ADR-007

`docs/adr/007-web-frontend-layering.md`, Accepted, dated 2026-05-23.

Sections:

1. **Context and Problem Statement** — backend has six ADRs and a clear
   per-module hexagonal layering; the web app shipped 033–039 with no equivalent
   doctrine, so new features reinvent route/feature/component splits and URL
   state.
2. **Decision Drivers** — (a) one prescriptive recipe per feature shape; (b)
   keep TanStack Router idioms (file-based routes, `validateSearch`); (c) reuse
   what 033–039 stabilized; (d) avoid forcing a churn migration on a freshly
   stabilized surface.
3. **Considered Options** — for each call, list A and B with the trade-off:
   - Layering: A = route-colocated under `routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`; B = keep top-level `features/<f>/`.
   - Hook shape: A = `{ domainName: mutate, ... }`; B = raw `{ mutate, ... }`.
   - Invalidation: A = centralized in hook with chained callbacks; B = call-site invalidation.
   - URL state: A = Zod schema on `Route` + `use-<feature>-search` hook; B = ad-hoc inline narrowing per route (current state in `cadences.tsx`).
4. **Decision Outcome** — option A on all four; supersede-only.
5. **Consequences** — positive (consistent recipes, less reinvented chrome,
   typed URL state); negative (mixed layouts during opportunistic migration,
   mixed hook shapes until existing `use-*.ts` are touched); migration policy
   (new code only; existing features convert when next worked on).
6. **References** — `.agents/rules/web-patterns.md`, the reference repo it
   draws from, `react.md` §0/§9, `comments.md`, ADR-001 (vocabulary at the
   layer that owns it).

## Artifact 2 — `.agents/rules/web-patterns.md`

New file, sibling to `react.md`. Sections:

1. **Scope** — applies to `apps/web/`; complements `react.md` (primitives) and
   `comments.md`. Not script-gated; review enforces.
2. **Layering** — route-colocated tree (`routes/_app/<feature>/`,
   `-components/`, `-hooks/`, `-utils/`, `-dialogs/`). Promotion to
   `components/` only when 2+ features share. `features/<f>/` deprecated for
   new work; existing folders converted opportunistically.
3. **Page recipe** — smart page reads data, owns ephemeral state, declares
   side-effects via hook callbacks. Code example: list page composing
   `PageHeader` + `DataTable` + `EmptyState` (reuse existing kizunu shapes).
4. **Form recipe** — smart page + dumb form. Form receives `{ formId,
   defaultValues, isPending, onSubmit, error }` (no callbacks inside the
   form). Code example using `FieldGroup`/`Field`/`FieldLabel`/`FieldError`
   from the existing `primitives/field.tsx`. `FormError` (new composite) above
   the fields for API errors. Submit button outside the form via `form={formId}`.
5. **URL state recipe** — Zod schema next to the route file, registered with
   `validateSearch`. Dedicated `use-<feature>-search` hook reads
   `Route.useSearch()` and exposes typed handlers (`toggleSort`,
   `handlePageChange`, `handlePageSizeChange`, `updateSearch`). Page reset on
   filter/sort change. `navigate({ to: '.', search, replace: true })` to avoid
   history push.
6. **Data table recipe** — current `DataTable` API (no API churn). Use
   `footer={<TablePagination ... />}` and `onRowClick` (both additive). Empty
   state via `emptyTitle`/`emptyDescription`/`emptyAction`. Row actions in the
   last cell via `DropdownMenu`.
7. **Dialog recipe** — `ResourceDialog` as the base. Create/edit dialogs
   compose a `<form id={formId}>` inside and pass `formId` to the dialog so
   the action button submits. `DeleteResourceDialog` for typed-name destructive
   confirmation. Parent owns `open` and `editingItem`/`deletingItem` state.
8. **API client (web side) recipe** — restate the two-layer pattern already
   used: `*.api.ts` is a pure fetch wrapper using `Routes` and contract types;
   `use-*.ts` wraps with TanStack Query.
   - **Mutation hook shape:** `{ <domainName>: mutate, ...rest }` (returned
     from `useMutation`).
   - **Invalidation:** the hook calls `queryClient.invalidateQueries` for keys
     it owns; the caller's `options.onSuccess` is chained.
   - **Transition clause:** existing hooks keep their current shape until next
     touched; mixed shapes are explicitly tolerated.
9. **Error handling table** — query failure on a page → `EmptyState` with
   retry; mutation failure on a form page or create/edit dialog → `FormError`
   inline; mutation failure in an action-only dialog or background action →
   `toast.error(getApiErrorMessage(err))`; uncaught crash → route error
   boundary.
10. **Hard rules and gates** (links to existing rules):
    - English-only identifiers and comments (`code-standards.md` §1).
    - No section-marker / phase-name comments (`comments.md` §4).
    - Component ≤50 lines (`react.md` §9), function ≤30 lines
      (`code-standards.md` §10), ≤3 positional params (§6), no `switch/case`
      (§7).
    - shadcn-first primitives (`react.md` §0); composites built on them.
    - Zod v4 top-level formats (`conventions.md` §1) — enforced by gate.
11. **Checklist for a new feature** — adapted from the reference, with kizunu
    paths: route file in `routes/_app/<feature>/`, contracts in
    `@kizunu/api-contracts/src/<bc>/<feature>.contract.ts`, api functions in
    `@kizunu/api-client/src/<bc>/<feature>.api.ts`, hooks in
    `@kizunu/api-client/src/<bc>/use-*.ts`, query keys in
    `query-keys.ts`, URL search hook in `-hooks/use-<feature>-search.ts`,
    nav in the relevant `app-shell` data source.

## Artifact 3 — Doc rewrites

- `.specs/codebase/STRUCTURE.md` — replace the four-line web section with a
  paragraph describing the route-colocated tree and `components/` promotion
  rule; mark `features/` as legacy with an opportunistic migration policy;
  link to `web-patterns.md` and ADR-007.
- `docs/web-structure.md` — same content in narrative form (it's the
  human-readable companion to STRUCTURE.md, per ARCHITECTURE.md's mention).
  Replace its current content with the new tree, the route sigils (`-`, `(group)`,
  `_layout`, `$param`) glossary, and the where-things-live table.
- `AGENTS.md` — single bullet edit under "Conventions and rules": add
  `web-patterns.md` to the list of rule files with a one-sentence
  description. (Allowed under AGENTS.md's "never edit unless asked" clause —
  the user explicitly asked for this layering work.)

## Artifact 4 — Composite seeds

Four new files under `apps/web/src/components/composed/`:

- `form-error.tsx` — minimal alert-styled wrapper (destructive border, alert
  role). ≤25 lines.
- `table-pagination.tsx` — page count, page selector, per-page-size selector
  (optional). Built on `Button` + `Select` primitives. ≤50 lines.
- `resource-dialog.tsx` — composes `Dialog`, `DialogHeader`, `DialogTitle`,
  `DialogDescription`, `DialogFooter`, content area; switches the action
  button between `type='submit' form={formId}` and `type='button' onClick`.
  ≤50 lines.
- `delete-resource-dialog.tsx` — composes `ResourceDialog` with a confirmation
  `Input` that enables the destructive button only when the typed value
  matches `resourceName`. Resets confirmation on close. ≤50 lines.

Plus one additive edit to the existing `composed/data-table.tsx`:

- Add optional `onRowClick?: (row: Row) => void` and `footer?: ReactNode`
  props. Apply `cursor-pointer` + click handler on `TableRow` when
  `onRowClick` is provided. Render `footer` after the `Table` when provided.
  No behavior change when both are absent.

## Risks and Mitigations

- **Risk:** Adding `onRowClick`/`footer` to `DataTable` regresses a
  just-shipped screen. **Mitigation:** both props default to undefined;
  existing call sites pass neither.
- **Risk:** The rule grows too long and is skimmed instead of read.
  **Mitigation:** sections 3–7 use small code blocks (one recipe per section)
  rather than full pages; section 10 links to existing rules instead of
  restating them; the checklist (§11) is the at-a-glance summary.
- **Risk:** A future contributor reads ADR-007 + rule but ignores the
  transition clause and starts a sweep migration. **Mitigation:** the
  transition clause appears in *both* the rule (§8) and ADR-007 (Consequences
  + Decision Outcome), not as an afterthought.
- **Risk:** AGENTS.md edit causes friction with the "never edit unless asked"
  norm. **Mitigation:** the user explicitly asked for this layering work;
  edit is minimal (one bullet); spec called it out under Edge Cases.

## Requirement Traceability Updates

All twelve WEB-NN move from Pending → In Design. Tasks phase will map each to
one or more atomic tasks.
