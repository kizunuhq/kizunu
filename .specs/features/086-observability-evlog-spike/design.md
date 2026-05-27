# Wide-event observability spike via `evlog` (086) — Design

**Spec**: `.specs/features/086-observability-evlog-spike/spec.md`
**Context**: `.specs/features/086-observability-evlog-spike/context.md`
**Research**: `.specs/research/observability-evlog/`
**Status**: Draft

---

## Architecture Overview

Six deliverables, organized into two layers:

**Library layer (`packages/nestjs-shared`)** — one new filter for
unhandled exceptions, one mutation to the existing
`ApplicationExceptionFilter`. Both isolated, no API-surface break.

**App layer (`apps/api`)** — one new options module, one
`ApiModule` import, four `useLogger().set(...)` calls inside
`ConnectMetaCoexUseCase`, one `evlog` dependency in
`apps/api/package.json`.

**Documentation layer** — one new rule, one new ADR, one
AGENTS.md "Conventions and rules" bullet, one indexed entry in
`docs/adr/README.md`.

No schema change, no migration, no contract change, no
api-client change, no web change.

```
HTTP request
  ↓
[ EvlogModule.forRoot middleware ]  ← C3: ApiModule.forRootAsync
  ↓  (creates request-scoped logger via AsyncLocalStorage)
[ NestJS request stack ]
  ↓
[ Controller ]
  ↓
[ ConnectMetaCoexUseCase.execute ]
  ↓  log.set({ workspaceId, pluginId })
  ↓  log.set({ step: 'assert-configured' })
  ↓  log.set({ step: 'oauth-exchange' })
  ↓  log.set({ step: 'coex-finalize' })
  ↓  log.set({ step: 'persist-account' })
  ↓
[ Response ]  ← evlog middleware emits one wide event here
  ↓
stdout: { "timestamp": ..., "method": ..., ... }  ← one JSON line / request
```

On throw:

```
[ Use case throws ApplicationException ]
  ↓
[ ApplicationExceptionFilter.catch ]
  ↓  useLogger().error(exception)   ← NEW
  ↓  response.status(...).json({ code, message, context })  ← UNCHANGED
  ↓
[ Response close ]
  ↓
stdout: { ..., "error": { code, message, ... } }  ← one JSON line / failed request
```

```
[ Use case throws unhandled error ]
  ↓
[ UnhandledExceptionFilter.catch (@Catch()) ]   ← NEW filter
  ↓  try { useLogger().error(parsed) } catch {}  ← C14 guarded
  ↓  rethrow → Nest's default catch-all renders 500
  ↓
[ Response close ]
  ↓
stdout: { ..., "level": "error", "error": { message, ... } }
```

---

## Code Reuse Analysis

### Existing patterns to mirror

| Component | Location | How to use |
| --- | --- | --- |
| Global filter registration via `APP_FILTER` provider | `apps/api/src/api.module.ts:37-38` | Add a second `APP_FILTER` provider for `UnhandledExceptionFilter`. Order in `providers` array determines fallback chain. |
| `ApplicationException` + `ApplicationExceptionFilter` | `packages/nestjs-shared/src/lib/exceptions/application.exception.ts`, `packages/nestjs-shared/src/lib/filters/application-exception.filter.ts` | Spec G3 freezes the wire envelope. The filter gains one new line (`useLogger().error(exception)`), guarded by try/catch (C14). |
| `ConfigService<Config>` usage | `apps/api/src/main.ts:37`, `apps/api/src/modules/*/...` | `EvlogModule.forRootAsync({ inject: [ConfigService], useFactory })` matches the existing async-module pattern. |
| `connect-meta-coex.use-case.ts` four-phase body | `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts:54-84` | The four phases are already named (`assertConfigured`, `exchange`, `finalizeMetaCoexConnection`, `accounts.create`). Each gets a single `useLogger().set({ step: ... })` call placed *before* the call — no body restructure. |
| Existing rule files | `.agents/rules/{conventions,react,web-patterns,base-ui,comments,enums}.md` | `observability.md` mirrors `base-ui.md`'s shape — H1 + intro + numbered sections + Good/Bad examples + "Related" footer. |
| ADR template | `docs/adr/008-forms-react-hook-form-zod.md` (most recent precedent) | New ADR follows same Context / Decision / Consequences / Alternatives layout. |
| `docs/adr/README.md` index | `docs/adr/README.md` | One row appended in numeric order. |

