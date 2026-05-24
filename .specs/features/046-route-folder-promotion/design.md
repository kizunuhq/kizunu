# Design — Route-folder Promotion + No-Naked-Container Index Files

## Architectural decisions (already made)

The structural target is dictated by `apps/web/.agents/rules/web-patterns.md`
§1 (and ADR-007). This feature executes those rules; it does not invent new
ones. Two specific rules govern every move:

1. **Per-feature folder.** Every URL-bearing leaf is `<feature>/index.tsx`,
   with its own `-components/`, `-dialogs/`, `-utils/` siblings as needed.
   Drop the "flat-file feature-routes" carve-out from §1 since after this
   sweep nothing relies on it.
2. **Two-feature graduation.** A component consumed by ≥2 features goes to
   `components/composed/`, never into either consumer's `-components/`. This
   applies to `journey-status-dot.tsx` (consumed by `journeys` route AND
   `dashboard` area component).

## Target file layout

### `routes/_app/settings/`

```
settings/
├── route.tsx                         # unchanged — SettingsLayout wrapper
├── index.tsx                         # NEW — beforeLoad redirect → /settings/profile
├── billing/
│   └── index.tsx                     # was billing.tsx
├── channels/
│   ├── index.tsx                     # was channels.tsx
│   ├── -components/                  # was settings/-components/channels/
│   │   ├── channel-account-form.tsx
│   │   ├── channel-accounts-table.tsx
│   │   ├── credential-fields-input.tsx
│   │   ├── grant-channel-access-form.tsx
│   │   └── __test__/
│   ├── -dialogs/
│   │   ├── create-channel-account-dialog.tsx
│   │   └── grant-channel-access-dialog.tsx
│   └── -utils/
│       ├── has-required-credentials.ts     # was settings/-utils/
│       ├── user-input-fields.ts            # was settings/-utils/
│       └── __test__/
├── connectors/
│   ├── index.tsx                     # was connectors.tsx
│   ├── -components/                  # was settings/-components/connectors/
│   │   ├── connectors-manager.tsx
│   │   ├── entry-triggers-table.tsx
│   │   └── __test__/
│   └── -dialogs/
│       ├── create-connector-account-dialog.tsx
│       ├── create-entry-trigger-dialog.tsx
│       └── delete-entry-trigger-dialog.tsx
├── members/
│   ├── index.tsx                     # was members.tsx
│   ├── -components/                  # was settings/-components/members/
│   │   ├── invite-member-form.tsx
│   │   ├── member-row.tsx
│   │   └── members-table.tsx
│   └── -dialogs/
│       ├── deactivate-member-dialog.tsx
│       ├── invitation-token-dialog.tsx
│       ├── invite-member-dialog.tsx
│       └── pause-owner-journeys-dialog.tsx
├── profile/
│   └── index.tsx                     # was profile.tsx
├── security/
│   ├── index.tsx                     # was security.tsx
│   ├── -components/                  # was settings/-components/security/
│   │   └── sessions-manager.tsx
│   └── -dialogs/
│       ├── revoke-other-sessions-dialog.tsx
│       └── revoke-session-dialog.tsx
└── workspace/
    └── index.tsx                     # was workspace.tsx
```

After this layout:
- `settings/-components/`, `settings/-dialogs/`, `settings/-utils/` are
  **deleted** entirely.
- The settings tree's only flat files at the area level are `route.tsx` and
  `index.tsx`.

### `routes/_app/workspace/`

