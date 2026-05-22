# Tech Stack

**Analyzed:** 2026-05-22

## Core

- Monorepo: Bun workspaces (`apps/*`, `packages/*`), shared dependency catalog in root `package.json`
- Language: TypeScript 5.9 (catalog-pinned), ESM (`"type": "module"`) throughout
- Runtime: Bun `1.3.13+` / Node.js `22+` (per `AGENTS.md`)
- Package manager: Bun

## Frontend (`apps/web`)

- UI framework: React 19 + TanStack Router 1.132 (file-based routes, `routeTree.gen.ts`)
- Data fetching: TanStack Query 5
- Styling: Tailwind CSS v4 (`@tailwindcss/vite`), `base-ui` + `shadcn` components, `class-variance-authority`, `tailwind-merge`, `next-themes`, Phosphor icons, `sonner` toasts
- Forms: react-hook-form + `@hookform/resolvers` (zod)
- Build/dev: Vite via `vite-plus` (`vp dev|build|preview`)

## Backend (`apps/api`)

- API style: REST over NestJS 11 (`@nestjs/platform-express`); `cookie-parser` for session cookies
- Validation: Zod v4 (catalog) + `nestjs-zod` (`createZodDto`, global `ZodValidationPipe`)
- Database: Drizzle ORM 0.45 over `pg` (node-postgres `Pool`); PostgreSQL; migrations via `drizzle-kit`
- Auth: home-grown — opaque session tokens (hashed) in a `sessions` table, argon2id via `Bun.password`, global `AuthGuard`. No external auth library (see `docs/adr/README.md` for the decision index and PROJECT.md).
- Build: `nest build --builder swc` (`@swc/core`)

## Shared packages

- `@kizunu/api-contracts` — zod request/response schemas + the `Routes` table shared by API and web (the API-first contract layer)
- `@kizunu/api-client` — typed browser client (fetch core + `ApiError`, per-domain `*.api.ts`, TanStack Query `use-*.ts` hooks); consumed by `apps/web`
- `@kizunu/config-module` — thin wrapper over `@nestjs/config` with typed `ConfigService`
- `@kizunu/nestjs-shared` — `DrizzleService`, `PersistenceModule`, `ApplicationException` + global filter, decorators (`@CurrentUser`, `@Public`), schema `defaults()`, compile-time `Assert`/`Equal` type guards

## Testing

- Runner: Vitest via `vite-plus/test` (three projects: `unit`, `integration`, `e2e`)
- E2E: `supertest` against an in-process Nest app
- Coverage: `@vitest/coverage-v8`
- See `TESTING.md` for the full matrix and gate commands.

## Development Tools

- Lint + format: `vite-plus` (`vp lint`/`vp fmt` — oxlint-based, type-aware) + `.oxlintrc.json`; config in root `vite.config.ts`
- Custom convention gates (`scripts/`): import depth, zod v4, drizzle naming, drizzle checksum verify
- Git hooks: `simple-git-hooks` (pre-commit + commitlint), Conventional Commits
- DB lifecycle: `scripts/db.ts` (`db:up`, `db:setup`, `db:test:setup`, etc.) via Docker Compose (`deploy/`)
- Full local gate: `bun check` → `scripts/check.sh`
