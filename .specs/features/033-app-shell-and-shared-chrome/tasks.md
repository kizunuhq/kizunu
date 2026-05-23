# App Shell and Shared Chrome Tasks

**Design**: `.specs/features/033-app-shell-and-shared-chrome/design.md`
**Spec**: `.specs/features/033-app-shell-and-shared-chrome/spec.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Pre-flight (Sequential)

```
T1
```

### Phase 2a: Composed primitives — leaves [P]

```
T1 ──┬→ T2 [P]
     ├→ T3 [P]
     ├→ T4 [P]
     ├→ T5 [P]
     ├→ T6 [P]
     └→ T7 [P]
```

### Phase 2b: Composed primitives — composers [P]

```
T5 ──→ T8 [P]
T3, T4 ──→ T9 [P]
```

### Phase 3: Hook

```
T10
```

### Phase 4: Sidebar building blocks

```
T1, T8 ──→ T11
T11 ──→ T12 ──→ T13
T1 ──┬→ T14 [P with T13]
     └→ T15 [P with T13]
```

### Phase 5: Shell assembly

```
T1 ──→ T16
T1 ──→ T17
T13, T14, T15 ──→ T18
T16, T17, T18 ──→ T20
        T19 ───→ T20
```

### Phase 6: Email verification banner

```
T19  (independent — can run any time before T20)
```

### Phase 7: Verification + gates + ship

```
T20 ──→ T21 ──→ T22 ──→ T23 ──→ T24
```

---

## Task Breakdown

### T1: Install shadcn primitives

**What**: Install the shadcn primitives the rest of the feature depends on: `sidebar`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `skeleton`. Use the `shadcn` skill (per `react.md` §0) which invokes `bunx --bun shadcn@latest add <name>` against `apps/web/components.json` (style `base-nova`, iconLibrary `@phosphor-icons/react`, ui alias `@kizunu/web/components/primitives`).

**Where**:
- `apps/web/src/components/primitives/sidebar.tsx`
- `apps/web/src/components/primitives/sheet.tsx`
- `apps/web/src/components/primitives/dropdown-menu.tsx`
- `apps/web/src/components/primitives/popover.tsx`
- `apps/web/src/components/primitives/tooltip.tsx`
- `apps/web/src/components/primitives/skeleton.tsx`

**Depends on**: None

**Reuses**: existing `components.json` config; existing `apps/web/src/components/primitives/` directory pattern.

**Requirement**: foundation for SHELL-01, 04, 05, 08, 13, 16, 19.

**Tools**: shadcn skill.

**Done when**:
- [ ] All six primitive files exist under `apps/web/src/components/primitives/`.
- [ ] Each generated file imports from `@kizunu/web/*` (no `@/*` placeholder); `cn` resolves to `@kizunu/web/lib/utils`; any icon usage references `@phosphor-icons/react`, never `lucide-react`.
- [ ] No semicolons, single quotes — if shadcn ships any with semicolons/double-quotes, run `bun fix` to normalize.
- [ ] `bun typecheck` passes.
- [ ] Gate check passes: `bun typecheck`.

**Tests**: none (presentational primitives are thin per TESTING.md).
**Gate**: build (`bun typecheck` only at this stage; full `bun check` runs at T22).

**Verify**: open each new file, confirm icon imports are `@phosphor-icons/react` and `cn` import path is `@kizunu/web/lib/utils`.

**Commit**: `chore(web): install shadcn sidebar, sheet, dropdown-menu, popover, tooltip, skeleton primitives`

---

### T2: Create `PageHeader` composed primitive [P]

**What**: Create the `PageHeader` primitive: optional mono kicker, title (`text-lg font-medium`), optional description, right-aligned actions slot.

**Where**: `apps/web/src/components/composed/page-header.tsx`

**Depends on**: T1

**Reuses**: DESIGN.md §2 scale (page heading `text-lg font-medium`, kicker `text-kizunu-green text-xs font-mono font-medium [bracketed]`).

**Requirement**: SHELL-11.

**Tools**: impeccable (craft visual treatment within DESIGN.md constraints).

**Done when**:
- [ ] File exports `PageHeader` and `PageHeaderProps` interface (one type per file rule: the interface lives in the same file because it is the sole exported type for this component — split off into its own file only if a second type emerges).
- [ ] Renders kicker (when provided) with brackets in the string per DESIGN.md §4.2.
- [ ] No drop shadow, no nested card, `--radius` on any interactive child.

**Tests**: none (thin presentational per TESTING.md).
**Gate**: build (`bun typecheck`).

**Verify**: import in any existing screen, render with `title`, `description`, `kicker='Operations'`, `actions={<Button>New</Button>}`; visual inspection.

**Commit**: `feat(web): add PageHeader composed primitive`

---

### T3: Create `EmptyState` composed primitive [P]

**What**: Centered empty-state component with title, optional description, optional icon, optional action. Background `bg-background-200`, no shimmer, no animation.

**Where**: `apps/web/src/components/composed/empty-state.tsx`

**Depends on**: T1

**Reuses**: DESIGN.md §1.1 (background spine), §7 (no shimmer).

**Requirement**: SHELL-12.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `EmptyState` + `EmptyStateProps`.
- [ ] No `animate-*` classes, no shimmer keyframe.
- [ ] `rounded-[2px]` (or `--radius`) on the container; `border-border` solid border (DESIGN.md §7: dashed is for section separators, not card outlines).

**Tests**: none.
**Gate**: build.

**Verify**: render in a sandbox route, confirm static fill, no animation.

**Commit**: `feat(web): add EmptyState composed primitive`

---

### T4: Create `Skeleton` composed primitive [P]

**What**: Static skeleton block (`bg-background-200 rounded-[2px]`, no animation). Override of the shadcn-installed primitive — strip any shimmer/animation classes shadcn ships.

**Where**: `apps/web/src/components/composed/skeleton.tsx`

**Depends on**: T1

**Reuses**: shadcn-installed `apps/web/src/components/primitives/skeleton.tsx` as a starting shape; remove animation per DESIGN.md §7.

**Requirement**: SHELL-13.

**Tools**: impeccable.

**Done when**:
- [ ] Composed `Skeleton` is a single `<div>` with `bg-background-200 rounded-[2px]` and forwards `className`.
- [ ] Zero `animate-*` / `motion-*` / shimmer keyframes anywhere in this file.
- [ ] Re-exports as the canonical `Skeleton`; the primitive copy stays as the shadcn-installed file but is intentionally not re-exported from a public barrel.

**Tests**: none.
**Gate**: build.

**Verify**: render with `className='h-4 w-32'`, confirm no animation under Chrome DevTools "Animations" panel.

**Commit**: `feat(web): add static Skeleton composed primitive`

---

### T5: Create `Kbd` composed primitive [P]

**What**: Single-keystroke glyph in a `--radius` rectangle. `font-mono text-[10px]`, `h-5 min-w-5`, `border-border bg-background-200 text-muted-foreground`.

**Where**: `apps/web/src/components/composed/kbd.tsx`

**Depends on**: T1

**Reuses**: DESIGN.md §1.3 (radius), §2 (mono scale).

**Requirement**: SHELL-16.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `Kbd` + `KbdProps` with `children: string`.
- [ ] One-glyph payload; rendering a multi-key shortcut requires multiple `<Kbd>` elements adjacent (e.g. `g j`).
- [ ] Class set matches design.md spec.

**Tests**: none.
**Gate**: build.

**Verify**: render `<Kbd>[</Kbd>` in a sandbox, visual inspection.

**Commit**: `feat(web): add Kbd composed primitive`

---

### T6: Create `SettingsRow` composed primitive [P]

**What**: Single row with title + description on the left, action on the right, `variant: 'default' | 'danger'`. Border-top on every row except the first so a stack reads as a list.

**Where**: `apps/web/src/components/composed/settings-row.tsx`

**Depends on**: T1

**Reuses**: DESIGN.md §1.2 (`--destructive`), §7 (no card-of-cards — `SettingsRow` is a row inside a parent `Card`, never a self-card).

**Requirement**: SHELL-15.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `SettingsRow` + `SettingsRowProps` + `SettingsRowVariant` type.
- [ ] `variant='danger'` applies `text-destructive` and the destructive border tint.
- [ ] No `bg-card` (would create card-in-card if the parent is a Card) — only `border-t` for inter-row separation.

**Tests**: none.
**Gate**: build.

**Verify**: render two stacked `SettingsRow`s inside a `Card`, confirm border-top separates them.

**Commit**: `feat(web): add SettingsRow composed primitive`

---

### T7: Create `SettingsLayout` composed primitive [P]

**What**: Two-column layout for settings pages: left sub-nav (link list with active state), right content area.

**Where**: `apps/web/src/components/composed/settings-layout.tsx`

**Depends on**: T1

**Reuses**: TanStack Router `Link` + `useMatchRoute`.

**Requirement**: SHELL-15.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `SettingsLayout` + `SettingsLayoutProps` + `SettingsNavItem` type.
- [ ] Grid: `grid-cols-[200px_1fr]` desktop, `grid-cols-1` mobile.
- [ ] Active item uses `--background-300` per DESIGN.md.

**Tests**: none.
**Gate**: build.

**Verify**: render with two nav items, confirm active state on a known route.

**Commit**: `feat(web): add SettingsLayout composed primitive`

---

### T8: Create `TooltipOnHover` composed primitive [P]

**What**: Wraps Radix Tooltip; body renders label plus an optional `<Kbd>` rendering the shortcut glyph. `delayDuration` 700ms.

**Where**: `apps/web/src/components/composed/tooltip-on-hover.tsx`

**Depends on**: T1, T5

**Reuses**: shadcn `tooltip` primitive (T1), `Kbd` (T5).

**Requirement**: SHELL-16.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `TooltipOnHover` + `TooltipOnHoverProps`.
- [ ] `shortcut` prop renders inside the tooltip body via `<Kbd>`.
- [ ] `side` prop forwards to Radix `<TooltipContent side=...>`.

**Tests**: none.
**Gate**: build.

**Verify**: hover any element wrapped in `<TooltipOnHover label='X' shortcut='['>`, confirm tooltip appears with `X` and a `[` `Kbd`.

**Commit**: `feat(web): add TooltipOnHover composed primitive`

---

### T9: Create `DataTable` composed primitive [P]

**What**: Generic table wrapper composing the existing `Table` primitive. Column descriptor, rows, isPending → skeletons, empty → inline EmptyState.

**Where**: `apps/web/src/components/composed/data-table.tsx`

**Depends on**: T1, T3, T4

**Reuses**: existing `apps/web/src/components/primitives/table.tsx`, `EmptyState` (T3), `Skeleton` (T4).

**Requirement**: SHELL-14.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `DataTable<Row>` generic component, `DataTableColumn<Row>` type, `DataTableProps<Row>` type.
- [ ] Header uses `text-xs font-mono uppercase tracking-wide text-muted-foreground`.
- [ ] `isPending` with no rows → 3 skeleton rows.
- [ ] Not pending and no rows → inline `EmptyState`.
- [ ] `rowKey(row)` used as React `key`.

**Tests**: none (thin presentational; behavior emerges from consumers in later parts).
**Gate**: build.

**Verify**: render with sample rows + columns; toggle `isPending`; clear rows to see empty state.

**Commit**: `feat(web): add DataTable composed primitive`

---

### T10: Create `useHotkey` hook and its unit test

**What**: Hook that binds a single keystroke to a handler with the spec'd guards. Includes a Vitest unit test (fat surface — multi-branch guard logic).

**Where**:
- `apps/web/src/hooks/use-hotkey.ts`
- `apps/web/src/hooks/__test__/use-hotkey.spec.ts`

**Depends on**: None (independent of other tasks)

**Reuses**: standard `useEffect` + `document.addEventListener('keydown', ...)` pattern.

**Requirement**: SHELL-19, SHELL-20.

**Tools**: generate-tests skill (confirms unit-level coverage for this fat surface and authors the test file).

**Done when**:
- [ ] Hook attaches a single keydown listener on `document` in `useEffect` and detaches on unmount.
- [ ] Skips when `event.target` is `HTMLInputElement`, `HTMLTextAreaElement`, or `isContentEditable`.
- [ ] Skips when `document.querySelector('[data-state="open"][role="dialog"], [data-state="open"][role="menu"]')` matches any element.
- [ ] Skips when `options.enabled === false`.
- [ ] Exact `event.key` match (case-sensitive).
- [ ] Unit test covers: (a) fires handler on plain page, (b) skips inside input, (c) skips inside textarea, (d) skips inside `contenteditable`, (e) skips when a Radix open menu is present, (f) `enabled: false` short-circuits.
- [ ] Gate check passes: `bunx vp test --project web` shows 6 tests for `use-hotkey.spec.ts`.

**Tests**: web (jsdom) — fat per TESTING.md ("Web fat logic … web (jsdom)").
**Gate**: quick (`bunx vp test --project web`).

**Verify**: tests pass; manual smoke — bind to `[`, focus body, press `[`, confirm console log fires; focus input, press `[`, confirm no fire.

**Commit**: `feat(web): add useHotkey hook with guards`

---

### T11: Add `NAV_GROUPS` data and types

**What**: Sidebar grouping data plus the `NavGroup` / `NavGroupItem` types, one type per file.

**Where**:
- `apps/web/src/features/app-shell/data/nav-group-item.ts`
- `apps/web/src/features/app-shell/data/nav-group.ts`
- `apps/web/src/features/app-shell/data/nav-groups.ts`

**Depends on**: T1 (icons resolve via shadcn-installed primitives only loosely — phosphor icons are already a project dep).

**Reuses**: phosphor icons (already used elsewhere in the marketing page).

**Requirement**: SHELL-02.

**Tools**: none beyond Edit.

**Done when**:
- [ ] Three files exist, each with one exported type/data.
- [ ] `NAV_GROUPS` contains the two groups per design.md (`Operations`: Overview, Journeys, Cadences, My channels; `Workspace`: Members, Channels, Connectors, Security).
- [ ] All `to:` paths match the existing TanStack Router routes (`/workspace`, `/workspace/journeys`, etc.).

**Tests**: none (pure data).
**Gate**: build (`bun typecheck`).

**Verify**: import `NAV_GROUPS` from a sandbox, log it, confirm shape.

**Commit**: `feat(web): add sidebar nav groups data and types`

---

### T12: Create `NavItem` component

**What**: Single sidebar item — `Link` + icon + label + active state + collapsed-tooltip behavior.

**Where**: `apps/web/src/features/app-shell/components/nav-item.tsx`

**Depends on**: T8 (TooltipOnHover), T11 (NavGroupItem type)

**Reuses**: shadcn `SidebarMenuButton` (T1), `useMatchRoute` from TanStack Router, `TooltipOnHover`.

**Requirement**: SHELL-02, SHELL-03.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `NavItem` + `NavItemProps` (alias of `NavGroupItem` plus internal state).
- [ ] Active when `useMatchRoute({ to, fuzzy: true })` returns truthy.
- [ ] When sidebar `state === 'collapsed'` (from shadcn `useSidebar`), label hides and the item is wrapped in `TooltipOnHover label={label}` with no shortcut (sidebar-level `[` hint lives on the rail handle, not per item).
- [ ] Active class uses `bg-background-300 text-foreground`; hover uses `hover:bg-accent` per DESIGN.md.

**Tests**: none.
**Gate**: build.

**Verify**: render two `NavItem`s in a sandbox, navigate to one of the routes, confirm active state.

**Commit**: `feat(web): add sidebar NavItem component`

---

### T13: Create `NavGroup` component

**What**: Section wrapper — mono kicker label + a vertical list of `NavItem`s.

**Where**: `apps/web/src/features/app-shell/components/nav-group.tsx`

**Depends on**: T12

**Reuses**: shadcn `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`; `NavItem` (T12).

**Requirement**: SHELL-02.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `NavGroup` + `NavGroupProps`.
- [ ] Kicker rendered as `font-mono text-xs text-muted-foreground` (sidebar kicker uses muted-foreground, not the green accent — DESIGN.md §1.4 caps green to three places and these section labels are too repetitive for accent).
- [ ] When sidebar is collapsed, the kicker label hides; the `NavItem`s still render (icon-only).

**Tests**: none.
**Gate**: build.

**Verify**: render `NAV_GROUPS.map((g) => <NavGroup ... />)` in a sandbox.

**Commit**: `feat(web): add sidebar NavGroup component`

---

### T14: Create `WorkspaceSwitcher` component [P with T13]

**What**: Sidebar header — active workspace name + popover listing every membership.

**Where**: `apps/web/src/features/app-shell/components/workspace-switcher.tsx`

**Depends on**: T1

**Reuses**: `useCurrentUser`, `useSwitchWorkspace`, `getApiErrorMessage`, shadcn `Popover`, phosphor `CaretUpDown`, `Check`, sonner `toast`.

**Requirement**: SHELL-05, SHELL-06, SHELL-07.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `WorkspaceSwitcher` (no props — reads from `useCurrentUser`).
- [ ] Single-membership branch renders plain workspace name with no popover trigger.
- [ ] Multi-membership branch renders the active name with `CaretUpDown`; opening the popover lists every membership with a `Check` next to the active.
- [ ] Selecting calls `useSwitchWorkspace.mutate({ workspaceId }, { onSuccess: () => navigate({ to: '/workspace' }), onError: (e) => toast.error(getApiErrorMessage(e)) })`.
- [ ] Trigger keeps `rounded-[2px]`, no drop shadow.

**Tests**: none (thin orchestration over a fat mutation; coverage emerges via e2e in later flows).
**Gate**: build.

**Verify**: with a multi-membership user, open popover, switch, confirm navigation + sidebar header updates after the mutation's invalidate triggers a refetch.

**Commit**: `feat(web): add WorkspaceSwitcher`

---

### T15: Create `UserDropdown` component [P with T13]

**What**: Sidebar footer dropdown — Profile link, Theme submenu (Light / Dark / System), Sign out.

**Where**: `apps/web/src/features/app-shell/components/user-dropdown.tsx`

**Depends on**: T1

**Reuses**: `useCurrentUser`, `useLogout`, `useNavigate`, `useTheme` from `next-themes`, shadcn `DropdownMenu`, phosphor `Sun` `Moon` `Monitor` `SignOut` `User` `CaretRight`.

**Requirement**: SHELL-08, SHELL-09, SHELL-10.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `UserDropdown` (no props).
- [ ] Trigger shows user name (truncated) + a small caret.
- [ ] Menu lists: Profile (`Link to='/settings/profile'`), Theme submenu (radio items: Light / Dark / System with `Check` next to active), Sign out.
- [ ] Sign out: `logout.mutate(undefined, { onSuccess: () => navigate({ to: '/auth/login' }) })`.
- [ ] Theme items call `setTheme('light' | 'dark' | 'system')`.
- [ ] `rounded-[2px]` on the menu content, no drop shadow (DESIGN.md §7 — `--shadow-xs` is reserved for the command palette in Part 7).

**Tests**: none.
**Gate**: build.

**Verify**: open dropdown, flip theme, confirm `.dark` class on `<html>`; click Sign out, confirm `/auth/login`.

**Commit**: `feat(web): add UserDropdown`

---

### T16: Create `TopBar` component

**What**: Thin contextual bar above content. v0.1 of this Part renders the shadcn `SidebarTrigger` (mobile-sheet toggle) on small screens and a 56px-tall bottom border via `FullWidthBorder`. Per-route titles get a future slot.

**Where**: `apps/web/src/features/app-shell/components/top-bar.tsx`

**Depends on**: T1

**Reuses**: shadcn `SidebarTrigger`, `FullWidthBorder` (`apps/web/src/components/primitives/full-width-border.tsx`).

**Requirement**: SHELL-01.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `TopBar` (no props).
- [ ] Renders the mobile `SidebarTrigger` on `md:hidden`.
- [ ] Bottom rule is a `<FullWidthBorder className='bottom-0' />` (DESIGN.md §3.1).
- [ ] Height 56px (`h-14`).

**Tests**: none.
**Gate**: build.

**Verify**: shrink viewport, confirm trigger appears; widen, confirm it hides; visual inspection of the dashed bottom rule.

**Commit**: `feat(web): add app-shell TopBar`

---

### T17: Create `SidebarStateProvider`

**What**: Wrapper that reads `kizunu.sidebar.open` from `localStorage` on mount and writes to it whenever shadcn's `useSidebar()` `open` changes. Sidebar width persistence is deferred — see SPEC_DEVIATION note below.

**Where**: `apps/web/src/features/app-shell/components/sidebar-state-provider.tsx`

**Depends on**: T1

**Reuses**: shadcn `SidebarProvider`, `useSidebar`.

**Requirement**: SHELL-21 (open state). SHELL-22 / 23 (width) are P3 and are deferred — see note.

**Tools**: none beyond Edit.

**Done when**:
- [ ] Exports `SidebarStateProvider` that takes `children`.
- [ ] Reads `localStorage.getItem('kizunu.sidebar.open')` on mount; passes parsed boolean as `defaultOpen` to shadcn `SidebarProvider`.
- [ ] Renders an internal `<SidebarPersist />` consumer that subscribes to `useSidebar().open` and writes to `localStorage` on change.
- [ ] Both read and write wrapped in `try/catch` for private-mode resilience.

**SPEC_DEVIATION (width persistence — SHELL-22, SHELL-23)**: shadcn's
`sidebar` primitive exposes `--sidebar-width` as a CSS variable but does
not surface drag-end events. Persisting the width would require
patching the primitive (forbidden — DESIGN.md says we install shadcn as
source, modify lightly; restructuring its drag handlers is heavyweight).
Decision: ship the open/collapsed state persistence (SHELL-21) in this
Part; defer width persistence to a follow-up issue. Logged here, status
recorded in `tasks.md` table; not promoted to a roadmap item because
no user has asked for resizing and the default width covers the v0.1
vocabulary (per spec P7 = P3, "Nice to have").

**Tests**: none (thin orchestration; reading/writing `localStorage` is the only logic and emerges trivially).
**Gate**: build.

**Verify**: toggle the sidebar, reload, confirm open/closed state persists.

**Commit**: `feat(web): persist sidebar open state to localStorage`

---

### T18: Create `AppSidebar` component

**What**: The full sidebar — composes `WorkspaceSwitcher` (header), `NAV_GROUPS.map(NavGroup)` (content), `UserDropdown` (footer), `SidebarRail` (drag handle, even though the width is not persisted yet).

**Where**: `apps/web/src/features/app-shell/components/app-sidebar.tsx`

**Depends on**: T13, T14, T15

**Reuses**: shadcn `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarRail` (T1); `NAV_GROUPS` (T11); `NavGroup` (T13); `WorkspaceSwitcher` (T14); `UserDropdown` (T15).

**Requirement**: SHELL-01, SHELL-02, SHELL-04.

**Tools**: impeccable.

**Done when**:
- [ ] Exports `AppSidebar` (no props).
- [ ] Header renders `<WorkspaceSwitcher />`.
- [ ] Content renders `NAV_GROUPS.map((group) => <NavGroup key={group.label} {...group} />)`.
- [ ] Footer renders `<UserDropdown />`.
- [ ] Mobile uses shadcn's automatic Sheet behavior (`md` default breakpoint).

**Tests**: none.
**Gate**: build.

**Verify**: render under `SidebarProvider` and `SidebarInset` in a sandbox; resize viewport to confirm sheet behavior.

**Commit**: `feat(web): assemble AppSidebar from nav groups, switcher, dropdown`

---

### T19: Edit `EmailVerificationBanner` to add in-app links

**What**: Add two `Link`s inside the existing banner — `/auth/verify-email` ("Open verify page") and `/settings/profile` ("Change email"). Preserve the existing resend behavior verbatim.

**Where**: `apps/web/src/features/identity/components/email-verification-banner.tsx` (edit)

**Depends on**: None (independent of other tasks)

**Reuses**: TanStack Router `Link`, existing `useResendEmailVerification`.

**Requirement**: SHELL-17, SHELL-18.

**Tools**: none beyond Edit.

**Done when**:
- [ ] Banner renders both links alongside the existing Resend button.
- [ ] Links use `text-muted-foreground hover:text-foreground` consistent with the banner palette.
- [ ] Banner remains non-dismissible (no close button added).
- [ ] No change to the resend logic.

**Tests**: none (thin presentational; the resend mutation's behavior is unchanged).
**Gate**: build.

**Verify**: sign in as an unverified user, confirm banner shows both new links; click each, confirm navigation lands on the expected route (404 placeholder for `/settings/profile` until Part 4).

**Commit**: `feat(web): add in-app verify and change-email links to verification banner`

---

### T20: Replace `AppShell` with the new sidebar shell

**What**: Replace the existing 53-line topbar shell with a sidebar-based shell composing all of the prior tasks: `SidebarStateProvider` → `SidebarProvider` → `AppSidebar` + `SidebarInset` (containing `TopBar` + `EmailVerificationBanner` + `Outlet`). Bind `useHotkey('[', toggleSidebar)` via the shadcn `useSidebar` API.

**Where**: `apps/web/src/features/app-shell/components/app-shell.tsx` (replace)

**Depends on**: T10, T16, T17, T18, T19

**Reuses**: shadcn `SidebarProvider`, `SidebarInset`, `useSidebar` (for the hotkey toggle wiring); `SidebarStateProvider` (T17); `AppSidebar` (T18); `TopBar` (T16); `EmailVerificationBanner` (T19); `useHotkey` (T10).

**Requirement**: SHELL-01, SHELL-04, SHELL-17, SHELL-19.

**Tools**: impeccable.

**Done when**:
- [ ] `app-shell.tsx` no longer renders the horizontal topbar nav; the new shell composes Sidebar + Inset.
- [ ] `useHotkey('[', () => setOpen(!open))` is bound where `setOpen`/`open` come from `useSidebar()`. The hook lives inside a small inner component that has access to `useSidebar` (which needs `SidebarProvider` above it).
- [ ] `EmailVerificationBanner` renders as the first child of `SidebarInset`'s content column, above the `Outlet`.
- [ ] The `userName` prop accepted by `AppShell` today is removed (the new shell reads from `useCurrentUser` directly); `_app/route.tsx` is updated to render `<AppShell />` with no prop.
- [ ] No `<p>Loading…</p>` strings remain in the shell — render `Skeleton` if anything is pending.

**Tests**: none (thin shell composition).
**Gate**: build.

**Verify**: dev server boots, sign in, land on `/workspace`, confirm sidebar + topbar + banner + outlet structure; press `[` and confirm sidebar collapses.

**Commit**: `feat(web): replace topbar shell with sidebar-based AppShell`

---

### T21: Smoke-check every existing protected route and craft the visual

**What**: Boot the dev server, visit every existing protected route, confirm it renders cleanly inside the new shell, and run `impeccable` over the shell's visual treatment (sidebar pill, kicker spacing, dropdown layout, banner placement, empty fallback when `useCurrentUser` is in flight) to polish to DESIGN.md.

**Where**: every existing `apps/web/src/routes/_app/**` route — none of them need code edits, only render verification.

**Depends on**: T20

**Reuses**: existing screens unchanged.

**Requirement**: SHELL-01 through SHELL-21 (visual integration).

**Tools**: impeccable, run skill (boot the dev server).

**Done when**:
- [ ] Each of the 9 routes renders without console errors:
  - `/workspace` (today: stub heading — still a stub; reachable inside new shell)
  - `/workspace/members`
  - `/workspace/channels`
  - `/workspace/connectors`
  - `/workspace/cadences`
  - `/workspace/journeys`
  - `/workspace/my-channels`
  - `/workspace/connect-meta-coex`
  - `/workspace/security`
- [ ] Sidebar active state lights up on each (`Members`, `Channels`, etc.).
- [ ] `[` toggles the sidebar from any of them.
- [ ] Workspace switcher opens (with a single-membership user, renders the plain workspace name with no chevron).
- [ ] User dropdown opens, theme flip works, sign out routes to `/auth/login`.
- [ ] Email-verification banner appears for an unverified test user and the two new links navigate.
- [ ] impeccable craft pass complete (visual notes resolved within DESIGN.md constraints).

**Tests**: none (manual smoke + visual).
**Gate**: build.

**Verify**: dev server screenshots/visual inspection of each route.

**Commit**: (no commit — verification only; any visual nits get folded into the prior task's amend or a fresh `chore(web): polish app shell visual` commit.)

---

### T22: `bun check` is green

**What**: Full repo gate. Typecheck, lint under CI strictness, format check, all tests, all four `check-*` scripts, drizzle checksums.

**Where**: repo root.

**Depends on**: T21

**Reuses**: `scripts/check.sh`.

**Requirement**: AGENTS.md Definition of Done #3.

**Tools**: Bash.

**Done when**:
- [ ] `bun check` exits 0.
- [ ] `CI=1 bunx vp lint` reports zero warnings, zero errors.
- [ ] Test count for the `web` project includes the new `use-hotkey.spec.ts` cases (6 tests added).
- [ ] No silent test deletions.

**Tests**: full (`bun check`).
**Gate**: build.

**Verify**: `bun check`.

---

### T23: `thermo-nuclear-code-quality-review` pass

**What**: Run the strict maintainability audit on the branch diff. Fix every structural finding. Re-run `bun check`.

**Where**: branch diff.

**Depends on**: T22

**Reuses**: the skill itself.

**Requirement**: AGENTS.md flow step 6.

**Tools**: thermo-nuclear-code-quality-review skill.

**Done when**:
- [ ] Skill output reviewed; all findings either resolved with diff changes or explicitly justified in tasks.md as deferred.
- [ ] `bun check` is still green after any resolutions.

**Tests**: none (audit-only).
**Gate**: build.

**Verify**: skill output captured; resolutions visible in the diff.

**Commit**: any number of focused `refactor(web): ...` commits per resolution.

---

### T24: `review-and-ship` → PR → CI green → squash to master

**What**: Final correctness/regression/intent review; commit any final polish; push the branch; open the PR; watch CI; fix red CI; squash-merge to `master`; delete branch.

**Where**: branch, GitHub.

**Depends on**: T23

**Reuses**: review-and-ship, ci-watcher, fix-ci skills.

**Requirement**: AGENTS.md flow steps 8-11.

**Tools**: review-and-ship, ci-watcher, fix-ci.

**Done when**:
- [ ] PR opened against `master` with the spec linked.
- [ ] `Required (CI)` aggregator is green.
- [ ] PR squash-merged to `master` (autonomous per AGENTS.md flow step 11).
- [ ] Branch deleted.
- [ ] `STATE.md` updated with a one-line entry under the feature 033 lessons.

**Tests**: full (CI runs `bun check` parity).
**Gate**: build.

**Verify**: `gh pr view --json mergedAt`, `git log master` shows the squash commit.

---

## Parallel Execution Map

```
Phase 1:  T1

Phase 2a: T1 done, then in parallel:
            ├── T2 [P]
            ├── T3 [P]
            ├── T4 [P]
            ├── T5 [P]
            ├── T6 [P]
            └── T7 [P]

Phase 2b: T5 done → T8 [P]
          T3+T4 done → T9 [P]
          (T8 and T9 are [P] with each other and with any remaining Phase 2a tasks
           that have not yet finished — they share no files)

Phase 3:  T10 (independent of T1-T9; can in principle run from the start)

Phase 4:  T8 + T1 done → T11 → T12 → T13
                                ├── T14 [P with T13]
                                └── T15 [P with T13]

Phase 5:  T1 done → T16, T17 (parallel pair)
          T13 + T14 + T15 done → T18

Phase 6:  T19 (independent of all of the above; can run any time before T20)

Phase 7:  T10 + T16 + T17 + T18 + T19 done → T20 → T21 → T22 → T23 → T24
```

**Parallelism constraint check**: all `[P]` tasks have no file overlap.
The web project tests are parallel-safe per TESTING.md ("unit Yes",
"web Yes"); only T10's test runs (the rest are presentational thin).
No integration / e2e tasks here, so no parallel-safety violations.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 6 shadcn installs into existing primitives/ | ⚠️ cohesive — they share the install pattern and `components.json`; one task is cleaner than six |
| T2-T9 | 1 file each | ✅ Granular |
| T10 | 1 hook + 1 spec | ✅ Granular (co-located test per TESTING.md) |
| T11 | 3 files (data + 2 types), tightly coupled | ⚠️ cohesive — one logical unit |
| T12-T18 | 1 component each | ✅ Granular |
| T19 | 1 file edit | ✅ Granular |
| T20 | 1 file replace + 1 small route edit | ✅ Granular |
| T21 | verification + craft pass | ⚠️ multi-route — by design a verification gate, not implementation |
| T22-T24 | gate / audit / ship | ⚠️ each is a single skill/command invocation |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | — | — | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 | ✅ |
| T5 | T1 | T1 → T5 | ✅ |
| T6 | T1 | T1 → T6 | ✅ |
| T7 | T1 | T1 → T7 | ✅ |
| T8 | T1, T5 | T5 → T8 (T1 implied via T5) | ✅ |
| T9 | T1, T3, T4 | T3,T4 → T9 (T1 implied) | ✅ |
| T10 | — | (Phase 3 standalone) | ✅ |
| T11 | T1 | T1 → T11 (and T8 in body via icons — actually icons are phosphor, not from T1; correcting: T11 depends only on T1 loosely for parallel ordering; primary dep is "none") | ⚠️ corrected — T11 depends on no other task; T8 dep removed from text above |
| T12 | T8, T11 | T8+T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T1 | T1 → T14 (P with T13) | ✅ |
| T15 | T1 | T1 → T15 (P with T13) | ✅ |
| T16 | T1 | T1 → T16 | ✅ |
| T17 | T1 | T1 → T17 | ✅ |
| T18 | T13, T14, T15 | T13+T14+T15 → T18 | ✅ |
| T19 | — | (Phase 6 standalone) | ✅ |
| T20 | T10, T16, T17, T18, T19 | all five → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |

(T11's `Depends on` was overstated in its body — corrected to `None` to
match how it's used. T11 produces data + type files; phosphor icons
imported there resolve via the existing project dependency, not T1.)

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | shadcn primitives (thin presentational) | none | none | ✅ |
| T2 | composed primitive (thin presentational) | none | none | ✅ |
| T3 | composed primitive (thin) | none | none | ✅ |
| T4 | composed primitive (thin) | none | none | ✅ |
| T5 | composed primitive (thin) | none | none | ✅ |
| T6 | composed primitive (thin) | none | none | ✅ |
| T7 | composed primitive (thin) | none | none | ✅ |
| T8 | composed primitive (thin) | none | none | ✅ |
| T9 | composed primitive (thin) | none | none | ✅ |
| T10 | web hook (fat — multi-branch guards) | web (jsdom) | web | ✅ |
| T11 | pure data + types | none | none | ✅ |
| T12 | feature component (thin) | none | none | ✅ |
| T13 | feature component (thin) | none | none | ✅ |
| T14 | feature component (thin orchestration of fat mutation) | none | none | ✅ |
| T15 | feature component (thin) | none | none | ✅ |
| T16 | feature component (thin) | none | none | ✅ |
| T17 | feature provider (thin — `localStorage` read/write inside try/catch) | none | none | ✅ |
| T18 | feature component (thin composition) | none | none | ✅ |
| T19 | existing feature component edit (thin) | none | none | ✅ |
| T20 | feature shell (thin composition) | none | none | ✅ |

All thin web components/hooks fall in TESTING.md's "Web components / hooks (thin) → none (browser e2e covers them)" row. The only fat surface is `useHotkey` (T10), which gets its dedicated unit test in the same task.

---

## Tools per task

| Task | MCP / Skill |
| ---- | ----------- |
| T1 | shadcn skill (installs primitives) |
| T2-T9 | impeccable (visual craft within DESIGN.md constraints) |
| T10 | generate-tests skill (confirms unit-level coverage + authors the spec) |
| T11 | none (pure data + types) |
| T12-T18 | impeccable |
| T19 | none beyond Edit |
| T20 | impeccable |
| T21 | impeccable, run skill (boot dev server) |
| T22 | none beyond Bash (`bun check`) |
| T23 | thermo-nuclear-code-quality-review skill |
| T24 | review-and-ship, ci-watcher, fix-ci skills |

---

## Branch + ship

1. Pre-T1: create branch from latest `master` via `new-branch-and-pr` (`git switch -c feat/app-shell-and-shared-chrome` after a fresh `git pull --ff-only`).
2. Per-task: one focused commit per task (subjects already drafted under each task's `Commit:` line) using Conventional Commits. Commitlint runs on pre-commit.
3. After T20: spec / design / tasks docs themselves get a single commit early in the branch (e.g. `docs(specs): land 033 spec, design, tasks`).
4. T22: gate.
5. T23: `thermo-nuclear-code-quality-review` then any `refactor(web): ...` commits.
6. T24: `review-and-ship` runs the final correctness pass, pushes the branch, opens the PR against `master`, links the spec; `ci-watcher` watches; `fix-ci` if red; squash-merge to `master`; delete branch; update STATE.md.

Per AGENTS.md flow guardrail: never commit or merge with a red `bun check`, failing tests, or red CI; never bypass git hooks; this branch stays scoped to feature 033 only.
