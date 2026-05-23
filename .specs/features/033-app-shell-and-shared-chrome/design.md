# App Shell and Shared Chrome Design

**Spec**: `.specs/features/033-app-shell-and-shared-chrome/spec.md`
**Status**: Draft

---

## Architecture Overview

The new shell replaces `apps/web/src/features/app-shell/components/app-shell.tsx`
(today: 53-line topbar with eight horizontal links) with a sidebar-first layout
composed from shadcn primitives and a small set of new composed primitives.
Every authenticated route already nests under `/_app/route.tsx`'s
`ProtectedLayout`, so the change is a localized swap of the `AppShell`
component — no router restructuring.

```
ProtectedLayout (existing, in routes/_app/route.tsx)
└── AppShell (REPLACED)
    ├── SidebarProvider (shadcn sidebar's context + collapsed state)
    │   ├── Sidebar
    │   │   ├── SidebarHeader → WorkspaceSwitcher (Popover of memberships)
    │   │   ├── SidebarContent → NavGroup[] from NAV_GROUPS data
    │   │   │   └── NavItem[] (Link + icon + active state + Tooltip when collapsed)
    │   │   ├── SidebarRail (drag handle for resize)
    │   │   └── SidebarFooter → UserDropdown (DropdownMenu + theme sub-menu + sign out)
    │   └── SidebarInset (main column)
    │       ├── TopBar (contextual: page title + actions; populated by per-route components via context — out of scope here)
    │       ├── EmailVerificationBanner (moved into the inset, first child of content)
    │       └── <Outlet /> (page content)
    └── (Sheet variant rendered under md breakpoint, swapped by shadcn sidebar primitive itself)
```

The shadcn `sidebar` primitive (its `SidebarProvider` + `Sidebar` + `SidebarInset`
+ `SidebarRail`) already provides collapsed/expanded state, mobile sheet
behavior, drag-to-resize, and keyboard collapse handling out of the box.
We adopt those rather than rebuild them. The custom work concentrates on:

- the workspace switcher (header content),
- the user dropdown (footer content),
- the section grouping with mono kickers,
- the email-verification banner repositioning + new links,
- a small `useHotkey` hook for `[`,
- the composed primitive library that the next six parts will consume.

---

## Code Reuse Analysis

### Existing Components and Hooks to Leverage

| Component / Hook | Location | How to Use |
| ---------------- | -------- | ---------- |
| `useCurrentUser` | `@kizunu/api-client/identity/use-current-user` | Returns `{ user, memberships, activeWorkspaceId, isPending, refetch }` — drives the sidebar header and the user dropdown. |
| `useSwitchWorkspace` | `@kizunu/api-client/identity/use-switch-workspace` | Already invalidates the `currentUser` query on success. Wire to the workspace popover. |
| `useLogout` | `@kizunu/api-client/identity/use-logout` | Existing sign-out call. Bind to the user dropdown's Sign out item. |
| `useResendEmailVerification` | `@kizunu/api-client/identity/use-resend-email-verification` | Already consumed by `email-verification-banner.tsx`. Unchanged here. |
| `ThemeProvider` | `apps/web/src/_shell/providers/theme-provider.tsx` | Already wired in `__root.tsx` with `attribute="class"` + `defaultTheme="system"`. The user dropdown calls `useTheme().setTheme(...)`. |
| `Button` | `apps/web/src/components/primitives/button.tsx` | Used inside the user dropdown trigger, banner buttons, empty states. Existing variants suffice. |
| `Table` | `apps/web/src/components/primitives/table.tsx` | Foundation for the `DataTable` composed primitive. |
| `Card` | `apps/web/src/components/primitives/card.tsx` | Used by `SettingsRow` (as a row inside a card per DESIGN.md — never card-of-cards). |
| `Sonner` toaster | `apps/web/src/components/primitives/sonner.tsx` (already mounted in `__root.tsx`) | Workspace switch errors call `toast.error(getApiErrorMessage(error))`. |
| `getApiErrorMessage` | `@kizunu/api-client` helpers (already used by existing screens) | Translates `ApiError` to a string. |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| TanStack Router | `Link` + `useMatchRoute` for active state; `useNavigate` for sign-out redirect. Routes referenced match today's file-based tree (`/workspace`, `/workspace/members`, etc.). |
| TanStack Query | `useSwitchWorkspace` already invalidates `[QueryKeys.currentUser]` on success — sidebar re-renders with the new active workspace. |
| `next-themes` | `useTheme()` consumed inside the user dropdown; provider already present. |
| `localStorage` | Sidebar collapsed state (`kizunu.sidebar.collapsed`) and width (`kizunu.sidebar.width`) persist across sessions. Read on mount, write on change. |

