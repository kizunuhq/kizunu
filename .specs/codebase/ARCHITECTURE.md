# Architecture

**Pattern:** Modular monolith. One NestJS API (`apps/api`) + one React SPA (`apps/web`), sharing zod contracts via `@kizunu/api-contracts`. API-first: the web app is just a client of the REST API.

The architectural decisions below are recorded as ADRs in `docs/adr/` (index: `docs/adr/README.md`). ADRs are **immutable** — never edit one after the fact; supersede with a new ADR and link back.

## High-Level Structure

```
apps/web (React SPA) ──HTTP (cookies)──► apps/api (NestJS)
        │                                       │
   @kizunu/api-contracts (zod schemas) ─────────┘
                                                │
                              @kizunu/nestjs-shared (Drizzle, exceptions, decorators)
                              @kizunu/config-module (typed config)
                                                │
                                          PostgreSQL
```

## Identified Patterns

### Per-module hexagonal layering (`core` / `http` / `persistence`)

**Location:** `apps/api/src/modules/<module>/` (currently `identity`, `workspace`).
**Purpose:** Keep business logic free of framework and DB concerns; dependencies point inward (ADR 001 — *Domain Owns the Vocabulary; Dependencies Point Inward*).
**Implementation:**
- `core/use-cases/*.use-case.ts` — `@Injectable` classes with a single `execute(input)`; hold the business rules.
- `core/models`, `core/domain`, `core/errors`, `core/crypto` — domain types, nominated errors, primitives.
- `http/controllers`, `http/guards`, `http/decorators` — the HTTP edge; controllers map DTOs → use-case input.
- `persistence/*.repository.ts` — `@Injectable` repositories wrapping `DrizzleService`.
**Example:** `modules/identity/core/use-cases/authenticate.use-case.ts` orchestrates `UserRepository`, `SessionRepository`, `MembershipRepository`.

### Use case as the unit of business logic

**Purpose:** Each user-facing action is one class with `execute()`. Controllers stay thin; rules (lock after 5 attempts, generic credential errors) live in the use case.
**Example:** `AuthenticateUseCase` — constant-time hash on unknown email, failed-attempt lock, session issuance.

### Nominated domain errors → global filter

**Location:** `@kizunu/nestjs-shared/lib/exceptions/application.exception.ts` + `filters/application-exception.filter.ts`.
**Purpose:** Use cases throw `ApplicationException` subclasses carrying a dot-namespaced `code` (e.g. `identity.invalid-credentials`), a suggested HTTP status, and structured `context`. The global `APP_FILTER` maps them to JSON `{ code, message, context }` without leaking stack traces.
**Example:** `modules/identity/core/errors/identity.errors.ts`.

### Contract-first DTOs

**Purpose:** Request/response shapes are zod schemas in `@kizunu/api-contracts`; controllers wrap them with `createZodDto`, and the web app imports the same schemas/types.
**Example:** `packages/api-contracts/src/identity/login.contract.ts` ↔ `auth.controller.ts` (`class LoginDto extends createZodDto(LoginRequestSchema)`).

### End-to-end type-safe API boundary (contracts → API → client)

**Purpose:** A single source of truth for every endpoint's *shape* and *path*, so the API and the web client can never silently drift. One zod schema defines a request/response; both sides import it.

**The three layers:**

1. **`@kizunu/api-contracts`** — schemas are *born here*. Each `*.contract.ts` exports a `XxxRequestSchema`/`XxxResponseSchema` (top-level zod v4: `z.email()`, `z.uuid()`, `z.iso.datetime()`) plus the inferred type (`export type XxxRequest = z.infer<...>`). Paths live in one `Routes` table (`src/routes/index.ts`): static routes are strings, parameterized routes are functions (`Routes.workspaces.member(workspaceId, membershipId)`). The error envelope is `{ code, message, context }`.
2. **API (`apps/api`)** — controllers turn each schema into a DTO with `createZodDto(...)`; the global `ZodValidationPipe` validates inbound bodies; the global `ApplicationExceptionFilter` renders the `{ code, message, context }` envelope. The controller's `@Controller`/`@Post` paths must match `Routes`.
3. **`@kizunu/api-client`** — the typed browser client. `client/api-client.ts` exposes `get/post/patch/put/del<T>` over `fetch` (`credentials: 'include'`, no version prefix); `client/api-error.ts` maps non-OK responses to `ApiError` (carries `status`, `code`, `context`, plus intent getters like `isUnauthorized`/`isValidation`). Per-domain `*.api.ts` modules call `Routes.*` typed by the contract types; per-action `use-*.ts` TanStack Query hooks wrap them, with cache keys from `query-keys.ts`.

