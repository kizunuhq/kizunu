# 042 — Web Feature Colocation Migration Design

The migration is mechanical: move every file, rewrite every import. The
*judgment* is "which target home" per source file, which Design fixes once
so Execute can be a script.

## Target homes per source feature

### 1. `features/app-shell/` → `apps/web/src/_shell/app-shell/`

The app shell wraps every `_app/*` route; it is not a route-owned feature.
`_shell/` already exists for providers; app-shell joins it.

| Source | Target |
| ------ | ------ |
| `features/app-shell/components/app-shell.tsx` | `_shell/app-shell/app-shell.tsx` |
| `features/app-shell/components/app-sidebar.tsx` | `_shell/app-shell/app-sidebar.tsx` |
| `features/app-shell/components/nav-group.tsx` | `_shell/app-shell/nav-group.tsx` |
| `features/app-shell/components/nav-item.tsx` | `_shell/app-shell/nav-item.tsx` |
| `features/app-shell/components/sidebar-state-provider.tsx` | `_shell/app-shell/sidebar-state-provider.tsx` |
| `features/app-shell/components/top-bar.tsx` | `_shell/app-shell/top-bar.tsx` |
| `features/app-shell/components/user-dropdown.tsx` | `_shell/app-shell/user-dropdown.tsx` |
| `features/app-shell/components/workspace-switcher.tsx` | `_shell/app-shell/workspace-switcher.tsx` |
| `features/app-shell/data/*` | `_shell/app-shell/data/*` |

### 2. `features/marketing/` → `apps/web/src/routes/-marketing/`

Consumed by the public `routes/index.tsx`. TanStack ignores `-`-prefixed
folders, so the components are addressable but the folder doesn't create
a route.

| Source | Target |
| ------ | ------ |
| `features/marketing/components/kizunu-landing-page.tsx` | `routes/-marketing/kizunu-landing-page.tsx` |
| `features/marketing/components/kizunu-mark.tsx` | `routes/-marketing/kizunu-mark.tsx` |

Note: `features/marketing/styles/landing-page.css` (if present) moves to
`routes/-marketing/landing-page.css`.

### 3. `features/command/` → `apps/web/src/_shell/command/`

Mounted globally in the shell, not on a route.

| Source | Target |
| ------ | ------ |
| `features/command/components/command-palette.tsx` | `_shell/command/command-palette.tsx` |
| `features/command/components/shortcuts-modal.tsx` | `_shell/command/shortcuts-modal.tsx` |
| `features/command/data/command-items.ts` | `_shell/command/data/command-items.ts` |

### 4. `features/dashboard/` → `routes/_app/workspace/-components/dashboard/`

Dashboard IS the workspace landing page (`/workspace/index.tsx`).

| Source | Target |
| ------ | ------ |
| `features/dashboard/components/dashboard-home.tsx` | `routes/_app/workspace/-components/dashboard/dashboard-home.tsx` |
| `features/dashboard/components/first-run-checklist.tsx` | same dir |
| `features/dashboard/components/kpi-grid.tsx` | same dir |
| `features/dashboard/components/recent-journeys-card.tsx` | same dir |

### 5. `features/engine/` → `routes/_app/workspace/-components/`

`journeys-view.tsx` backs `workspace/journeys.tsx`. `journey-status-dot.tsx`
is consumed by both `journeys-view.tsx` AND `recent-journeys-card.tsx`
(dashboard), so it lives at the `workspace/-components/` level (the
nearest common ancestor of both consumers).

| Source | Target |
| ------ | ------ |
| `features/engine/components/journeys-view.tsx` | `routes/_app/workspace/-components/journeys-view.tsx` |
| `features/engine/components/journey-status-dot.tsx` | `routes/_app/workspace/-components/journey-status-dot.tsx` |

### 6. `features/cadence/` → `routes/_app/workspace/-components/cadences/` (+ `-utils/`)

| Source | Target |
| ------ | ------ |
| `features/cadence/components/*` (7 files) | `routes/_app/workspace/-components/cadences/<same>` |
| `features/cadence/lib/build-cadence-request.ts` | `routes/_app/workspace/-utils/build-cadence-request.ts` |
| `features/cadence/lib/__test__/build-cadence-request.spec.ts` | `routes/_app/workspace/-utils/__test__/build-cadence-request.spec.ts` |

### 7. `features/channel/` → split

Channels surface fans out into three route folders. Per the rule,
per-route split is correct.

