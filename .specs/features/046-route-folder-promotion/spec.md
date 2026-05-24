# Route-folder Promotion + No-Naked-Container Index Files

## Problem Statement

`apps/web/src/routes/_app/{settings,workspace}/` use **shared area folders**
(`-components/`, `-dialogs/`, `-utils/`) for flat sibling sub-routes
(`channels.tsx`, `cadences.tsx`, ...). Two problems result:

1. **The shared `-dialogs/` folder has grown past the threshold the doctrine
   sets.** `web-patterns.md` §1 says: *"When an area's `-dialogs/` folder
   grows past ~8 files or starts mixing concerns, **promote the feature-route
   to a folder** ... Don't split the difference — either every feature in the
   area has its own folder or they all share the area's `-`-folders."*
   Today `settings/-dialogs/` has 11 files mixing channels, connectors,
   members, security concerns; `workspace/-components/` already split the
   difference (`cadences/` + `dashboard/` subfolders next to flat siblings
   `journeys-view.tsx`, `my-channels-table.tsx`, `connect-meta-coex.tsx`,
   `journey-status-dot.tsx`).

2. **Two container routes have no `index.tsx`,** so navigating to the bare
   URL lands users on a half-rendered layout shell:
   - `/auth` → `auth/route.tsx` renders the branding panel + form column,
     but the `<Outlet />` is empty.
   - `/settings` → `_app/settings/route.tsx` renders the settings sidebar,
     but the content area is empty.
   Both routes own children but never declared what `/auth` or `/settings`
   alone should do.

The fix is a pure structural refactor: promote every flat sub-route in
`/_app/settings/` and `/_app/workspace/` into its own folder
(`<feature>/index.tsx` + colocated `-components/`, `-dialogs/`, `-utils/`),
add the two missing `index.tsx` redirect files, and codify the rules so
neither pattern can drift back.

## Goals

- [ ] Every URL-bearing folder under `apps/web/src/routes/` either renders
      a page or redirects — never lands on a blank `<Outlet />`.
- [ ] No flat sub-route under `_app/settings/` or `_app/workspace/`; every
      feature owns its own folder with its own `-components/`/`-dialogs/`/`-utils/`.
- [ ] `web-patterns.md` §1 drops the "flat-file feature-routes" carve-out
      and gains a "no naked container routes" rule.
- [ ] `bun check` stays green; no behavior change in any existing test.

## Out of Scope

| Excluded | Reason |
| --- | --- |
| `/auth/accept-invite.$token.tsx` rename to folder | It's a parameter route, not a flat sub-route; the `$token` segment IS the folder. No promotion needed. |
| Renaming feature folders (e.g. `cadences` → `cadence`) | Out of scope; only structural moves. |
| `routes/-marketing/` | Already `-`-prefixed non-route folder; not a URL. |
| `_app/route.tsx` / `__root.tsx` | Pathless layouts (`_` / `__`); no naked URL. |
| Permission-guard `beforeLoad` (the jornada-ser pattern) | Separate concern; no roles in kizunu yet. |
| `apps/web/src/_shell/` reorganization | Separate decision; the comparison surfaced it but it's not part of this feature. |

---

## User Stories

### P1: Every URL responds meaningfully ⭐ MVP

**User Story**: As a user (or a bookmark, or a deep link from a marketing
email), I want every URL in the app to either render the intended page or
redirect me to a sensible default — never show me a blank layout shell.

**Why P1**: Two visible URLs today (`/auth`, `/settings`) leave users
staring at an empty content area. Both are reachable from typed URLs or
stale bookmarks.

**Acceptance Criteria**:

1. WHEN a user navigates to `/auth` THEN the system SHALL redirect to
   `/auth/login` (no flash of empty layout — handled in `beforeLoad`).
2. WHEN a user navigates to `/settings` THEN the system SHALL redirect to
   `/settings/profile` (no flash of empty layout — handled in `beforeLoad`).
3. WHEN the `auth/route.tsx` layout renders THEN children at `/auth/login`,
   `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`,
   `/auth/verify-email`, `/auth/accept-invite/$token` SHALL continue to
   render unchanged.