```
workspace/
├── index.tsx                                  # unchanged — dashboard root
├── -components/dashboard/                     # unchanged — serves index.tsx (one consumer, area root)
│   ├── dashboard-home.tsx
│   ├── first-run-checklist.tsx
│   ├── kpi-grid.tsx
│   └── recent-journeys-card.tsx
├── cadences/
│   ├── index.tsx                              # was cadences.tsx
│   ├── -components/                           # was workspace/-components/cadences/
│   │   ├── cadence-builder.tsx
│   │   ├── cadence-step-row.tsx
│   │   ├── cadence-steps-editor.tsx
│   │   ├── cadence-templates-view.tsx
│   │   ├── cadences-table.tsx
│   │   ├── template-form.tsx
│   │   └── templates-table.tsx
│   ├── -dialogs/                              # was workspace/-dialogs/
│   │   ├── create-cadence-dialog.tsx
│   │   ├── create-template-dialog.tsx
│   │   ├── delete-cadence-dialog.tsx
│   │   └── delete-template-dialog.tsx
│   └── -utils/
│       ├── build-cadence-request.ts           # was workspace/-utils/
│       └── __test__/
├── connect-meta-coex/
│   ├── index.tsx                              # was connect-meta-coex.tsx
│   └── -components/
│       └── connect-meta-coex.tsx              # was workspace/-components/connect-meta-coex.tsx (the inner component)
├── journeys/
│   ├── index.tsx                              # was journeys.tsx
│   └── -components/
│       └── journeys-view.tsx                  # was workspace/-components/journeys-view.tsx
└── my-channels/
    ├── index.tsx                              # was my-channels.tsx
    └── -components/
        └── my-channels-table.tsx              # was workspace/-components/my-channels-table.tsx
```

After this layout:
- `workspace/-dialogs/`, `workspace/-utils/` are **deleted**.
- `workspace/-components/dashboard/` survives (serves `workspace/index.tsx`).
- `workspace/-components/{connect-meta-coex,journeys-view,my-channels-table,journey-status-dot}.tsx` are moved out and the parent is emptied of stray flat files (only `dashboard/` remains).

### `components/composed/` (graduations)

```
components/composed/
├── ...existing files...
└── journey-status-dot.tsx                # graduated from workspace/-components/ (2 consumers)
```

### New index redirects

```
routes/
├── auth/
│   └── index.tsx                         # NEW — beforeLoad → /auth/login
└── _app/
    └── settings/
        └── index.tsx                     # NEW — beforeLoad → /settings/profile
```

## Redirect shape

