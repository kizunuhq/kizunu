# App Shell and Shared Chrome Specification

## Problem Statement

`apps/web` today wears a thin chrome built for the v0.1 minimum-UI slice: a flat
80px topbar with eight horizontal text links (`apps/web/src/features/app-shell/components/app-shell.tsx`),
no sidebar, no workspace switcher, no user dropdown, no shared empty/loading
primitives, no keyboard affordances. The `useSwitchWorkspace` hook ships in
`@kizunu/api-client` with no UI consumer, the email-verification banner sits
above the main content without grouping, and every screen rolls its own
`isPending ? <p>Loading…</p> : ...` because there are no composed primitives.
This is the foundation everything else in the seven-part remake rests on; until
it lands, every later screen would carry its own chrome workarounds.

## Goals

- [ ] Replace the topbar shell with a sidebar-based shell (left sidebar +
      contextual top bar + content) that all authenticated routes render inside.
- [ ] Wire `useSwitchWorkspace` to a workspace switcher in the sidebar header
      so multi-workspace users can move between workspaces without signing out.
- [ ] Add a user dropdown in the sidebar footer with theme switch (light/dark)
      and sign-out.
- [ ] Ship the composed primitives every later part will depend on: `PageHeader`,
      `EmptyState`, `Skeleton`, `DataTable` wrapper, `SettingsRow`,
      `SettingsLayout`, `TooltipOnHover`, `Kbd`.
- [ ] Keep the email-verification banner's existing behavior, re-place it under
      the top bar in the new shell, and add an in-app verify link plus a
      change-email path.
- [ ] Make every screen render loading, error, and empty states through the
      same shared primitives so later parts do not reinvent them.
- [ ] Add the sidebar collapse/expand hotkey (`[`).

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Command palette (`⌘K`) | Part 7 — needs the global command registry that later parts populate. |
| Global hotkeys beyond sidebar toggle (`g j`, `g c`, `/`, `?`) | Part 7. |
| Auth screen redesign (`/auth/*`) | Part 2 — runs on its own `AuthLayout`, not the app shell. |
| Dashboard home content (KPIs, recent activity, first-run checklist) | Part 3 — needs the empty-state library this part ships first. |
| Settings sub-navigation pages | Part 4 — uses the `SettingsLayout` this part ships. |
| Cadence / Journey screen redesigns | Parts 5 and 6. |
| Workspace creation flow | Backend has no create-workspace use-case yet (CONCERNS); switcher only switches between existing memberships. |
| Theme system overhaul | DESIGN.md already settled — this part wires the existing `next-themes` `.dark` class via the user-dropdown toggle. |
| Drop shadows, shimmer skeletons, rounded-full pills | DESIGN.md §7 bans these — this part follows the existing tokens, not extends them. |

---

## User Stories

### P1: Operator navigates via a sidebar that earns its space ⭐ MVP

**User Story**: As a workspace admin running the dashboard all day, I want a
sidebar with grouped sections so I can find Cadences, Journeys, Channels, and
Settings without scanning a horizontal strip.

**Why P1**: Today's flat eight-link topbar collapses on narrower screens,
gives no visual hierarchy between operational pages and admin pages, and
forces every new screen to fight for space in the strip. The sidebar is the
load-bearing structural decision every later part composes against.

**Acceptance Criteria**:

1. WHEN an authenticated user loads any `/_app/**` route THEN the shell SHALL
   render a left sidebar, a contextual top bar, and a content area in place
   of the current 80px horizontal topbar.
2. WHEN the sidebar renders THEN it SHALL group items into sections (e.g.
   Operations: Overview, Journeys, Cadences; Workspace: Members, Channels,
   Connectors, Security), each section labelled with a mono kicker per
   DESIGN.md §4.2.
3. WHEN a sidebar item matches the active route THEN it SHALL render an
   active state using `--background-300` (per DESIGN.md), without a solid
   border or pill background.
4. WHEN a user hovers a sidebar item THEN the hover fill SHALL use
   `--accent` (per DESIGN.md §1.2) and the icon SHALL transition from 60%
   opacity to full per the existing button hover pattern (DESIGN.md §4.1).
5. WHEN the viewport collapses below the configured breakpoint THEN the
   sidebar SHALL switch to an off-canvas sheet via the shadcn `sheet`
   primitive (installed in this part) rather than overlapping content.

**Independent Test**: Sign in, land on `/workspace`, confirm the sidebar
renders with grouped sections, confirm active state on `/workspace`, hover
each section to confirm the hover fill, resize the browser to mobile width
and confirm the sheet behavior.