### Concerns Mitigated

- **Email verification banner regression** — the banner ships today (feature
  023) and renders above content; moving it must not break the existing
  `useResendEmailVerification` flow. Mitigation: keep the component, change
  its placement and add links only; no logic edits.
- **No bespoke fetch wrappers in `apps/web`** (convention) — every data
  source is an existing `@kizunu/api-client` hook.
- **Active-route detection on TanStack Router** — use the framework's own
  matchers (`useMatchRoute`) rather than parsing `window.location`, so
  nested routes behave correctly.

---

## Components

### `AppShell`

- **Purpose**: Top-level shell rendered by the `_app` protected layout; owns
  the sidebar provider context and lays out sidebar + inset + banner +
  outlet.
- **Location**: `apps/web/src/features/app-shell/components/app-shell.tsx`
  (replaces the current file).
- **Interfaces**:
  - `<AppShell userName={user.name} />` — keeps the existing single prop so
    `_app/route.tsx` does not change.
- **Dependencies**: `SidebarProvider`, `AppSidebar`, `TopBar`,
  `EmailVerificationBanner`, `Outlet`.
- **Reuses**: existing protected-route plumbing.

### `AppSidebar`

- **Purpose**: The sidebar itself — header (workspace switcher), grouped
  navigation, footer (user dropdown), drag rail.
- **Location**: `apps/web/src/features/app-shell/components/app-sidebar.tsx`.
- **Interfaces**:
  - Internal — reads `useCurrentUser`, `useMatchRoute`, theme, hotkey state.
- **Dependencies**: shadcn `Sidebar`, `SidebarHeader`, `SidebarContent`,
  `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`,
  `SidebarGroup`, `SidebarGroupLabel`, `SidebarRail`.
- **Reuses**: `WorkspaceSwitcher`, `NavGroup`, `UserDropdown`,
  `NAV_GROUPS` data, phosphor icons (`@phosphor-icons/react`).

### `WorkspaceSwitcher`

- **Purpose**: Active-workspace pill + popover listing every membership.
- **Location**: `apps/web/src/features/app-shell/components/workspace-switcher.tsx`.
- **Interfaces**:
  - Internal — reads `useCurrentUser` (`memberships`, `activeWorkspaceId`),
    calls `useSwitchWorkspace.mutate({ workspaceId })`.
- **Dependencies**: shadcn `Popover`, `Button`, phosphor `CaretUpDown` icon.
- **Reuses**: `getApiErrorMessage` for toast on error.
- **Behavior**:
  - Single membership → render the workspace name plainly with no chevron,
    no popover trigger.
  - Multiple memberships → render `[active workspace name] CaretUpDown`;
    popover lists every membership with a check next to the active one.
  - On select → mutate; success navigates to `/workspace`; error toasts.

### `UserDropdown`

- **Purpose**: Sidebar footer dropdown — profile link, theme sub-menu, sign
  out.
- **Location**: `apps/web/src/features/app-shell/components/user-dropdown.tsx`.
- **Interfaces**:
  - Internal — reads `useCurrentUser` (user name + email), `useTheme`,
    `useLogout`, `useNavigate`.
- **Dependencies**: shadcn `DropdownMenu`, `DropdownMenuTrigger`,
  `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSub`,
  `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuLabel`,
  `DropdownMenuSeparator`, phosphor `CaretRight`, `Sun`, `Moon`, `Monitor`,
  `SignOut` icons.
- **Behavior**:
  - Items: Profile (`Link to="/settings/profile"`), Theme submenu (Light /
    Dark / System with a check next to the active value), Sign out.
  - Sign out → `logout.mutate(undefined, { onSuccess: () => navigate({ to: '/auth/login' }) })` — preserves today's behavior verbatim.

### `NavGroup` and `NavItem`

- **Purpose**: Render one section (kicker label + list of items). Each item
  is a Link with active state, icon, optional tooltip when sidebar is
  collapsed.
- **Location**: `apps/web/src/features/app-shell/components/nav-group.tsx`,
  `apps/web/src/features/app-shell/components/nav-item.tsx`.