4. WHEN the `settings/route.tsx` layout renders THEN children at every
   `/settings/<feature>` SHALL continue to render unchanged.

**Independent Test**: Navigate to `/auth` and `/settings` in the dev
server — both land on the documented default page within one redirect, no
empty layout flash.

---

### P1: Every settings sub-route is its own folder ⭐ MVP

**User Story**: As a contributor opening any settings feature, I want one
folder (`settings/<feature>/`) to hold the route, its components, its
dialogs, and its utils — so the surface area of "what changing this
feature touches" is one directory tree.

**Why P1**: `settings/-dialogs/` is at 11 files mixing four features;
`settings/-components/` already half-promoted into per-feature subfolders.
The drift is documented in web-patterns.md §1 as "split the difference"
— explicitly forbidden.

**Acceptance Criteria**:

1. WHEN a developer lists `routes/_app/settings/` THEN they SHALL see only
   `route.tsx`, `index.tsx`, and per-feature folders (`billing/`,
   `channels/`, `connectors/`, `members/`, `profile/`, `security/`,
   `workspace/`) — no flat `*.tsx` sub-route files, no area-level
   `-components/`, `-dialogs/`, or `-utils/`.
2. WHEN a developer opens `settings/<feature>/` THEN they SHALL find
   `index.tsx` plus the feature's own `-components/`, `-dialogs/`,
   `-utils/` (whichever the feature uses).
3. WHEN the dev server boots THEN every existing `/settings/*` URL
   (profile, workspace, members, channels, connectors, security, billing)
   SHALL render exactly the same content as today.

**Independent Test**: All existing `apps/web/__test__/` tests for
settings features pass after the move; manual smoke through each
`/settings/*` page in the dev server shows no regression.

---

### P1: Every workspace sub-route is its own folder ⭐ MVP

**User Story**: Same as the settings story, applied to `routes/_app/workspace/`.

**Why P1**: `workspace/-components/` is the worst "split the difference"
case in the codebase — two per-feature subfolders next to four flat
sibling files.

**Acceptance Criteria**:

1. WHEN a developer lists `routes/_app/workspace/` THEN they SHALL see
   only `index.tsx` (the dashboard) and per-feature folders (`cadences/`,
   `connect-meta-coex/`, `journeys/`, `my-channels/`) — no flat `*.tsx`
   sub-route files, no area-level `-dialogs/` or `-utils/`.
2. WHEN a developer opens `workspace/<feature>/` THEN they SHALL find
   `index.tsx` plus the feature's own `-components/`, `-dialogs/`,
   `-utils/` (whichever the feature uses).
3. WHEN `workspace/-components/dashboard/` is consumed THEN it SHALL
   remain at the area level (it serves `workspace/index.tsx` directly,
   which is the area root — one feature, one consumer).
4. WHEN `journey-status-dot.tsx` is imported by both
   `workspace/journeys/-components/journeys-view.tsx` and
   `workspace/-components/dashboard/recent-journeys-card.tsx` THEN it
   SHALL live in `components/composed/` (the two-feature graduation rule
   from web-patterns.md §1).

**Independent Test**: All existing tests pass; manual smoke through
`/workspace`, `/workspace/cadences`, `/workspace/journeys`,
`/workspace/my-channels`, `/workspace/connect-meta-coex` shows no
regression.

---

### P1: The rule that prevents regression is codified ⭐ MVP

**User Story**: As a future contributor, I want `web-patterns.md` to
forbid the patterns we're fixing, so the same drift can't recur silently.

**Why P1**: Both bugs (the flat-file pile-up AND the naked container)
exist because the rule was either ambiguous or silent. Without doc
updates, a year from now the area-level `-dialogs/` reappears.

**Acceptance Criteria**:

1. WHEN `web-patterns.md` §1 is read THEN it SHALL describe the
   per-feature-folder layout as the **only** layout, with no
   "flat-file feature-routes" carve-out.
2. WHEN `web-patterns.md` is read THEN it SHALL contain a "no naked
   container routes" rule stating that every folder whose segment
   appears in the URL must either render a page (`index.tsx` with a
   component) or redirect (`index.tsx` with `beforeLoad`), with route
   groups `(area)/` and pathless layouts `_area/` exempt.