---

### P2: Multi-workspace user switches workspace from the sidebar ⭐ MVP

**User Story**: As a user with memberships in two workspaces, I want to
switch between them without signing out so I can review both pilots without
losing context.

**Why P1**: `useSwitchWorkspace` exists in `@kizunu/api-client/identity` but
no UI exposes it. Multi-workspace users today have no path to switch from the
web app.

**Acceptance Criteria**:

1. WHEN the sidebar header renders THEN it SHALL show the active workspace's
   name plus a chevron that opens a popover listing every membership the
   current user has.
2. WHEN the user selects a different workspace from the popover THEN the
   shell SHALL call `useSwitchWorkspace` with that workspace's id, refetch
   `useCurrentUser`, and route the user to `/workspace` on success.
3. WHEN the switch mutation errors THEN the popover SHALL render the error
   via `sonner` toast using the existing `getApiErrorMessage` helper.
4. WHEN the user has exactly one membership THEN the workspace name SHALL
   render plainly (no chevron, no popover) — there is nothing to switch to.

**Independent Test**: Provision a user with two workspace memberships, open
the sidebar header, switch to the second workspace, confirm the route lands
on `/workspace` with the new workspace's data and the sidebar header shows
the new name.

---

### P3: User reaches profile, theme, and sign-out from the sidebar footer ⭐ MVP

**User Story**: As any authenticated user, I want a single dropdown at the
bottom of the sidebar that exposes my profile link, the theme toggle, and
sign-out so I do not hunt across the chrome for them.

**Why P1**: Today's "Log out" button sits in the topbar with no profile
affordance and no theme control. DESIGN.md ships both light and dark tokens
but there is no UI control to flip them.

**Acceptance Criteria**:

1. WHEN the sidebar footer renders THEN it SHALL show the user's name and a
   dropdown trigger.
2. WHEN the user opens the dropdown THEN it SHALL list: Profile (placeholder
   link to `/settings/profile` — wired by Part 4), Theme (a sub-menu of
   Light / Dark / System), and Sign out.
3. WHEN the user picks a theme THEN the shell SHALL call `setTheme` on the
   existing `next-themes` provider and the `.dark` class on `<html>` SHALL
   reflect the choice within one tick.