- **Interfaces**:
  - `<NavGroup label={kicker} items={NavGroupItem[]} />`
  - `<NavItem to={path} label={label} icon={IconComponent} />`
- **Dependencies**: shadcn `SidebarMenu`, `SidebarMenuItem`,
  `SidebarMenuButton`, `useMatchRoute`, `TooltipOnHover` (the new composed
  primitive).
- **Behavior**:
  - Active when `useMatchRoute({ to, fuzzy: true })` returns truthy.
  - Collapsed sidebar → label hidden, `TooltipOnHover` wraps the icon with
    the label as the tooltip body and `[` as the shortcut hint (single shared
    hint at sidebar level, not per item).

### `TopBar`

- **Purpose**: Thin contextual bar above content; renders the current page
  title and an actions slot. v0.1 of this Part renders a minimal header
  with the workspace name on small screens (so the workspace switcher
  remains reachable when the sidebar collapses to a sheet) and an empty
  slot otherwise. Per-route titles get wired up in later parts via a
  `TopBarSlot` context exposed here.
- **Location**: `apps/web/src/features/app-shell/components/top-bar.tsx`.
- **Interfaces**:
  - Internal — reads sidebar context (collapsed/mobile) and a future
    `TopBarSlot` context (exposed but unused this part).
- **Dependencies**: shadcn `SidebarTrigger` (provides the mobile sheet
  open button), the existing `FullWidthBorder` primitive for the bottom
  dashed rule (DESIGN.md §3.1).
- **Behavior**: 56px tall; bottom border is a `FullWidthBorder`; no logo
  or top-level brand (the brand lives in the sidebar header).

### `EmailVerificationBanner` (modified, not replaced)

- **Purpose**: Same as today — surface the unverified state with a resend
  action, plus the two new spec links.
- **Location**: `apps/web/src/features/identity/components/email-verification-banner.tsx`
  (existing file; edited).
- **Interfaces**: unchanged (no props).
- **Behavior delta**:
  - Render order: caller (`AppShell`) places it as the **first child of
    the content column**, not above the top bar — so it scrolls with
    content (SHELL-17).
  - Body adds two `Link` items: `/auth/verify-email` ("Open verify page")
    and `/settings/profile` ("Change email") — both rendered via
    `Link` from TanStack Router so they integrate with the router (SHELL-17).
  - Remains non-dismissible (SHELL-18) — no close button.

### `NAV_GROUPS` (data)

- **Purpose**: Single source of truth for sidebar grouping. Static array
  consumed by `AppSidebar`.
- **Location**: `apps/web/src/features/app-shell/data/nav-groups.ts`.
- **Shape** (one type per file per code-standards #11 — the `NavGroup` and
  `NavGroupItem` types each get their own file under
  `apps/web/src/features/app-shell/data/`):

```ts
// nav-group-item.ts
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

export interface NavGroupItem {
  to: string
  label: string
  icon: ComponentType<IconProps>
}
```

```ts
// nav-group.ts
import type { NavGroupItem } from './nav-group-item'

export interface NavGroup {
  label: string
  items: NavGroupItem[]
}
```

```ts
// nav-groups.ts
import { ChartLineUp, Lightning, Stack, UsersThree, Plugs,
         PlugsConnected, ShieldCheck, AddressBook } from '@phosphor-icons/react'

import type { NavGroup } from './nav-group'

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/workspace', label: 'Overview', icon: ChartLineUp },
      { to: '/workspace/journeys', label: 'Journeys', icon: Lightning },
      { to: '/workspace/cadences', label: 'Cadences', icon: Stack },
      { to: '/workspace/my-channels', label: 'My channels', icon: AddressBook },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/workspace/members', label: 'Members', icon: UsersThree },
      { to: '/workspace/channels', label: 'Channels', icon: Plugs },
      { to: '/workspace/connectors', label: 'Connectors', icon: PlugsConnected },
      { to: '/workspace/security', label: 'Security', icon: ShieldCheck },
    ],
  },
]
```

`Connect Meta Coex` (`/workspace/connect-meta-coex`) stays reachable from
within the Channels admin (existing buttons) and is intentionally **not**
a top-level nav item — it is a flow entered from the Channels page, not a
durable destination.

### Composed primitives library

All new composed primitives live under
`apps/web/src/components/composed/`, one file each, one type per file.