**Data flow of one call:** `useLogin()` → `login(body: LoginRequest)` (`identity/auth.api.ts`) → `post<LoginResponse>(Routes.auth.login, body)` → API validates against `LoginRequestSchema` → returns `LoginResponse` or the error envelope → client returns typed data or throws `ApiError`. Changing the schema in `api-contracts` re-types both ends; a path typo can't compile because both sides reference `Routes`.

**Examples:** `packages/api-contracts/src/routes/index.ts`, `packages/api-client/src/client/api-client.ts`, `packages/api-client/src/identity/auth.api.ts` + `use-login.ts`. The pattern (client core + per-domain `*.api.ts` + `use-*.ts` hooks + `query-keys.ts`, schemas + `Routes` in the contracts package) is modeled on the reference monorepo at `~/Workspaces/spice-target`, adapted to kizunu conventions (`import { z } from 'zod'`, no `/v1` prefix, `{ code, message, context }` errors).

### `@kizunu/api-client` package layout

```
packages/api-client/src/
├── client/
│   ├── api-client.ts   # get/post/patch/put/del<T> over fetch; API_URL from VITE_API_URL
│   └── api-error.ts    # ApiError (status, code, context) + isUnauthorized/isValidation/…
├── query-keys.ts       # frozen TanStack Query cache-key namespaces
├── identity/
│   ├── auth.api.ts      # register/login/logout/getMe/switchWorkspace
│   └── use-*.ts         # useLogin, useRegister, useLogout, useCurrentUser, useSwitchWorkspace
└── workspace/
    ├── workspace.api.ts # inviteMember/acceptInvitation/listMembers/updateMemberStatus
    └── use-*.ts         # useMembers, useInviteMember, useAcceptInvitation, useUpdateMemberStatus
```

The web app consumes the package directly (`@kizunu/api-client/identity/use-current-user`), and no longer keeps a bespoke `fetch` wrapper inside `apps/web`.

### Compile-time layer-boundary guard (schema ↔ domain)

**Purpose:** The domain owns enum vocabulary; the infra `pgEnum` must conform. A `type _SchemaMatchesDomain = Assert<Equal<enumValues[number], DomainType>>` breaks the build if they drift (ADR 002 — *Enum-like Types as a Derived `const` Object*; ADR 003 — *Compile-Time Layer-Boundary Guard*).
**Example:** `db/schemas/verification-tokens.ts` asserts against `VerificationTokenType`.

### Global persistence + auth wiring

**Purpose:** `PersistenceModule` (`@Global`) provides a single `DrizzleService` (one `pg.Pool`) from `config.get('database.url')`. `IdentityModule` registers `AuthGuard` as `APP_GUARD`, so routes are protected by default; `@Public()` opts out.

## Data Flow

### Authentication / session

1. `POST /auth/login` → `AuthController.login` validates `LoginDto`.
2. `AuthenticateUseCase.execute` — looks up user, checks lock, verifies argon2id hash, increments/locks on failure, resolves active workspace from memberships, creates a hashed opaque session token.
3. Controller sets an `httpOnly` session cookie (`setSessionCookie`) and returns `{ user, activeWorkspaceId }`.
4. Subsequent requests: `AuthGuard` (global) resolves the session from the cookie; `@CurrentUser`/`@CurrentSession` decorators expose it to handlers.

### Bootstrap / migrations

`apps/api/src/main.ts` runs Drizzle migrations at startup (`runMigrations()`), then boots Nest with `cookie-parser` and the global `ZodValidationPipe`, and enables shutdown hooks.

## Code Organization

**Approach:** Domain-driven modular monolith. Backend grouped by domain module then by layer; frontend grouped by feature (`apps/web/src/features/<feature>/`) with shared primitives in `components`/`hooks`/`lib`. The web app's full layout — route sigils, the `features/` vs `components/` vs `components/primitives/` layering, and where each kind of code goes — is mapped in `docs/web-structure.md` (human-readable companion to STRUCTURE.md). UI primitives are shadcn-first (see CONVENTIONS.md and `.agents/rules/react.md` §0): installed into `components/primitives/` via the `shadcn` skill, customized in-project; bespoke only when no primitive fits.
**Module boundaries:** Cross-app shared code lives in `packages/`, never inside an app. Path aliases (`@kizunu/api/*`, `@kizunu/web/*`) replace deep relative imports (enforced — see CONVENTIONS.md).