### Integration points

| System | Integration method |
| --- | --- |
| `evlog/nestjs` | Single import in `ApiModule.imports[]`, async-config via `ConfigService`. |
| `evlog` (root re-export) | `createError`, `parseError`, `useLogger`, `RequestLogger` imported by the two filters + the options module. |
| `ApplicationExceptionFilter` | Mutated in place — adds `useLogger().error(exception)` inside the existing `catch`. No subclass, no decorator change. |
| `ConfigService<Config>` | Read at module-init time inside `buildEvlogOptions`; the spike does not introduce new env vars if `service` / `environment` / `version` already exist on `Config` (otherwise extend `Config` with three optional string fields). |
| `ConnectMetaCoexUseCase` | Four added imports (`useLogger` from `evlog/nestjs`), four added `log.set(...)` calls. Zero structural change. |
| `AGENTS.md` | One bullet appended under "Conventions and rules" (spec G5 explicitly requests it; this is the standing exception to the "never change AGENTS.md" guard). |

### CONCERNS.md check

No items in `.specs/codebase/CONCERNS.md` flag the channel module,
the exception-filter stack, or `apps/api/src/main.ts`. The closest
related entry is "_(Resolved) Provider credentials are stored
unencrypted_" — already mitigated by `EncryptedCredentialsService`;
our redaction enricher (`buildEvlogOptions`, C6/C8) ensures the same
fields never leak into wide events even if a future bug attaches them.

---

## Components

### A. `packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts` (NEW)

- **Purpose**: Last-resort global filter that captures any
  non-`ApplicationException` throw into the request's wide event, then
  rethrows so NestJS's built-in catch-all renders the default 500. No
  HTTP envelope change.
- **Public API**:
  ```ts
  @Catch()
  export class UnhandledExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void
  }
  ```
- **Body shape** (≤25 lines, fits `code-standards.md` §10):
  1. Coerce `exception` to an `Error` (mirror the upstream example —
     `snippets/evlog-nestjs-example/app.controller.ts:25-26`).
  2. `try { useLogger().error(error) } catch {}` — C14 guard against
     middleware miss.
  3. `throw exception` — let Nest's default filter handle the
     response. (Re-throwing inside `catch` is the documented Nest
     pattern for "log and delegate".)
- **Reuses**: `useLogger` from `evlog/nestjs`, `Catch` /
  `ExceptionFilter` / `ArgumentsHost` from `@nestjs/common`. No
  Kizunu-specific imports.
- **Tests** (generate-tests-fat): two focused unit specs — happy path
  (an unknown throw is captured + rethrown), middleware-miss path
  (`useLogger()` throws → still rethrows the original exception, no
  fallback noise).

### B. `packages/nestjs-shared/src/lib/filters/application-exception.filter.ts` (MUTATION)

- **Change**: inside `catch`, before the `response.status(...).json(...)`
  call, add a guarded `useLogger().error(exception)` so the wide event
  for the request carries the structured error. Wire envelope
  unchanged.
- **Why guarded**: same C14 reason — a test that constructs the filter
  outside the Nest stack (no middleware) must not crash. The
  try/catch swallows the throw.
- **Public API**: unchanged. No new exported names. `@Catch(ApplicationException)`
  decorator unchanged.
- **Reuses**: same imports as today + `useLogger` from `evlog/nestjs`.
- **Tests** (generate-tests-thin): existing e2e on any
  `ApplicationException`-throwing route covers the path; the skill
  decides whether a memory-drain integration spec is worth adding.

### C. `apps/api/src/shared/observability/evlog-options.ts` (NEW)

- **Purpose**: The single source of truth for the evlog module's
  options. Builds `EvlogNestJSOptions` from `ConfigService<Config>`
  (service / environment / version) and assembles the redaction
  enricher.
- **Public API**:
  ```ts
  export function buildEvlogOptions(
    config: ConfigService<Config>,
  ): EvlogNestJSOptions

  export const REDACTION_KEYS: ReadonlyArray<string>
  ```