#### `page-header.tsx`

```ts
interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  actions?: ReactNode
}
```

- Renders an optional mono kicker (`text-kizunu-green text-xs font-mono
  font-medium`, bracketed string from DESIGN.md §4.2), the title
  (`text-lg font-medium`), optional description (`text-sm
  text-muted-foreground`), and an actions slot on the right.
- No card wrapper — sits flush at the top of the content column.

#### `empty-state.tsx`

```ts
interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}
```

- Centered flex column. Icon (optional) is a single phosphor icon at
  `size-6` with `text-muted-foreground`. Title `text-base font-medium`;
  description `text-sm text-muted-foreground max-w-md text-center`.
- Background: `bg-background-200` panel with `rounded-[2px]` and
  `border-border` — no shimmer, no nested cards.

#### `skeleton.tsx`

```ts
interface SkeletonProps {
  className?: string
}
```

- A single `<div>` with `bg-background-200 rounded-[2px]` and a
  `className` slot for sizing. **No animation**, no `animate-pulse`,
  no shimmer keyframe (DESIGN.md §7 ban).
- Override of the shadcn-installed `skeleton.tsx` — if shadcn ships one
  with an animation, we strip it during install.

#### `data-table.tsx`

```ts
interface DataTableColumn<Row> {
  key: string
  header: string
  cell: (row: Row) => ReactNode
  align?: 'left' | 'right'
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  isPending?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  rowKey: (row: Row) => string
}
```

- Header row uses `text-xs font-mono uppercase tracking-wide
  text-muted-foreground` per DESIGN.md §2 scale.
- Body uses the existing `Table` primitive.
- `isPending && rows.length === 0` → renders 3-5 `Skeleton` rows.
- `!isPending && rows.length === 0` → renders inline `EmptyState`.

#### `settings-row.tsx`

```ts
type SettingsRowVariant = 'default' | 'danger'

interface SettingsRowProps {
  title: string
  description?: string
  action?: ReactNode
  variant?: SettingsRowVariant
}
```

- Single horizontal row inside a parent card: title + description on the
  left, action on the right. Border-top on every row except the first
  (so a stack of rows reads as a list).
- `variant='danger'` swaps text color to `text-destructive` and adds a
  faint destructive-tinted border-top.

#### `settings-layout.tsx`

```ts
interface SettingsLayoutProps {
  navItems: { to: string; label: string }[]
  children: ReactNode
}
```

- Two-column grid. Left column: simple list of links rendered with active
  state (uses `useMatchRoute`). Right column: `children` (the active
  settings page). Width split: `grid-cols-[200px_1fr]` desktop;
  stack-vertical on mobile.
- Part 4 will assemble the concrete pages and pass them via routing; this
  Part ships only the wrapper.

#### `tooltip-on-hover.tsx`

```ts
interface TooltipOnHoverProps {
  label: string
  shortcut?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}
```

- Wraps a Radix `Tooltip` (from shadcn `tooltip` primitive). The tooltip
  body renders `label` plus, when `shortcut` is set, a trailing `<Kbd>`
  with the shortcut glyph.
- Default delay 700ms (`delayDuration` on the shadcn tooltip).

#### `kbd.tsx`

```ts
interface KbdProps {
  children: string
}
```

- Renders a single keystroke glyph in a small `--radius` rectangle.
- Class: `inline-flex h-5 min-w-5 items-center justify-center
  rounded-[2px] border border-border bg-background-200 font-mono
  text-[10px] text-muted-foreground px-1`.
- One-glyph payload — multi-key shortcuts render as multiple `<Kbd>`
  elements side by side (e.g. `g j` is two `<Kbd>` elements).

### `useHotkey` (hook)

- **Purpose**: Bind a single keystroke to a handler with the right
  guards.
- **Location**: `apps/web/src/hooks/use-hotkey.ts`.
- **Interface**:
  ```ts
  function useHotkey(key: string, handler: () => void, options?: {
    enabled?: boolean
  }): void
  ```
- **Behavior**:
  - Attaches a `keydown` listener on `document` in a `useEffect`,
    detaches on unmount.
  - Skips when `enabled === false`.
  - Skips when `event.target` is `HTMLInputElement`, `HTMLTextAreaElement`,
    or any element with `isContentEditable === true`.
  - Skips when there is any open Radix dialog / popover / sheet on the
    page: detect via `document.querySelector('[data-state="open"][role="dialog"]')` or `[role="menu"][data-state="open"]`. (Radix sets `data-state="open"` on the portaled content.)
  - Matches `event.key` exactly (case-sensitive). For `[`, the key
    string is `[`.