| Source | Target |
| ------ | ------ |
| `features/channel/components/channels-manager.tsx` | `routes/_app/settings/-components/channels/channels-manager.tsx` |
| `features/channel/components/channel-account-form.tsx` | same dir |
| `features/channel/components/channel-accounts-table.tsx` | same dir |
| `features/channel/components/credential-fields-input.tsx` | same dir |
| `features/channel/components/grant-channel-access-form.tsx` | same dir |
| `features/channel/components/__test__/channel-account-form.spec.tsx` | same dir + `__test__/` |
| `features/channel/components/__test__/credential-fields-input.spec.tsx` | same dir + `__test__/` |
| `features/channel/components/my-channels-table.tsx` | `routes/_app/workspace/-components/my-channels-table.tsx` |
| `features/channel/components/connect-meta-coex.tsx` | `routes/_app/workspace/-components/connect-meta-coex.tsx` |
| `features/channel/components/plugin-select.tsx` | **`components/composed/plugin-select.tsx`** (promoted — used by channel + cadence) |
| `features/channel/lib/has-required-credentials.ts` | `routes/_app/settings/-utils/has-required-credentials.ts` |
| `features/channel/lib/user-input-fields.ts` | `routes/_app/settings/-utils/user-input-fields.ts` |
| `features/channel/lib/__test__/*.spec.ts` | colocated in `-utils/__test__/` |

### 8. `features/crm/` → `routes/_app/settings/-components/connectors/`

Entirely consumed by `_app/settings/connectors.tsx`.

| Source | Target |
| ------ | ------ |
| `features/crm/components/*` (4 files) | `routes/_app/settings/-components/connectors/<same>` |

### 9. `features/identity/` → split

| Source | Target |
| ------ | ------ |
| `features/identity/components/login-form.tsx` | `routes/auth/-components/login-form.tsx` |
| `signup-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `oauth-buttons.tsx`, `oauth-separator.tsx`, `oauth-error-alert.tsx`, `registration-disabled-notice.tsx`, `accept-invite-panel.tsx`, `verify-email-panel.tsx`, `auth-branding-panel.tsx`, `labeled-input.tsx` | `routes/auth/-components/<same>` |
| `features/identity/components/__test__/reset-password-form.spec.tsx` | `routes/auth/-components/__test__/reset-password-form.spec.tsx` |
| `features/identity/components/sessions-manager.tsx` | `routes/_app/settings/-components/security/sessions-manager.tsx` |
| `sessions-table.tsx`, `session-row.tsx` | same dir |
| `features/identity/components/email-verification-banner.tsx` | **`_shell/app-shell/email-verification-banner.tsx`** (consumed by app-shell only) |
| `features/identity/lib/login-error-copy.ts`, `oauth-error-copy.ts` | `routes/auth/-utils/<same>` |

### 10. `features/workspace/` → `routes/_app/settings/-components/members/`

Entirely consumed by `_app/settings/members.tsx`.

| Source | Target |
| ------ | ------ |
| `features/workspace/components/invite-member-form.tsx` | `routes/_app/settings/-components/members/invite-member-form.tsx` |
| `members-manager.tsx`, `members-table.tsx`, `member-row.tsx` | same dir |

### Bonus: `apps/web/src/components/lookup-select.tsx` → `components/composed/lookup-select.tsx`

Already a composite; harmonize the location.

## Execution mechanics

1. `mkdir -p` every target directory.
2. `git mv` every file (preserves blame).
3. Use one `perl -i -pe` pass per import-path rewrite (or a single
   coordinated script) to update all 52 import sites.
4. `rm -r apps/web/src/features` once empty.
5. Restart the TanStack Router watcher (the dev server regenerates
   `routeTree.gen.ts`); for the CI gate the build step regenerates it.
6. `bun check`.
7. Chrome smoke (browser MCP): login, dashboard, cadences tab, journeys,
   settings → members / channels / connectors / security, command palette
   open/close.

## Risks

- `routeTree.gen.ts` regeneration may pick up new `-`-prefixed folders
  ambiguously. Mitigation: keep the dev server / router-vite-plugin
  running; if generation breaks, manually delete and let it rebuild.
- Promoted `PluginSelect` / `LookupSelect` change paths everywhere they
  import — but the rewrite is one perl substitution.
- `_shell/app-shell/` doesn't follow the route-file-tree pattern; it's a
  flat folder. Acceptable: `_shell/` is for shell-level non-route code,
  the same place where `providers/` already lives.
