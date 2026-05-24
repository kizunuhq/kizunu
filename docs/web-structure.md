# Web app structure

A tree-first map of `apps/web` (React 19 + TanStack Router/Query, Vite, Tailwind v4). Read the tree; each row explains itself. This is the human-readable companion to `.specs/codebase/STRUCTURE.md` (monorepo-wide) and the rules in `.agents/rules/react.md` + `.agents/rules/web-patterns.md`. The load-bearing decisions about layering are recorded in [ADR-007](./adr/007-web-frontend-layering.md).

**The shape in one line:** a feature lives **under its route folder** — `routes/_app/<feature>/` with `-components/`, `-hooks/`, `-utils/`, `-dialogs/` alongside the `index.tsx` / `new.tsx` / `$id.tsx` route files. Cross-feature pieces graduate into `components/composed/`; shadcn primitives stay in `components/primitives/`.

## The tree

```
apps/web/src/
├── main.tsx                # entry — ReactDOM mounts <App/> into #app
├── app.tsx                 # builds the QueryClient + router, renders RouterProvider
├── styles.css              # Tailwind v4 layer + design tokens
├── routeTree.gen.ts        # GENERATED from routes/ by the Vite plugin — lint/fmt-ignored, never hand-edit
│
├── routes/                 # file-based routing — feature code is COLOCATED here under -prefixed folders
│   ├── __root.tsx          # root route: provider stack + <Outlet/> + <Toaster/>
│   ├── index.tsx           # "/" public landing
│   ├── not-found.tsx       # 404 catch-all
│   ├── auth/               # public auth surface (login, signup, password reset, etc.)
│   └── _app/               # pathless layout — auth gate; adds no URL segment
│       ├── route.tsx       #   ProtectedLayout: useCurrentUser(); redirects to /login when signed out
│       ├── <feature>/      #   one folder per feature
│       │   ├── index.tsx   #     list / landing route
│       │   ├── new.tsx     #     create route (when applicable)
│       │   ├── $<id>.tsx   #     detail / edit route (when applicable)
│       │   ├── -components/  #   JSX exclusive to this feature
│       │   ├── -hooks/       #   feature-local hooks (URL state, etc.)
│       │   ├── -utils/       #   pure helpers (column defs, formatters)
│       │   └── -dialogs/     #   feature-local dialog wrappers (optional)
│       ├── settings/       #   settings hub — sub-routes per section
│       └── workspace/      #   workspace pages — dashboard, cadences, journeys, channels
│
├── components/             # SHARED across two or more features
│   ├── composed/           #   higher-level composites built on primitives
│   │   ├── page-header.tsx        #   { title, description, kicker, actions }
│   │   ├── empty-state.tsx        #   { title, description, icon, action }
│   │   ├── data-table.tsx         #   { columns, rows, isPending, rowKey, onRowClick?, footer?, ... }
│   │   ├── table-pagination.tsx   #   pagination footer for DataTable
│   │   ├── resource-dialog.tsx    #   standard dialog chrome (header + scroll body + footer)
│   │   ├── delete-resource-dialog.tsx  # typed-name destructive confirmation
│   │   ├── form-error.tsx         #   alert-styled form-level error
│   │   ├── settings-layout.tsx    #   settings nav + content shell
│   │   ├── settings-row.tsx       #   2-column label|control row for settings
│   │   ├── kpi-tile.tsx           #   dashboard KPI card
│   │   ├── kbd.tsx                #   keyboard-shortcut chip
│   │   └── tooltip-on-hover.tsx
│   ├── primitives/         #   shadcn-installed UI primitives (the `ui` alias; base-nova style)
│   │   └── { button, input, label, field, dialog, table, tabs, dropdown-menu, sidebar, sonner, ... }
│   ├── error-boundary.tsx  #   route-level error boundary
│   └── lookup-select.tsx
│
├── features/               # LEGACY — deprecated for new work (see ADR-007); converts opportunistically
│   ├── app-shell/          #   app shell (sidebar, topbar) + its nav data — the one folder that stays here
│   └── { cadence, channel, command, crm, dashboard, engine, identity, marketing, workspace }/
│
├── hooks/                  # shared use-* UI hooks (debounce, hotkey, mobile detection)
├── lib/                    # framework-light helpers (cn, get-api-error-message, parse-json-object)
└── _shell/providers/       # app-wide context providers mounted in __root.tsx
```

> The tree mixes the new route-colocated layout (under `_app/<feature>/`) and the legacy `features/<feature>/` folder; both are tolerated during the opportunistic migration. The app shell's nav data lives under `features/app-shell/` and stays there until its own future migration — every other feature converts the next time it is meaningfully worked on.