- **Body shape** (≤30 lines):
  1. Read `service`, `environment`, `version` from config.
  2. Return `{ service, environment, version, exclude: ['/health'], enrich: redactionEnricher }`.
  3. `redactionEnricher(ctx)` walks `ctx.event.input`, `ctx.event.request`,
     `ctx.event.body`, `ctx.event.credentials` (when present) and
     masks any key in `REDACTION_KEYS` to `'[redacted]'`.
- **Reuses**: `EvlogNestJSOptions` from `evlog/nestjs`,
  `ConfigService` from `@kizunu/config-module`, `Config` type from
  `apps/api/src/api.config`.
- **Tests** (generate-tests-fat): one focused unit per redaction
  rule. The skill writes them.

### D. `apps/api/src/api.module.ts` (MUTATION)

- **Change**: add `EvlogModule.forRootAsync({ imports: [ConfigModule? or omit], inject: [ConfigService], useFactory: (config) => buildEvlogOptions(config) })`
  to `imports[]`. Add `{ provide: APP_FILTER, useClass: UnhandledExceptionFilter }`
  *after* the existing `ApplicationExceptionFilter` provider — Nest
  resolves the more specific `@Catch(ApplicationException)` filter
  first, falls back to the `@Catch()` filter for everything else.
- **Public API**: unchanged.

### E. `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts` (MUTATION)

- **Change**: one import + five `useLogger().set(...)` calls per C7.
  No body restructure; no new branch.
- **Lines added**: ~6 (1 import, 5 `log.set` lines).
- **Tests**: the existing `meta-coex-connect.spec.ts` e2e exercises the
  whole path. `generate-tests` decides whether to extend it with a
  memory-drain assertion that the four step markers landed on a
  single emitted event.

### F. `.agents/rules/observability.md` (NEW)

- **Purpose**: codify the wide-event pattern so the Next-phase sweep
  has a contract.
- **Location**: `.agents/rules/observability.md`.
- **Structure** (mirrors `.agents/rules/base-ui.md`, ≤150 lines):
  - H1 + intro: what wide events are, where the pattern applies
    (`apps/api/`), the upstream library, pointer to the research
    bundle, **not script-gated** (review enforces it).
  - § 1 "One wide event per request" — no `console.*` from request
    handlers; reach for `useLogger()`. Bad: scattered `console.log`.
    Good: `log.set({ ... })` + `log.info('...')`.
  - § 2 "Enrich, don't replace" — composition with
    `ApplicationException`. Bad: throwing `createError` from a use
    case (would break the `{ code, message, context }` wire envelope).
    Good: `throw new InvalidCredentialsException(...)` and let the
    filter capture it into the wide event.
  - § 3 "Redaction is mandatory for credentials" — the
    `REDACTION_KEYS` list; how the central enricher already handles
    it; what a contributor needs to do (nothing, unless adding a new
    credential-bearing field — then update `REDACTION_KEYS`).
  - § 4 "What goes in a step marker" — `log.set({ step: 'name' })`
    convention, kebab-case, scoped to one use case. Use the four
    Coex Finish phases as the canonical example.
  - § 5 "What not to put in a wide event" — high-cardinality fields
    (raw user input strings), PII without a redact key, anything that
    duplicates the `error` block. Bad/good examples.
  - § 6 "When to throw `createError`" — answer: not in this codebase
    for the foreseeable future. Domain errors stay
    `ApplicationException`. `createError` is reserved for boot-time
    or out-of-request paths the spike does not address.
  - § 7 "Related" — `.specs/research/observability-evlog/`,
    `comments.md`, ADR-NNN (the new ADR), `react.md` § 0 (the
    sibling convention for primitive layering).
- **Reuses**: format of `base-ui.md`. Same English-only, no
  semicolons, fenced code blocks with kebab-case filenames in
  examples.

### G. `docs/adr/NNN-wide-events-via-evlog.md` (NEW; concrete number determined in tasks.md)

- **Purpose**: record the choice of `evlog` + the wide-event pattern
  + the stdout-default drain.