4. WHEN the user picks Sign out THEN the shell SHALL call `useLogout` and
   route to `/auth/login` on success (preserving today's behavior).
5. WHEN the dropdown opens THEN it SHALL render with `--radius` (2px),
   `border-border`, no drop shadow per DESIGN.md §7.

**Independent Test**: Open the sidebar footer dropdown, flip theme between
Light / Dark / System and confirm the `.dark` class follows, click Sign out
and land on `/auth/login`.

---

### P4: Every screen renders loading, error, and empty through shared primitives ⭐ MVP

**User Story**: As a developer building any later part of the remake, I want
a small set of composed primitives so my screen renders consistent
`PageHeader`, `EmptyState`, loading skeletons, error states, table chrome,
and settings rows without re-deriving the pattern.

**Why P1**: Every existing screen today rolls its own `isPending ? <p>Loading…</p>` and ad-hoc empty messages. Without shared primitives, the
remake repeats this seven times. The primitives are the public surface of
this feature for the next six parts.

**Acceptance Criteria**:

1. WHEN a screen imports `PageHeader` THEN it SHALL receive props
   `title: string`, `description?: string`, `kicker?: string`, `actions?: ReactNode`,
   and render the page heading with `text-lg font-medium` (per DESIGN.md
   §2 scale) and an optional mono kicker above it.
2. WHEN a screen imports `EmptyState` THEN it SHALL receive props
   `title: string`, `description?: string`, `icon?: ReactNode`,
   `action?: ReactNode` and render centered content with the static
   `bg-background-200` fill (no shimmer per DESIGN.md §7).
3. WHEN a screen imports `Skeleton` THEN it SHALL render a static
   `bg-background-200` block sized by `className` (or `width`/`height`
   props), with no animation — shimmer is banned per DESIGN.md §7.
4. WHEN a screen imports `DataTable` THEN it SHALL receive a column
   descriptor and rows and render a `Table` with consistent mono headings
   (`text-xs font-mono uppercase tracking-wide` per DESIGN.md §2 scale)
   and a built-in empty state that delegates to `EmptyState`.
5. WHEN a screen imports `SettingsRow` THEN it SHALL receive props
   `title: string`, `description?: string`, `action?: ReactNode`,
   `variant?: 'default' | 'danger'` and render a single bordered row
   matching DESIGN.md's "card may contain rows" rule (no nested cards).
6. WHEN a screen imports `SettingsLayout` THEN it SHALL render a left
   sub-navigation column and a right content column, ready for Part 4 to
   compose Profile / Workspace / Members / Security / Channels / Connectors
   pages into.
7. WHEN a screen imports `TooltipOnHover` THEN it SHALL render a Radix
   tooltip with optional `shortcut?: string` rendered via the new `Kbd`
   primitive inside the tooltip body.
8. WHEN a screen imports `Kbd` THEN it SHALL render a single-keystroke
   indicator with `font-mono text-xs` inside a `--radius` rectangle, sized
   to fit a single key glyph (no rounded-full per DESIGN.md §1.3).

**Independent Test**: For each primitive, render a minimal demo and confirm
the rendered HTML uses the token classes specified above; confirm
`Skeleton` has no animation class and no shimmer keyframe.

---

### P5: Email-verification banner stays useful in the new shell

**User Story**: As a newly registered user who has not yet verified email, I
want the unverified banner to remain visible inside the new shell so I see
it on every authenticated page, and I want a one-click in-app verify path.

**Why P1**: The banner already exists in
`apps/web/src/features/identity/components/email-verification-banner.tsx` and
shipped with feature 023. The new shell must not break it; the same feature
adds the in-app links the banner currently lacks.

**Acceptance Criteria**:

1. WHEN an authenticated user has not verified email THEN the banner SHALL
   render immediately under the top bar inside the content column (not
   stuck to viewport top, so it scrolls with content).
2. WHEN the banner renders THEN it SHALL preserve the existing resend
   behavior unchanged and add (a) a link to `/auth/verify-email` for users
   who want to enter the token manually and (b) a link to
   `/settings/profile` (placeholder for Part 4) where the user will be able
   to change the email.
3. WHEN the user dismisses the banner THEN it SHALL remain non-dismissible
   (per feature 023's design); only successful verification removes it.

**Independent Test**: Sign in as an unverified user, confirm the banner
renders under the top bar, confirm the resend button still works, confirm
the two new links resolve to their routes.

---

### P6: Sidebar collapses with the `[` hotkey

**User Story**: As a power user, I want one keystroke to collapse the
sidebar when I want more space for a long table or a cadence builder.

**Why P2**: The hotkey is small but signals the keyboard-first posture the
later parts will lean into. Punting it to Part 7 makes the new shell feel
mouse-only on day one.

**Acceptance Criteria**:

1. WHEN any authenticated route is focused (no input element has focus)
   and the user presses `[` THEN the sidebar SHALL toggle between expanded
   and collapsed (icon-only) states.
2. WHEN the sidebar is collapsed THEN section labels SHALL hide and each
   nav item SHALL show only its icon, with `TooltipOnHover` exposing the
   label and the `[` shortcut.
3. WHEN the user is typing inside an input, textarea, or contenteditable
   element THEN `[` SHALL pass through unchanged (no toggle).
4. WHEN the collapse state changes THEN the change SHALL persist in
   `localStorage` so the next session opens to the same state.

**Independent Test**: Focus the page, press `[`, confirm the sidebar
collapses; press `[` again, confirm it expands; focus a text input, press
`[`, confirm the character types and the sidebar does not toggle; reload
and confirm the state persists.

---

### P7: Sidebar resizes by drag

**User Story**: As a user with a wide monitor, I want to widen the sidebar
to accommodate long workspace names without truncation.

**Why P3**: Nice-to-have; the default width covers the v0.1 vocabulary.

**Acceptance Criteria**:

1. WHEN the user drags the sidebar's right edge THEN the sidebar width
   SHALL adjust between configured min and max widths.
2. WHEN the drag releases THEN the width SHALL persist in `localStorage`
   so the next session restores it.
3. WHEN the sidebar is in collapsed (icon-only) state THEN the drag handle
   SHALL be inert — the collapsed width is fixed.

**Independent Test**: Drag the sidebar handle right and left, confirm the
content area reflows; reload and confirm the width persists.

---

## Edge Cases

- WHEN the current user has no active workspace (cold start, freshly
  registered without an invite) THEN the sidebar header SHALL render the
  user's first available membership as the active workspace and call
  `useSwitchWorkspace` on mount to land on it.
- WHEN `useCurrentUser` is in flight on the very first render THEN the
  shell SHALL render the structure with `Skeleton` placeholders in the
  header and footer rather than a blank shell.
- WHEN `useCurrentUser` errors with a 401-equivalent THEN the shell SHALL
  redirect to `/auth/login` (existing protected-route behavior) — no
  bespoke handling in the shell.
- WHEN a sidebar nav link target does not yet exist (e.g. `/settings/profile`
  is a Part 4 link rendered here) THEN clicking it SHALL navigate normally;
  the destination's 404 / placeholder behavior is the receiving part's
  problem, not the shell's.
- WHEN the email-verification banner and the sidebar both want vertical
  space at small viewports THEN the banner SHALL stack above the content
  inside the content column; the sidebar is unaffected.
- WHEN `[` is pressed during an open Radix popover / sheet THEN the hotkey
  SHALL not fire (popover focus context takes precedence).
- WHEN `prefers-reduced-motion: reduce` is set THEN sidebar transitions
  SHALL respect the global motion reset (`apps/web/src/styles.css` already
  resets motion under that media query per DESIGN.md §9).
- WHEN dark mode is active THEN every primitive SHALL render with the
  `.dark` token spine — no `bg-white` / `bg-zinc-*` / raw hex anywhere
  (per DESIGN.md §1.1 absolute bans).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SHELL-01 | P1: Sidebar layout replaces topbar | Design | Pending |
| SHELL-02 | P1: Grouped sections with mono kickers | Design | Pending |
| SHELL-03 | P1: Active + hover states use DESIGN.md tokens | Design | Pending |
| SHELL-04 | P1: Mobile sheet fallback | Design | Pending |
| SHELL-05 | P2: Workspace switcher wires useSwitchWorkspace | Design | Pending |
| SHELL-06 | P2: Switcher error toast | Design | Pending |
| SHELL-07 | P2: Single-membership renders plain text | Design | Pending |
| SHELL-08 | P3: User dropdown shape (profile + theme + sign out) | Design | Pending |
| SHELL-09 | P3: Theme toggle flips next-themes | Design | Pending |
| SHELL-10 | P3: Sign-out preserves logout-then-/auth/login flow | Design | Pending |
| SHELL-11 | P4: PageHeader primitive | Design | Pending |
| SHELL-12 | P4: EmptyState primitive (static, no shimmer) | Design | Pending |
| SHELL-13 | P4: Skeleton primitive (static) | Design | Pending |
| SHELL-14 | P4: DataTable wrapper | Design | Pending |
| SHELL-15 | P4: SettingsRow + SettingsLayout | Design | Pending |
| SHELL-16 | P4: TooltipOnHover + Kbd | Design | Pending |
| SHELL-17 | P5: Email banner repositioned, links added | Design | Pending |
| SHELL-18 | P5: Banner remains non-dismissible | Design | Pending |
| SHELL-19 | P6: Sidebar collapse hotkey [ | Design | Pending |
| SHELL-20 | P6: Hotkey ignored in inputs / popovers | Design | Pending |
| SHELL-21 | P6: Collapse state persisted | Design | Pending |
| SHELL-22 | P7: Sidebar drag-to-resize | Design | Pending |
| SHELL-23 | P7: Width persisted | Design | Pending |

**ID format:** `SHELL-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 23 total. All map to tasks in `tasks.md` after the Tasks
phase runs.

---

## Success Criteria

- [ ] `apps/web` boots into the new sidebar shell on every authenticated
      route; the prior 80px topbar shell is removed from
      `apps/web/src/features/app-shell/components/app-shell.tsx`.
- [ ] A multi-workspace user can switch workspace via the sidebar header
      without navigating away from the shell.
- [ ] The user dropdown flips theme and signs out without leaving the
      sidebar footer.
- [ ] Every composed primitive in P4 is importable from a single shared
      location (`@kizunu/web/components/composed/*`), each primitive in
      its own kebab-case file with one type per file.
- [ ] The email-verification banner renders under the top bar in the new
      shell, with the two new links present and the existing resend
      mutation unchanged.
- [ ] `[` toggles the sidebar; `localStorage` persists state across reloads;
      inputs and open popovers are safe from the hotkey.
- [ ] `bun check` is green: typecheck, lint under CI strictness (`CI=1
      bunx vp lint` reports zero warnings), all four `scripts/check-*.ts`,
      drizzle checksums, all tests.
- [ ] `thermo-nuclear-code-quality-review` runs on the branch diff and
      every finding it raises is resolved before the PR is opened.
- [ ] PR is opened against `master` with the spec linked, CI is green,
      and the branch squash-merges autonomously per AGENTS.md flow step 11.