## Route sigils

The `routes/` tree is governed by filename prefixes. This is the whole vocabulary:

| Token | Meaning | Here |
|---|---|---|
| `__root.tsx` | the single root route — providers + `<Outlet/>` | wraps everything in `ThemeProvider` |
| `route.tsx` | layout for its folder: renders `<Outlet/>`, can carry a guard | `_app` guards auth |
| `index.tsx` | the page at the folder's exact path | `/_app/workspace/cadences`'s landing |
| `_name/` | **pathless** layout — wraps children, contributes no URL segment | `_app/` → `/workspace`, not `/_app/workspace` |
| `(name)/` | **route group** — shared layout, no URL segment | not currently in use |
| `$param` | dynamic path segment (camelCase) | `accept-invite.$token.tsx` → `/accept-invite/:token` |
| `a.b.tsx` | dot = path separator (flat route) | `accept-invite.$token` is one nested path in one file |
| `*.gen.ts` | generated, lint/fmt-ignored | `routeTree.gen.ts` |
| `-name` | **excluded from routing** — TanStack ignores any `-`-prefixed file/folder | `-components/`, `-hooks/`, `-utils/`, `-dialogs/` |

## Where a piece of UI lives

Promotion runs outward as reuse grows:

- **`routes/_app/<feature>/-components/`** — default home. A component used by one feature lives with that feature, alongside the routes that consume it.
- **`components/composed/`** — promote here once a *second* feature needs it. These are the cross-feature composites the rule references (`PageHeader`, `EmptyState`, `DataTable`, `ResourceDialog`, ...).
- **`components/primitives/`** — generic `ui` layer (shadcn base-nova over Base UI). No domain knowledge. The `ui` alias. Installed via the `shadcn` skill.
- **`hooks/`** — shared `use-*` UI hooks. Feature-only hooks stay in the feature's `-hooks/`.
- **`lib/`** — pure, framework-light helpers (`cn`, error-message mapping).
- **`_shell/providers/`** — app-wide context providers mounted in `__root.tsx`.

Data access is **not** in this app. Per-action TanStack Query hooks live in `@kizunu/api-client` and the web consumes them (e.g. `useCurrentUser` from `@kizunu/api-client/identity/use-current-user`); request/response types come from `@kizunu/api-contracts`. Hook shape and invalidation contracts are in `.agents/rules/web-patterns.md` §8.

## Naming and imports

From `.specs/codebase/CONVENTIONS.md`, `.agents/rules/react.md`, `.agents/rules/web-patterns.md`:

- **Files:** kebab-case, one type per file (`instrument-form.tsx`, `use-instruments-search.ts`). Role suffix where there is one.
- **Components:** functional `.tsx` only; explicit `XxxProps` interface; pass props by name, never spread; Tailwind utility classes (sorted via `cn`); `use`-prefixed hooks; keep under ~50 lines (extract children/hooks past that).
- **Imports:** auto-sorted — external and `@kizunu/*` first, then relative; `import type` for type-only.
- **Alias vs relative:** use the `@kizunu/web/*` alias the moment a relative path would need `../../`. Two-or-more `../` fails `scripts/check-import-depth.ts`. A single `./` or `../` is fine — colocated route folders use relative imports for their own `-components/-hooks/-utils/`.
- **Format:** no semicolons, single quotes, sorted imports and Tailwind classes. No emojis in code, commits, or docs.

## Where things live

| Adding... | Put it in... |
|---|---|
| A new page / URL | `routes/_app/<feature>/<name>.tsx` (or `index.tsx`) |
| The UI that page renders (feature-only) | `routes/_app/<feature>/-components/` |
| A feature-local hook (URL state, derived data) | `routes/_app/<feature>/-hooks/` |
| Feature-local helpers (column defs, formatters) | `routes/_app/<feature>/-utils/` |
| A feature-local dialog wrapper | `routes/_app/<feature>/-dialogs/` |
| A composite shared across two or more features | `components/composed/` |
| A generic UI primitive | `components/primitives/` (install via the `shadcn` skill) |
| A reusable UI hook | `hooks/use-*.ts` |
| A pure helper | `lib/` |
| An app-wide provider/context | `_shell/providers/` (and mount it in `routes/__root.tsx`) |
| Server data (query/mutation) | not here — consume a `use-*` hook from `@kizunu/api-client` |
| API contracts (request/response schemas + Routes) | `packages/api-contracts/src/<bc>/<feature>.contract.ts` |