The hook is "fat" (multi-branch guards) and gets a dedicated unit test
under `apps/web/src/hooks/__test__/use-hotkey.spec.ts` (per
`generate-tests` thin/fat classification).

### Sidebar state context (small custom layer over shadcn)

- **Purpose**: Persist the shadcn sidebar's collapsed state and width to
  `localStorage` between sessions.
- **Location**: `apps/web/src/features/app-shell/components/sidebar-state-provider.tsx`.
- **Interface**:
  ```tsx
  <SidebarStateProvider>
    <SidebarProvider defaultOpen={readPersistedOpen()} ...>
      ...
    </SidebarProvider>
  </SidebarStateProvider>
  ```
- **Behavior**:
  - On mount, read `kizunu.sidebar.open` from `localStorage` and pass as
    `defaultOpen` to shadcn's `SidebarProvider`.
  - Subscribe to shadcn's `useSidebar()` hook's `open` value via a small
    `<SidebarPersist />` consumer rendered inside the provider; write to
    `localStorage` whenever `open` changes.
  - Width persistence: handled by the shadcn sidebar's own `--sidebar-width`
    CSS variable. We add an effect on `SidebarRail`'s drag end to read the
    rendered width and persist to `kizunu.sidebar.width`; on mount, set
    that variable via `style={{ '--sidebar-width': persistedWidth }}` on
    the `SidebarProvider`.

If the shadcn sidebar primitive's API does not expose width handlers, we
fall back to a simpler approach: skip the drag persistence for v0.1 of
this part (SHELL-22 / 23 are P3) and document the fallback in
`tasks.md`.

---

## Data Models (not applicable)