- **Structure** (mirrors `docs/adr/008`, ≤200 lines):
  - **Status**: Accepted.
  - **Context**: scattered ad-hoc `console.*` + the structured-error
    envelope already in place; pilot-debugging gap on multi-step
    handlers like Coex Finish; the pattern of wide events.
  - **Decision**: adopt `evlog` (`evlog/nestjs`) on the request
    stack with stdout-default drain; HTTP wire envelope frozen; the
    `ApplicationExceptionFilter` enriches the wide event;
    `UnhandledExceptionFilter` captures unhandled throws.
  - **Consequences**: positive (single grep-able event per request,
    structured error envelope, AsyncLocalStorage-based correlation),
    negative (one runtime dep, AsyncLocalStorage overhead, no events
    for boot-time paths), neutral (drain stays stdout until Phase
    1.7+`028`).
  - **Alternatives weighed**: NestJS `Logger` + pino transport
    (verbose, no wide-event abstraction, sampling story manual);
    OpenTelemetry SDK auto-instrumentation (heavier, traces ≠
    business events, premature for pilot); no observability (the
    status quo, untenable for pilot).
  - **References**: `.specs/research/observability-evlog/`,
    `.agents/rules/observability.md`, feature 086 folder.

### H. `docs/adr/README.md` (MUTATION)

- **Change**: one new row in the ADR table, in numeric order.

### I. `AGENTS.md` (MUTATION)

- **Change**: one bullet appended under "Conventions and rules"
  pointing at `observability.md`. One-line summary in the same voice
  as the existing nine bullets (`react.md`, `web-patterns.md`,
  `base-ui.md`, etc.).
- Per spec G5 the user explicitly authorized this edit — the
  standing "never change AGENTS.md" guard yields to the explicit
  request, exactly as it did for 085's `base-ui.md`.

### J. `apps/api/package.json` (MUTATION)

- **Change**: add `"evlog": "^2.18.1"` to `dependencies`. Run
  `bun install` to update the lockfile.
- Nothing else moves.

---

## Data Models

N/A — no schema, no migration, no DTO, no contract change. The
wide-event payload is an in-memory shape consumed by stdout and
discarded; nothing crosses the api-client or the database.

---

## Error Handling Strategy

