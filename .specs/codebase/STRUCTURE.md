# Project Structure

**Root:** `/Users/nothing/Workspaces/kizunu`

## Directory Tree

```
kizunu/
├── apps/
│   ├── api/                      # NestJS 11 backend
│   │   ├── src/
│   │   │   ├── api.config.ts     # zod-validated env → Config
│   │   │   ├── api.module.ts     # root module (Config, Persistence, Identity, Workspace)
│   │   │   ├── main.ts           # bootstrap + runMigrations()
│   │   │   ├── db/schemas/       # Drizzle tables (users, sessions, memberships, workspaces, verification-tokens)
│   │   │   ├── modules/<m>/      # core/ http/ persistence/ per domain module
│   │   │   ├── shared/           # crypto (opaque-token), http (health.controller)
│   │   │   └── __test__/         # global-setup + integration/ + e2e/ harness
│   │   ├── drizzle/              # generated migrations + .checksums.json (immutable)
│   │   └── drizzle.config.ts
│   └── web/                      # React 19 SPA (TanStack Router/Query, Vite, Tailwind v4) — full map: docs/web-structure.md
│       └── src/
│           ├── routes/           # file-based routes ((auth), _app, index, not-found)
│           ├── features/         # feature-scoped code (marketing/…)
│           ├── components/         # shared UI; components/primitives/ = shadcn-installed (ui alias)
│           ├── hooks/ lib/ _shell/  # api-client, helpers, providers
│           └── routeTree.gen.ts  # generated (lint/fmt-ignored)
├── packages/
│   ├── api-contracts/            # shared zod request/response schemas + Routes table (identity, workspace)
│   ├── api-client/               # typed browser client: fetch core, ApiError, per-domain *.api.ts + use-*.ts hooks
│   ├── config-module/            # typed @nestjs/config wrapper
│   └── nestjs-shared/            # Drizzle service, exceptions+filter, decorators, type guards, schema defaults
├── scripts/                      # db lifecycle + convention gates + git hooks
├── docs/                         # vision, v0.1-scope, adr/ (README index + ADRs 001-005)
├── deploy/                       # Docker Compose (Postgres)
└── vite.config.ts                # lint/fmt/test/run config (vite-plus)
```

## Module Organization

### Backend domain modules

**Purpose:** One module per bounded context. **Location:** `apps/api/src/modules/<module>/`.
- `identity` — auth, sessions, current user; controllers `auth`; use cases register/authenticate/logout/get-me/switch-workspace.
- `workspace` — memberships and invitations; use cases invite-member/accept-invitation/update-member-status/list-members.
- `channel` — channel plugin port (`core/plugin/`: frozen `ChannelPlugin` contract + `ChannelPluginRegistry`), the `ChannelAccount`/`ChannelAccess` domain, and concrete plugins under `plugins/` (`meta-whatsapp/` = `MetaWhatsappPlugin`); use cases create-channel-account/list-workspace-channel-accounts/grant-channel-access/revoke-channel-access/set-primary-channel/list-my-channels/list-available-plugins.
Each splits into `core/` (use-cases, models, domain, errors, crypto), `http/` (controllers, guards, decorators), `persistence/` (repositories).

### Shared packages

**Purpose:** Cross-cutting infra and contracts. **Location:** `packages/`. Key files: `nestjs-shared` `DrizzleService`, `ApplicationException`+filter, `defaults()`; `api-contracts` per-domain `*.contract.ts`; `config-module` `ConfigService`.

## Where Things Live

**A backend feature (e.g. auth):**
- Contract: `packages/api-contracts/src/identity/*.contract.ts`
- HTTP edge: `apps/api/src/modules/identity/http/controllers/auth.controller.ts`
- Business logic: `apps/api/src/modules/identity/core/use-cases/*.use-case.ts`
- Data access: `apps/api/src/modules/identity/persistence/*.repository.ts`
- Tables: `apps/api/src/db/schemas/*.ts`
- Config: `apps/api/src/api.config.ts`

**A web feature:**
- UI/routes: `apps/web/src/routes/**`, `apps/web/src/features/<feature>/`
- Data access: `apps/web/src/lib/api-client.ts` + hooks (`apps/web/src/hooks/`)

## Special Directories

**`apps/api/drizzle/`** — generated migrations + checksum manifest; immutable, regenerate via `bun db:generate`.
**`__test__/`** — colocated tests; `unit/` next to source, plus app-level `integration/` and `e2e/` harnesses.
**`docs/adr/`** — Architecture Decision Records; `README.md` is the index. Immutable once Accepted.
**`scripts/`** — `db.ts` (DB lifecycle), convention gates, `hooks/pre-commit.ts`.