This is a UI-shell feature; no new backend data models. The shell consumes
`MeResponse` from `@kizunu/api-contracts/identity` as-is (already
defined).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| `useSwitchWorkspace` mutation errors | `toast.error(getApiErrorMessage(error))` in the mutation's `onError` callback. The popover stays open so the user can retry. | A toast appears; popover stays open; active workspace unchanged. |
| `useLogout` errors during sign-out | Sonner toast with the error message; do not navigate. | A toast appears; user remains signed in (preserves today's behavior, which is silent on error; we explicitly surface it now). |
| `useCurrentUser` returns `null` (signed out) | The `_app/route.tsx` `ProtectedLayout` already redirects to `/auth/login`. Shell never renders this state. | Standard sign-out redirect. |
| `useCurrentUser.isPending` on first render | Shell renders the structure with `Skeleton` placeholders in the workspace switcher label and the user dropdown trigger. | Layout stable, no content flash. |
| `localStorage` access throws (private mode, quota) | Wrap reads/writes in try/catch; on failure, fall back to the shadcn default (`open: true`, default width). No user-facing error. | Sidebar state simply does not persist between reloads. |
| Hotkey fires inside an open Radix dialog | Guard short-circuits; the dialog's own keyboard handling runs. | Hotkey is inert during overlays — expected behavior. |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Sidebar primitive base | shadcn `sidebar` (installed fresh) | Ships collapsed/expanded + mobile sheet + rail handle + keyboard support. Building from scratch would duplicate ~600 LOC of well-tested behavior. |
| Workspace switcher trigger | shadcn `Popover` (not `DropdownMenu`) | Popover is more flexible for arbitrary content (search input later, scrollable list). Dropdown is for short action lists; this is closer to a picker. |
| User dropdown trigger | shadcn `DropdownMenu` with sub-menu for theme | Theme is a single-select group inside an actions menu; `DropdownMenuSub` is the right shape. |
| Hotkey key value for `[` | `event.key === '['` | TanStack Router does not consume `[`; existing landing page does not bind it; no collision. |
| Mobile breakpoint | shadcn sidebar's default `md` (`768px`) | Matches the rest of the dashboard; no reason to diverge. |
| Persisted-state storage | `localStorage` (synchronous, no extra dependency) | A few small string keys; no need for `idb` or a state library. |
| Sidebar layout direction | Left-only | DESIGN.md anti-pattern §7: "No icon-only navigation in the dashboard sidebar." Combined with the brand-text-first posture, a single labelled left sidebar is the cleanest fit. |
| Banner placement | First child of the content column inside the inset | Scrolls with content (so it does not consume vertical space on every page when the user has scrolled past). Reading the existing banner shows it is presentational only; no observer hooks to break. |
| Composed primitives directory | `apps/web/src/components/composed/` (new) | Keeps shadcn-installed `primitives/` clean (per react.md §0 — shadcn installs land there, customized in place). Composed primitives are higher-level compositions and belong adjacent, not interleaved. |
| `[` ignored when inside any Radix `data-state="open"` overlay | Single guard, applies to popover/dropdown/sheet/dialog | One rule covers every Radix overlay primitive. Avoids per-overlay tracking. |

---

## Visual design notes (handed off to `impeccable` during Execute)

The Execute phase invokes the `impeccable` skill per screen / per
primitive to craft the visual treatment within the constraints below.
These constraints are non-negotiable; everything else is `impeccable`'s
discretion.

- All radii: `--radius` (2px) on rectangles; `rounded-md` only on
  `size-icon-small` buttons; circles only on avatars (DESIGN.md §1.3).
- Borders: dashed for section dividers (DESIGN.md §3.1
  `FullWidthBorder`); solid `border-border` for everything else. No solid
  1px section dividers (DESIGN.md §7).
- No drop shadows on any panel (DESIGN.md §7). The `--shadow-xs` allowed
  on command palette is Part 7's problem.
- No `bg-white` / `bg-black` / `bg-zinc-*` / raw hex — only the OKLCH spine
  tokens (DESIGN.md §1.1).
- Accent (`text-kizunu-green`) only in the mono kicker, status dots, and
  the ASCII aurora — three places, never four (DESIGN.md §1.4). Sidebar
  active state uses neutral `--background-300`, not the green accent.
- Mono font (`font-mono`) on every kicker label, every timestamp, every
  metadata string, every count, every `Kbd` glyph (DESIGN.md §2).
- Skeleton fills use `bg-background-200` (DESIGN.md §7 — no shimmer).
- Motion: opacity + transform only, 150ms state changes / 250ms entering
  panels, ease-out-quart/quint (DESIGN.md §5).

`impeccable` decides the workspace switcher's exact pill treatment, the
user dropdown's layout (avatar + name + caret arrangement), the empty
state's icon placement and copy hierarchy, the topbar's left/right
padding rhythm, and the section kicker's spacing within the sidebar.

---

## Test Strategy Hooks

Filled in during the Tasks phase, executed per task by the
`generate-tests` skill. High-level classification:

| Surface | Class | Coverage |
| ------- | ----- | -------- |
| `useHotkey` | Fat (guards: target type, popover state, `enabled` flag) | Dedicated unit tests via `@testing-library/react` + `userEvent`. |
| `WorkspaceSwitcher` | Thin (passes through to `useSwitchWorkspace`) | No dedicated test; covered by a smoke test if at all (e.g. renders the active workspace name). |
| `UserDropdown` | Thin (composes `useLogout` + `useTheme` + `useNavigate`) | No dedicated test. |
| Composed primitives | Thin (presentational; props in → JSX out) | No dedicated tests. Verified visually + by their consumers in later parts. |
| `EmailVerificationBanner` (edit) | Thin (presentational) | Existing surface unchanged; no new test required by the edit. |
| `AppShell` | Thin (composes shadcn `SidebarProvider` + children) | No dedicated test; smoke render covered by booting the app under `bun check`. |

---

## Migration / Rollout

- Single PR. No feature flag. The shell is a single 53-line file behind
  the protected layout — full replacement is safe.
- Verification (manual + visual via `impeccable` during Execute): boot
  the dev server, sign in, confirm every existing protected route
  renders inside the new shell:
  - `/workspace`
  - `/workspace/members`
  - `/workspace/channels`
  - `/workspace/connectors`
  - `/workspace/cadences`
  - `/workspace/journeys`
  - `/workspace/my-channels`
  - `/workspace/connect-meta-coex`
  - `/workspace/security`
- Confirm the email-verification banner appears for an unverified user
  and the two new links route correctly.
- Confirm `[` toggles the sidebar from any route.
- Confirm sign-out routes to `/auth/login` and theme flip works.

The PR opens against `master`, CI must be green, the branch
squash-merges autonomously per AGENTS.md flow step 11.
