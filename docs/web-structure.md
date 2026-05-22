# Web app structure

A tree-first map of `apps/web` (React 19 + TanStack Router/Query, Vite, Tailwind v4). Read the tree; each row explains itself. This is the human-readable companion to `.specs/codebase/STRUCTURE.md` (monorepo-wide) and the rules in `.specs/codebase/CONVENTIONS.md` + `.agents/rules/react.md`.

The shape in one line: **`routes/` is thin (URL wiring), `features/` holds the substance, the rest is shared infra.**

## The tree

```
apps/web/src/
├── main.tsx                # entry — ReactDOM mounts <App/> into #app
├── app.tsx                 # builds the QueryClient + router, renders RouterProvider
├── styles.css              # Tailwind v4 layer + design tokens
├── routeTree.gen.ts        # GENERATED from routes/ by the Vite plugin — lint/fmt-ignored, never hand-edit
│
├── routes/                 # file-based routing — THIN: a route maps a URL to a feature, holds little logic
│   ├── __root.tsx          # the one root route: provider stack (ThemeProvider) + <Outlet/> + <Toaster/>
│   ├── index.tsx           # "/" public landing — just renders features/marketing
│   ├── not-found.tsx       # 404 catch-all
│   ├── (auth)/             # route GROUP — shared layout, adds NO url segment
│   │   ├── route.tsx       #   AuthLayout: centered card around <Outlet/>
│   │   ├── login.tsx       #   /login
│   │   ├── signup.tsx      #   /signup
│   │   └── accept-invite.$token.tsx   # /accept-invite/$token — flat route; $token is a dynamic param
│   └── _app/               # PATHLESS layout (_ prefix) — auth gate, adds NO url segment
│       ├── route.tsx       #   ProtectedLayout: useCurrentUser(); redirects to /login when signed out
│       └── workspace/
│           ├── index.tsx   #   /workspace
│           └── members.tsx #   /workspace/members
│
├── features/               # feature-scoped code — the PRIMARY home for feature UI (lives outside routes/)
│   └── marketing/
│       ├── components/      #   components owned by this feature
│       │   ├── kizunu-landing-page.tsx
│       │   └── kizunu-mark.tsx
│       └── styles/          #   feature CSS for what Tailwind can't express (e.g. animation keyframes)
│           └── landing-page.css
│
├── components/             # components shared ACROSS features
│   ├── error-boundary.tsx  #   (currently the only shared component)
│   └── primitives/         #   design-system "ui" layer (shadcn over Base UI) — the ui alias; shadcn-installed baseline
│
├── hooks/                  # shared use-* UI hooks — alias target, not yet created
│
├── lib/                    # framework-light helpers
│   ├── utils.ts            #   cn() — clsx + tailwind-merge
│   └── get-api-error-message.ts
│
└── _shell/                 # app-shell infra (_ = not a route)
    └── providers/          #   app-wide context providers
        └── theme-provider.tsx
```

> Annotated against the current code. `components/primitives/` holds the shadcn-installed baseline (button, input, label, field, card, separator, sonner); `hooks/` is wired as an import alias but has no files yet — both are slots features grow into, not gaps.

## Route sigils

The `routes/` tree is governed by filename prefixes. This is the whole vocabulary:

| Token | Meaning | Here |
|---|---|---|
| `__root.tsx` | the single root route — providers + `<Outlet/>` | wraps everything in `ThemeProvider` |
| `route.tsx` | layout for its folder: renders `<Outlet/>`, can carry a guard | `_app` guards auth, `(auth)` centers the card |
| `index.tsx` | the page at the folder's exact path | `/`, `/workspace` |
| `_name/` | **pathless** layout — wraps children, contributes no URL segment | `_app/` -> `/workspace`, not `/_app/workspace` |
| `(name)/` | **route group** — shared layout, no URL segment | `(auth)/` -> `/login` |
| `$param` | dynamic path segment (camelCase) | `accept-invite.$token.tsx` -> `/accept-invite/:token` |
| `a.b.tsx` | dot = path separator (flat route) | `accept-invite.$token` is one nested path in one file |
| `*.gen.ts` | generated, lint/fmt-ignored | `routeTree.gen.ts` |
| `-name` | **excluded from routing** — TanStack ignores any `-`-prefixed file/folder | available as an escape hatch; kizunu routes feature code through `features/` instead, so it is not used today |

## Layering: where a component goes

Promotion runs outward as reuse grows:

- **`features/<feature>/components/`** — default home. A component used by one feature lives with that feature.
- **`components/`** — promote here once a second feature needs it (cross-feature shared).
- **`components/primitives/`** — the generic `ui` layer (shadcn over Base UI): button, input, dialog. No domain knowledge. This is the `ui` alias.
- **`hooks/`** — shared `use-*` UI hooks (debounce, media-query). Feature-only hooks stay in the feature.
- **`lib/`** — pure, framework-light helpers (`cn`, error-message mapping).
- **`_shell/providers/`** — app-wide context providers mounted in `__root.tsx`.

Data access is **not** in this app. Per-action TanStack Query hooks live in the `@kizunu/api-client` package and the web consumes them (e.g. `useCurrentUser` from `@kizunu/api-client/identity/use-current-user`); request/response types come from `@kizunu/api-contracts`.

## Naming and imports

From `.specs/codebase/CONVENTIONS.md` and `.agents/rules/react.md`:

- **Files:** kebab-case, one type per file (`kizunu-landing-page.tsx`, `use-session.ts`). Role suffix where there is one.
- **Components:** functional `.tsx` only; explicit `XxxProps` interface; pass props by name, never spread; Tailwind utility classes (sorted via `cn`); `use`-prefixed hooks; keep under ~50 lines (extract children/hooks past that).
- **Imports:** auto-sorted — external and `@kizunu/*` first, then relative; `import type` for type-only.
- **Alias vs relative:** use the `@kizunu/web/*` alias the moment a relative path would need `../../`. Two-or-more `../` fails `scripts/check-import-depth.ts`. A single `./` or `../` is fine — which is why `routes/index.tsx` imports `../features/marketing/...` directly.
- **Format:** no semicolons, single quotes, sorted imports and Tailwind classes. No emojis in code, commits, or docs.

## Where things live

| Adding... | Put it in... |
|---|---|
| A page / URL | `routes/**` — a thin `index.tsx` or `<name>.tsx` (add `route.tsx` for a section layout or guard) |
| The actual UI behind a page | `features/<feature>/components/` |
| Feature-only CSS (keyframes, etc.) | `features/<feature>/styles/` |
| A component shared across features | `components/` (or `components/primitives/` for a generic UI primitive) |
| A reusable UI hook | `hooks/use-*.ts` |
| A pure helper | `lib/` |
| An app-wide provider/context | `_shell/providers/` (and mount it in `routes/__root.tsx`) |
| Server data (query/mutation) | not here — consume a `use-*` hook from `@kizunu/api-client` |
