# Testing Infrastructure

## Test Authoring Policy — use the `generate-tests` skill

**All test implementation in this project goes through the `generate-tests` skill** (installed at `.claude/skills/generate-tests`). Whenever the spec-driven workflow writes tests, builds a task test plan, or decides whether code needs tests, invoke `generate-tests` rather than mechanically turning every WHEN/THEN criterion or every code layer into a dedicated test.

`generate-tests` classifies code on a **thin vs. fat** spectrum:
- **Fat** (business rules: branches, validation, transforms, state machines) → focused unit/integration tests, one rule per test, real objects over mocks, mock only at boundaries.
- **Thin** (passthrough/orchestration) → E2E (HTTP) already covers it; skip dedicated tests unless there is a specific reason.

This matches the existing suite: `AuthenticateUseCase` is fat (lock-after-5, generic credential errors, workspace resolution) and has a thorough unit spec; the health endpoint and DB connectivity are covered by thin e2e/integration smoke tests. `tlc-spec-driven` owns *requirements and gates*; `generate-tests` owns *which test level*.

## Test Frameworks

- **Unit / Integration / E2E:** Vitest via `vite-plus/test` (import `{ describe, it, expect, vi, beforeEach, afterEach }` from `vite-plus/test`)
- **E2E HTTP:** `supertest` against an in-process Nest app (`Test.createTestingModule`)
- **Coverage:** `@vitest/coverage-v8` (`bun test:coverage`)

Three Vitest projects are defined in root `vite.config.ts` (`unit`, `integration`, `e2e`), all aliasing `@kizunu/api` → `apps/api/src`.

## Test Organization

- **Location:** colocated `__test__/` dirs. Unit specs sit beside source (`modules/<m>/core/use-cases/__test__/unit/*.spec.ts`); app-wide `integration/` and `e2e/` harnesses live in `apps/api/src/__test__/`.
- **Naming:** `<source-name>.spec.ts`.
- **Structure:** `describe('<Subject>')` grouped by business rule, Arrange/Act/Assert (or Given/When/Then) bodies, factory helpers (`createUser`, `buildFakes`) at file top. Time-dependent tests use `vi.useFakeTimers()`/`setSystemTime` with `afterEach(() => vi.useRealTimers())`. (Conventions in `.agents/rules/test.md`.)

## Testing Patterns

### Unit (`**/src/**/__test__/unit/**/*.spec.ts`, node env)
Pure logic, no DB. Dependencies replaced with hand-rolled fakes cast at the boundary (`{...} as unknown as UserRepository`); external primitives mocked at the seam only (`vi.mock` on `password.helper` because `Bun.password` is unavailable in the node runner). Parallel-safe.

### Integration (`apps/api/src/**/__test__/integration/**/*.spec.ts`, node env)
Hits the real `kizunu_test` Postgres via `__test__/integration/db.ts` (`db`, `closeDb`, `truncateAll`). `setup.ts` defaults `TEST_DATABASE_URL`. Currently only a harness smoke test exists. **Not parallel-safe** (shared DB, TRUNCATE) — `fileParallelism: false`.

### E2E (`apps/api/src/**/__test__/e2e/**/*.spec.ts`, node env)
Boots `ApiModule` in-process and drives HTTP with `supertest` (`health.spec.ts`). E2E here = an HTTP call, not browser automation. **Not parallel-safe** (shared `kizunu_test`) — `fileParallelism: false`.

`global-setup.ts` runs once for integration+e2e: if `kizunu_test` is unreachable it runs `bun db:test:setup` (idempotent compose up + create + migrate), so `bun check` is self-sufficient.

## Test Execution

| Command | Runs |
|---|---|
| `bun test` | all projects (`vp test`) |
| `bun test:unit` | unit project only |
| `bun test:integration` | integration project (boots test DB) |
| `bun test:e2e` | e2e project (boots test DB) |
| `bun test:watch` | watch mode |
| `bun test:coverage` | coverage run |

## Coverage Targets

No numeric threshold is configured or enforced. Philosophy (from `generate-tests`): coverage is an indicator of what's untested, not an objective. Current real coverage is concentrated in identity/workspace use cases; integration/e2e are smoke-level only (see `CONCERNS.md`).

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| --- | --- | --- | --- |
| Use cases with business rules (fat) | unit | `apps/api/src/modules/<m>/core/use-cases/__test__/unit/*.spec.ts` | `bun test:unit` |
| Use cases that only orchestrate (thin) | none (covered by e2e) | — | `bun test:e2e` |
| Repositories (Drizzle) | integration (only if they carry query logic worth proving) | `apps/api/src/**/__test__/integration/*.spec.ts` | `bun test:integration` |
| HTTP controllers / guards / pipes | e2e | `apps/api/src/**/__test__/e2e/*.spec.ts` | `bun test:e2e` |
| Domain models / pure helpers (fat) | unit | `__test__/unit/*.spec.ts` beside source | `bun test:unit` |
| Shared schema↔domain conformance | compile-time (`Assert<Equal>`) | `db/schemas/*.ts` | `bun typecheck` |
| Web components / routes | none yet (no FE test setup) | — | — |

Let `generate-tests` confirm thin/fat for each target before assigning a row above.

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
| --- | --- | --- | --- |
| unit | Yes | no shared state; fakes + boundary mocks | `authenticate.use-case.spec.ts` (in-memory fakes) |
| integration | No | shared `kizunu_test` DB, `truncateAll` | `vite.config.ts` `fileParallelism: false`; `integration/db.ts` |
| e2e | No | shared `kizunu_test` DB, in-process app | `vite.config.ts` `fileParallelism: false`; `e2e/health.spec.ts` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | after tasks with unit tests only | `bun test:unit` |
| Full | after tasks touching DB/HTTP (integration/e2e) | `bun test:integration && bun test:e2e` |
| Build | after phase completion / before PR | `bun check` (`scripts/check.sh`: `bun typecheck` → `vp check` → `vp test` → import-depth + zod-v4 + drizzle-naming + drizzle-checksums) |