| Scenario | Handling | Operator impact |
| --- | --- | --- |
| `ApplicationException` thrown from a use case | `ApplicationExceptionFilter` renders `{ code, message, context }` (unchanged) **and** captures the structured error into the wide event via `useLogger().error(exception)` | One JSON line carrying both the success-path enrichment (workspaceId, pluginId, step markers reached) and the error block; HTTP response is byte-identical to today's. |
| Unhandled non-`ApplicationException` throw | `UnhandledExceptionFilter.catch` → `useLogger().error(parsed)` (guarded) → rethrow; Nest's default catch-all renders 500 | One JSON line at `level: error` with the parsed envelope; HTTP body is Nest's default 500 (unchanged). |
| `useLogger()` throws (request never passed through middleware) | The guarded try/catch in both filters swallows the throw; the original exception path proceeds | None — pre-spike behavior. |
| Health-check requests (`GET /health`) | `exclude: ['/health']` in `buildEvlogOptions` — middleware skips logger creation entirely | Zero wide-event noise for liveness probes. |
| OAuth code / Meta access-token / verifyToken / appSecret accidentally attached to `log.set` | Redaction enricher (C8) replaces value with `'[redacted]'` before emit | Operator sees the redacted token in the event; the actual secret never lands on stdout. |
| Sealed-logger violation (a fire-and-forget Promise calls `log.set` after the response flushed) | evlog's built-in `console.warn` from `logger.ts:24` | One advisory warning on stdout; the rule (§ 4 / § 5) documents the hazard so it's avoidable. |
| Test that previously relied on no JSON on stdout | The wide-event line will be present; if the test asserts on empty stdout, fix locally (or pass `silent: true` to the test bootstrap's `EvlogModule.forRoot`) | Caught by `bun check`; resolved in the task ledger before ship. |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| --- | --- | --- |
| **Library** | `evlog` v2.18.1 (`evlog/nestjs`) | Purpose-built for the wide-event pattern; first-class NestJS adapter; permissive MIT; small surface (`useLogger`, `createError`, `parseError`, a module). Alternatives (NestJS `Logger` + pino, OpenTelemetry SDK) trade either ergonomics or weight against the spike's smallest-change goal. ADR-NNN records the comparison. |
| **Where the module is imported** | `ApiModule` via `forRootAsync` (C3) | Matches every other cross-cutting concern (mail, persistence, exception filter). One grep-discoverable site for the whole observability story. |
| **Drain** | stdout JSONL via the built-in `console.*` default (no drain configured) | Smallest possible change. Containers (Docker / Kamal) capture stdout for free. OTLP / Monoscope deferred per `ROADMAP.md → Later`. |
| **Filter composition** | Add `UnhandledExceptionFilter`, mutate `ApplicationExceptionFilter` minimally (C4) | Wire envelope frozen by spec G3. The "replace with evlog's `{ message, why, fix, link }`" pattern from the upstream example is incompatible with our api-contracts. Composition keeps the change reversible. |
| **`createError` adoption** | Not adopted | Our domain-error vocabulary is `ApplicationException` subclasses (one per nominated error). Adopting `createError` for some throws and not others would split the error model in half. Reserved for boot/out-of-request paths in the future. |
| **Where `UnhandledExceptionFilter` lives** | `packages/nestjs-shared/src/lib/filters/` (C5) | Sibling to `ApplicationExceptionFilter`. Domain-agnostic, app-agnostic. The web app does not consume it, but that's a "wouldn't" not a "couldn't". |
| **Where `buildEvlogOptions` + `REDACTION_KEYS` live** | `apps/api/src/shared/observability/evlog-options.ts` (C6) | Kizunu-app-specific (the redaction list depends on Kizunu's credential vocabulary). Belongs in `apps/api/src/shared/`, not in the shared library. |
| **Redaction scope** | Path-scoped to known credential-bearing subtrees (C8 / C8.1) | A generic deny-list would either over-redact (`event.error.code` is signal, not secret) or under-redact (regex misses). Path-scoped is enough for the spike; future additions extend the list, not the algorithm. |
| **AGENTS.md edit** | Yes — one bullet appended (G5) | Standing memory says never change AGENTS.md unless the user explicitly asks. The user explicitly asked in the feature scope. Same precedent as 085's `base-ui.md`. |
| **ADR number** | Next sequential from `docs/adr/` (009 today) | Numbering is sequential and never reused; final number set in `tasks.md`. |
| **Tests** | Delegated to `generate-tests` (C10) | Two fat artifacts (`buildEvlogOptions` / `UnhandledExceptionFilter`) → focused unit. Two thin artifacts (use-case enrichment, filter mutation) → covered by e2e or skip per skill's call. |
| **Per-phase timing** | Not in spike scope | The wide event already carries request total `duration`. Per-phase millisecond timing is a Next-phase enrichment when the sweep lands. |

---

## Test Strategy

Per AGENTS.md / `generate-tests`, classify each artifact:

- **`buildEvlogOptions` + `REDACTION_KEYS` enricher** — fat. Focused
  unit specs, one redaction rule per test, plus one "passes through
  non-credential keys" test. Mock the
  `EnrichContext` shape from `evlog/types`.
- **`UnhandledExceptionFilter`** — fat. Two focused unit specs:
  (a) captures an `Error` into `useLogger().error(...)`, then
  rethrows; (b) when `useLogger()` is unbound (no middleware), the
  guarded try/catch swallows the throw and the original exception
  still propagates.
- **`ApplicationExceptionFilter` mutation** — thin orchestration.
  Existing e2e (any route throwing an `ApplicationException`) covers
  it. The skill decides whether to add a memory-drain integration
  spec.
- **`ConnectMetaCoexUseCase` enrichment** — thin (one `set` per
  phase, no branch). The existing
  `apps/api/src/__test__/e2e/meta-coex-connect.spec.ts` exercises
  the path; the skill decides whether to extend it.
- **`EvlogModule.forRootAsync` wiring** — thin (configuration). Tested
  transitively by *every* e2e (every request flows through the
  middleware after this change). No new dedicated test.
- **`observability.md` rule + ADR + AGENTS.md edit** — pure
  documentation. No tests.

`generate-tests` is invoked per-task in the Execute phase (tasks.md
T-08 / T-09).
