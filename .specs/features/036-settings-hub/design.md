# Settings Hub Design

**Spec**: `.specs/features/036-settings-hub/spec.md`

---

## Architecture

```
routes/_app/settings/route.tsx (NEW — SettingsLayout shell)
├── profile.tsx (NEW)
├── workspace.tsx (NEW)
├── billing.tsx (NEW placeholder)
├── members.tsx (MOVED from /_app/workspace/members.tsx)
├── channels.tsx (MOVED)
├── connectors.tsx (MOVED)
└── security.tsx (MOVED)
```

The `route.tsx` renders `SettingsLayout` (from Part 1) with a static `SETTINGS_NAV_ITEMS` array, then `<Outlet />` in the right column. Each sub-page renders a `PageHeader` + the existing manager component.

`NAV_GROUPS` updates:
- Operations: Overview, Journeys, Cadences, My channels (unchanged)
- Workspace: Settings (`/settings/profile`)

The "Workspace" sidebar group now has a single item. To preserve visual rhythm, the sidebar collapses the group kicker label to "Manage" or "Workspace" with just the Settings link.

---

## Components

### `SettingsRouteLayout` (the route's component)

- **Location**: `apps/web/src/routes/_app/settings/route.tsx`
- **Renders**: `<SettingsLayout navItems={SETTINGS_NAV_ITEMS}><Outlet /></SettingsLayout>`
- **Data**: static `SETTINGS_NAV_ITEMS` array (7 items).

### `ProfilePage`

- **Location**: `apps/web/src/routes/_app/settings/profile.tsx`
- **Renders**: `PageHeader` ("Profile") + a `Card` containing two `SettingsRow`s:
  - Email row: shows email + verified badge or "Verify" link
  - Password row: "Change password" → `/auth/forgot-password`
- **Data**: reads `useCurrentUser` for user.email and user.emailVerifiedAt.

### `WorkspaceSettingsPage`

- **Location**: `apps/web/src/routes/_app/settings/workspace.tsx`
- **Renders**: `PageHeader` ("Workspace") + `Card` with 3 rows:
  - Name row: displays workspace name
  - Slug row: displays mono slug
  - Role row: displays role + status
  - + a danger-variant `SettingsRow` ("Phase 2 placeholder").

### `BillingPage`

- **Location**: `apps/web/src/routes/_app/settings/billing.tsx`
- **Renders**: PageHeader ("Billing") + a card with placeholder copy + link to repo.

### Moved pages (members, channels, connectors, security)

- **Location**: `apps/web/src/routes/_app/settings/<name>.tsx`
- **Renders**: same as today's `/workspace/<name>.tsx` content, but the bespoke `<h1>` is replaced with `PageHeader`.

### Deletes

- `apps/web/src/routes/_app/workspace/members.tsx`
- `apps/web/src/routes/_app/workspace/channels.tsx`
- `apps/web/src/routes/_app/workspace/connectors.tsx`
- `apps/web/src/routes/_app/workspace/security.tsx`

### NAV_GROUPS update

`apps/web/src/features/app-shell/data/nav-groups.ts`:
- Remove the old Workspace group items (Members, Channels, Connectors, Security).
- Add a single item: `{ to: '/settings/profile', label: 'Settings', icon: Gear }` under a "Manage" group label.

---

## Reuse

- `SettingsLayout` (Part 1) — the structural layout
- `PageHeader` (Part 1) — page titles
- `Card`, `SettingsRow` (Parts 1) — settings rows
- `useCurrentUser` for profile + workspace data
- Existing managers (`MembersManager`, `ChannelsManager`, `ConnectorsManager`, `SessionsManager`) — unchanged

---

## Tests

All thin presentational; no dedicated tests.

---

## Migration / Rollout

- Single PR. Deep links to old `/workspace/{members, channels, ...}` paths will 404 since the route files are deleted.
- v0.1 has no real users; no compatibility redirects.