Both new index files use the same minimal shape — `beforeLoad` throws the
redirect so the layout's `<Outlet />` never renders empty:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/login' })
  },
})
```

No `component:` is declared. TanStack Router will reject if no component is
required (the `throw` short-circuits route resolution before component
rendering).

## Migration sequence

The order matters because TypeScript and `routeTree.gen.ts` must stay
coherent at every commit. Each commit must `tsc --noEmit` and pass
`bun routes:generate`.

The chosen order is **one feature at a time, atomic per feature**, in this
order:

1. **Add `journey-status-dot.tsx` to `components/composed/`** as the first
   commit. Update both consumers (`recent-journeys-card.tsx` +
   `journeys-view.tsx` once it exists at its new path) to import from
   `@kizunu/web/components/composed/journey-status-dot`. Delete the old
   `workspace/-components/journey-status-dot.tsx`. *(Done before promotions
   so consumers can use the new import as they move.)*
2. **Add the two index redirects** (`auth/index.tsx`, `_app/settings/index.tsx`).
   Regenerate `routeTree.gen.ts`. Verify `/auth` and `/settings` redirect.
3. **Promote `settings/` features**, in this order, one commit each (each
   commit moves files, updates the moved file's own imports, updates any
   consumer's imports, regenerates `routeTree.gen.ts`, runs typecheck):
   - `billing` (single file, smallest)
   - `profile` (single file)
   - `workspace` (settings/workspace.tsx → settings/workspace/index.tsx; verify no name collision with `settings/route.tsx`'s nav)
   - `security` (has -components + -dialogs)
   - `connectors` (has -components + -dialogs)
   - `members` (has -components + -dialogs)
   - `channels` (has -components + -dialogs + -utils) — last because it owns the most files
4. **Delete the now-empty `settings/-components/`, `settings/-dialogs/`,
   `settings/-utils/`** as a single commit.
5. **Promote `workspace/` features**, one commit each:
   - `connect-meta-coex` (simplest)
   - `my-channels`
   - `journeys`
   - `cadences` (has -components + -dialogs + -utils) — last, owns the most files
6. **Delete the now-empty `workspace/-dialogs/`, `workspace/-utils/`** as a
   single commit. `workspace/-components/` keeps `dashboard/`.
7. **Update `web-patterns.md`** as the final commit:
   - §1: drop the "flat-file feature-routes" recipe and the §1 "promote
     when -dialogs grows past ~8" advisory. Replace with a single statement
     that per-feature folders are the only layout.
   - Add a new "no naked container routes" section.
   - §10 new-feature checklist step about the route folder — update
     wording to match the new layout (already mostly correct).

## Import-rewrite strategy

Two kinds of imports change with every move:

1. **Self-imports inside the moved file.** A moved file's relative imports
   (e.g. `from './-utils/columns'`) usually still work because the entire
   tree moves together. Where a moved file referenced a sibling that
   stays at the old area level (e.g. a `-utils/` file that has more than
   one feature consumer), the import becomes a longer relative path or
   absolute — prefer absolute (`@kizunu/web/...`) per
   `conventions.md` §4 (no `../../../` imports).
2. **Consumer imports.** Any file outside the moved tree that imports the
   moved file gets its import path rewritten. Most consumers live under
   the same feature's tree (e.g. `members-table.tsx` consumes
   `deactivate-member-dialog`), so consumer paths shorten. The
   cross-feature case (e.g. `journey-status-dot` consumed by both
   journeys and dashboard) is handled by the `components/composed/`
   graduation in step 1.

Mechanical strategy: after each `git mv`, run `bunx tsc --noEmit -p apps/web`
to surface every broken import; fix each one before commit. Then
`cd apps/web && bun routes:generate` to refresh `routeTree.gen.ts`.

## `routeTree.gen.ts` handling

The file is generated by `@tanstack/router-plugin`. After each
move-and-rename of a route file, run `bun routes:generate` from
`apps/web/`. The diff in `routeTree.gen.ts` will show the file path
changes; do not hand-edit. The file is exempt from comment rules per
`comments.md` §6.

## Test strategy

This is a **pure structural refactor** — no behavior change is intended.
Tests for behavior already exist and must continue to pass at every commit
(per the AGENTS.md "DoD" rule: `bun check` green at every commit).

No new tests are authored as part of this feature. Specifically:
- The new `index.tsx` redirects (`auth/index.tsx`, `_app/settings/index.tsx`)
  are **thin** code per `TESTING.md` — pure orchestration that throws a
  TanStack Router `redirect()`. They are covered by manual smoke
  (P1 acceptance criterion) and would be redundant to unit-test (a unit
  test would either mock `redirect` and re-assert the literal it was
  called with, or assert that `beforeLoad` throws — both restate the code).
- Test files (`__test__/` folders) move with their subject code, preserving
  colocation.

If a moved test references a path that no longer exists, the import is
updated to the new path; the test assertions are not changed.

## Risk + rollback

- **Risk: a moved file silently loses an import that wasn't covered by
  `tsc`** (e.g. a string-based import or dynamic require). Mitigation: the
  codebase has no dynamic imports outside the TanStack Router plugin
  (which reads file paths directly). Verified by `grep -rn "require(\|import(" apps/web/src` returning only known-safe cases.
- **Rollback**: each promotion is an atomic commit; revert the offending
  commit, then continue from the previous step.
- **Risk: `routeTree.gen.ts` ends up in a state that mismatches the source
  tree** if a regenerate is skipped. Mitigation: every promotion commit
  regenerates and includes the diff. CI's `bun check` runs from a clean
  checkout, so a stale generated file would fail typecheck.