3. WHEN `web-patterns.md` §10 (new-feature checklist) is read THEN the
   step about creating the route folder SHALL match the new layout
   (per-feature folder always, no area-shared `-`-folders).

**Independent Test**: `grep -n "flat-file feature-routes" web-patterns.md`
returns nothing; `grep -n "naked container" web-patterns.md` returns the
new section.

---

## Edge Cases

- WHEN `auth/index.tsx` redirects to `/auth/login` AND the user is
  already authenticated THEN no special handling — the auth layout
  doesn't gate on auth status today; that's a separate concern. The
  redirect still lands on `/auth/login`; existing post-login flow takes
  over.
- WHEN `settings/index.tsx` redirects to `/settings/profile` AND the
  user is unauthenticated THEN `_app/route.tsx`'s existing redirect to
  `/auth/login` fires first (parent layout `beforeLoad` runs before the
  child). No new behavior needed.
- WHEN `routeTree.gen.ts` regenerates after the move THEN it SHALL
  contain entries for every new feature folder and the two new index
  redirects. The file is generated (per `comments.md` §6); contents are
  not hand-edited.
- WHEN existing tests import from `routes/_app/settings/-components/...`
  paths THEN imports SHALL be updated to the new
  `routes/_app/settings/<feature>/-components/...` paths.
- WHEN a moved component had `__test__/` colocated THEN the test folder
  moves with it (preserves the colocation rule).
- WHEN `pause-owner-journeys-dialog.tsx` is moved THEN it goes to
  `settings/members/-dialogs/` (its only consumer is
  `members/-components/members-table.tsx`), **not** to
  `settings/workspace/` despite the "pause owner journeys" name — the
  workspace-settings page never imports it.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RFP-01 | P1 (urls) — `/auth` redirect index | Tasks | Pending |
| RFP-02 | P1 (urls) — `/settings` redirect index | Tasks | Pending |
| RFP-03 | P1 (settings) — promote `billing` | Tasks | Pending |
| RFP-04 | P1 (settings) — promote `channels` (+ -components, -dialogs, -utils) | Tasks | Pending |
| RFP-05 | P1 (settings) — promote `connectors` (+ -components, -dialogs) | Tasks | Pending |
| RFP-06 | P1 (settings) — promote `members` (+ -components, -dialogs) | Tasks | Pending |
| RFP-07 | P1 (settings) — promote `profile` | Tasks | Pending |
| RFP-08 | P1 (settings) — promote `security` (+ -components, -dialogs) | Tasks | Pending |
| RFP-09 | P1 (settings) — promote `workspace` | Tasks | Pending |
| RFP-10 | P1 (workspace) — promote `cadences` (+ -components, -dialogs, -utils) | Tasks | Pending |
| RFP-11 | P1 (workspace) — promote `journeys` (+ -components) | Tasks | Pending |
| RFP-12 | P1 (workspace) — promote `my-channels` (+ -components) | Tasks | Pending |
| RFP-13 | P1 (workspace) — promote `connect-meta-coex` (+ -components) | Tasks | Pending |
| RFP-14 | P1 (workspace) — graduate `journey-status-dot` to `components/composed/` | Tasks | Pending |
| RFP-15 | P1 (rule) — `web-patterns.md` drop flat-file carve-out + add naked-container rule | Tasks | Pending |

**Coverage:** 15 requirements, all map to tasks.

---

## Success Criteria

- [ ] `bun check` is green (typecheck + lint + 387+ tests + the four script-gated checks).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.
- [ ] Manual smoke: `/auth`, `/settings`, `/workspace` (and every child
      route) load with no console errors and no empty-layout flash.
- [ ] `routeTree.gen.ts` regenerates cleanly via `bun routes:generate` from
      `apps/web/`.
- [ ] `find routes/_app -maxdepth 3 -name "*.tsx" -not -name "index.tsx" -not -name "route.tsx" -not -name "__root.tsx" -not -path "*/-*"` returns nothing under `settings/` or `workspace/` (no flat sub-routes left).
- [ ] `find routes/_app/{settings,workspace} -maxdepth 2 -type d -name "-dialogs" -o -maxdepth 2 -type d -name "-utils"` returns nothing (no area-level shared folders left).
