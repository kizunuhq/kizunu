# Code Conventions

Conventions are codified in `.agents/rules/*.md` (code-standards, conventions, http, react, test) and enforced by `scripts/check-*.ts` + `vp lint`/`vp fmt` (config in `vite.config.ts`). What follows is what the actual code does.

## Naming Conventions

**Files:** kebab-case, with a role suffix describing the kind.
Examples: `authenticate.use-case.ts`, `auth.controller.ts`, `user.repository.ts`, `identity.errors.ts`, `login.contract.ts`, `password.helper.ts`, `auth.guard.ts`. Frontend: `use-session.ts`, `kizunu-landing-page.tsx`. One type per file (`.agents/rules/code-standards.md` §11).

**Functions/methods:** camelCase, verb-first (`execute`, `findByEmail`, `setSessionCookie`, `generateOpaqueToken`, `incrementFailedAttempts`).

**Variables:** camelCase (`activeWorkspaceId`, `sessionToken`, `tokenHash`). English only.

**Constants:** UPPER_SNAKE for module-level magic-number replacements (`MAX_FAILED_ATTEMPTS`, `LOCK_DURATION_MS`); no unexplained literals in logic.

**Classes/interfaces:** PascalCase (`AuthenticateUseCase`, `ApplicationException`, `AuthenticateInput`). Zod schemas: `PascalCaseSchema`; DTOs: `XxxDto extends createZodDto(XxxSchema)`. Drizzle enums: `xxxEnum` from `pgEnum`.

## Code Organization

**Imports:** auto-sorted (`sortImports: true`). Order seen: external/`@kizunu/*` packages first, then relative. `import type` used for type-only imports. Path aliases (`@kizunu/api/*`, `@kizunu/web/*`) instead of `../../..` (enforced by `scripts/check-import-depth.ts` — two-or-more `../` is a failure).

**File structure:** constants → input/output interfaces → the class. Repositories expose narrow async methods returning domain row types (`User`, `Session`).

## Type Safety

TypeScript strict ESM. Zod v4 **top-level formats only** — `z.email()`, `z.uuid()`, `z.iso.datetime()`, never `z.string().email()` (enforced by `scripts/check-zod-v4.ts`). Cross-layer contracts asserted at compile time with `Assert<Equal<...>>` from `@kizunu/nestjs-shared/lib/types/type-assert`. Boundary casts (`as unknown as T`) allowed only at typed-fetch and test-double seams (lint overrides in `vite.config.ts`).

## Drizzle Schema

Never declare column names — derived from field names via `casing: 'snake_case'` (enforced by `scripts/check-drizzle-schema-naming.ts`). Spread `defaults()` (UUIDv7 PK + `createdAt`/`updatedAt`) into every table. Migrations under `apps/api/drizzle/` are **immutable/generated** — edit schema then `bun db:generate`; a hand edit breaks `drizzle-checksums.ts verify`.

## Error Handling

Use cases throw `ApplicationException` subclasses with a dot-namespaced `code`, an HTTP status, and optional `context` (`identity.errors.ts`, `workspace.errors.ts`). Controllers throw Nest `UnauthorizedException` for missing session. The global filter renders `{ code, message, context }`. HTTP status conventions in `.agents/rules/http.md` (422 for business-rule errors, 500 for infra) — note identity errors currently use semantic codes (401/409/423).

## React (frontend, `apps/web`)

Codified in `.agents/rules/react.md`. Components are **functional** + TypeScript `.tsx` only — no class components (the error-boundary fallback is a function, `components/error-boundary.tsx`). Props typed explicitly via a `XxxProps` interface, passed by name rather than spread. State lives in the smallest component that reads it; lift only to share. Styling is **Tailwind utility classes** (sorted via `cn`/`clsx`/`cva`); inline `style` is reserved for values Tailwind cannot express (dynamic animation delays in `kizunu-landing-page.tsx`). Custom hooks are `use`-prefixed (`use-session.ts`). `useMemo` only for genuinely expensive derived work, not trivial expressions. Keep components focused and small (rule of thumb: under ~50 lines — extract children/hooks past that).

## Code Limits

Beyond naming, `.agents/rules/code-standards.md` sets structural limits the code follows: functions/methods under 30 lines (§10), at most three positional params before switching to an object input (§6), no more than two nested `if/else` — prefer guard clauses (§5), and prefer maps/strategy objects over `switch/case` (§7). These are style rules (not script-gated like the §1–4 conventions in `conventions.md`), surfaced by `vp lint`.

## Comments

Sparse; reserved for *why* not *what* (e.g. the constant-time-hash note in `AuthenticateUseCase`, the SWC/`import.meta.url` note in `main.ts`). No emojis in code, commits, or docs (`AGENTS.md`).

## Formatting

No semicolons, single quotes, `sortPackageJson`, sorted Tailwind classes (`cn`/`clsx`/`cva`). Markdown prose wraps always. Commits: Conventional Commits, enforced by commitlint.
