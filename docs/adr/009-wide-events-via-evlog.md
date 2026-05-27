# ADR-009: Wide-event observability via `evlog`

- **Date**: 2026-05-27
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: api, observability, logging

## Context and Problem Statement

`apps/api` shipped through v0.1 and Phases 1.5–2.1 with effectively no
structured observability. The only `console.*` calls in the codebase
live in `main.ts` (boot banner + the two crash handlers) — useful, but
nowhere near enough to debug a pilot incident in production. When the
operator's Embedded-Signup connect fails mid-flow
(`POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`,
multi-step: config check → OAuth code exchange → Meta WABA subscribe
→ verifyToken stamping → persistence), the only artifact today is the
HTTP response envelope (`{ code, message, context }`). There is no
record of which step failed, how long it took, or what request id
correlated.

The reflex fix — scatter `console.log` lines through the use case —
multiplies noise without solving the correlation problem. Logs from
multiple concurrent requests interleave on stdout; the next operator
incident is a string-grep treasure hunt.

The right shape is **wide events**: one structured event per request
that accumulates context (workspace id, plugin id, step markers) as
the handler progresses and emits exactly once at response close, with
errors enriching the same event rather than producing a second log
line. We compared three concrete paths to that shape.

This ADR records which path we took and why. Feature 086
(`.specs/features/086-observability-evlog-spike/`) is the spike that
validates the choice end-to-end on the Coex Finish route; the broader
sweep across `apps/api` follows under "Next" on `ROADMAP.md`.

## Decision Drivers

- **One observable model per request** — a single grep-able event
  for both success and failure paths, with request-id correlation.
- **HTTP wire envelope is frozen.** `{ code, message, context }` is
  the api-contracts boundary and consumed by `@kizunu/api-client` +
  every `apps/web` mutation hook. The observability layer must
  *enrich*, not *replace*, the existing `ApplicationException` model.
- **Smallest change that proves the shape.** Pilot is not OpenTelemetry
  scale; an SDK + collector stack would be premature.
- **Pilot containers capture stdout for free** (Docker / Kamal).
  Drain choice should default to "no external infrastructure" until
  the deploy pipeline (`028`) lands somewhere to host Monoscope.
- **AGPLv3 core + MIT toolchain.** The library should be permissively
  licensed to avoid cross-license footguns in the open-source core.

## Considered Options

### Library

- **A — `evlog` (`evlog/nestjs`).** Purpose-built for wide events.
  First-class NestJS adapter (`EvlogModule.forRoot/forRootAsync` +
  global middleware via AsyncLocalStorage). Permissive MIT.
  Compact API: `useLogger().set/info/warn/error`, `createError`,
  `parseError`, a typed `EnrichContext`. v2.x stable.
- **B — NestJS `Logger` + a pino transport.** Idiomatic for Nest.
  Verbose at call sites; no wide-event abstraction (every `.log()`
  is its own line); sampling and the `why`/`fix`/`link` envelope
  must be hand-rolled. The "one event per request" shape would be a
  custom interceptor on top of pino.
- **C — OpenTelemetry SDK auto-instrumentation.** Industrial-grade
  traces + metrics + logs. Multi-package install, collector required,
  trace context everywhere. Solves a bigger problem (distributed
  tracing) than we have; the abstraction surface (`Span`, `Tracer`,
  context propagation) is heavier than wide events at our scale.
- **D — Status quo (no library).** Document a pattern of structured
  `console.log({ event: '...', ... })` and call it observability.

### Drain (stdout vs. external)

- **A — stdout JSONL via evlog's built-in `console.*` default**
  (verified in upstream `packages/evlog/src/logger.ts:240` —
  `console[level](JSON.stringify(formatted))` when no drain is
  configured). Containers capture stdout; no infra required.
- **B — `createFsDrain()` rolling NDJSON on a writable volume.**
  Requires a mounted volume on the API container.
- **C — `createOTLPDrain()` → self-hosted Monoscope.** The
  long-term direction. Monoscope is Arrow/TimeFusion columnar storage
  on an S3 bucket, OTLP-native, AGPL-3.0, embedded MCP server. Blocked
  on the Kamal deploy pipeline (`028`) + an S3 bucket decision.

### Filter composition

- **A — Compose.** Keep `ApplicationExceptionFilter` (the existing
  `@Catch(ApplicationException)` filter) and **add** a guarded
  `useLogger().error(exception)` inside its `catch` so the wide
  event captures the structured error. HTTP wire envelope unchanged.
  Add a new `UnhandledExceptionFilter` (`@Catch()`, last-resort)
  that extends `BaseExceptionFilter` from `@nestjs/core` — captures
  the throw into the wide event, then delegates to `super.catch` so
  Nest's default rendering applies (`HttpException` subclasses keep
  their mapped status; anything else becomes a 500). The two filters
  are registered as global `APP_FILTER` providers in an order chosen
  for Nest's reverse-iteration semantics — `UnhandledExceptionFilter`
  is registered first so `ApplicationExceptionFilter` (registered
  second) is the latest-registered and runs first for the exception
  type it owns.
- **B — Replace.** Adopt the upstream `EvlogExceptionFilter`
  example pattern (`@Catch()` renders `{ message, why, fix, link }`
  to the HTTP response). Would break `@kizunu/api-contracts` for
  every consumer in `apps/web`.

## Decision Outcome

Chosen options:

- **Library**: A — `evlog` (`evlog/nestjs`).
- **Drain**: A — stdout JSONL via evlog's built-in default; B/C
  deferred (Monoscope tracked in `ROADMAP.md` → Later, gated on `028`).
- **Filter composition**: A — compose; never replace the HTTP wire.

The integration shape:

1. `EvlogModule.forRootAsync(...)` imported once in `ApiModule`, fed
   by `buildEvlogOptions(config)` from
   `apps/api/src/shared/observability/evlog-options.ts`. The factory
   calls `initLogger({ env: { service: 'kizunu-api', environment, version } })`
   and returns the middleware options (`exclude: ['/health']`, the
   redaction enricher).
2. `ApplicationExceptionFilter` gains a guarded
   `useLogger().error(exception)` before rendering the existing
   `{ code, message, context }` HTTP response.
3. `UnhandledExceptionFilter`
   (`packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts`)
   captures any other throw into the wide event and delegates to
   `BaseExceptionFilter.catch` so Nest renders the response
   (`HttpException` subclasses keep their mapped status; anything
   else becomes a 500).
4. The Coex Finish use case (`ConnectMetaCoexUseCase`) is the spike's
   test bed — four kebab-case `step` markers
   (`assert-configured`, `oauth-exchange`, `coex-finalize`,
   `persist-account`) plus a top-of-execute `workspaceId` /
   `pluginId` enrichment via `useLogger().set(...)`.
5. The doctrine ships as `.agents/rules/observability.md`. AGENTS.md
   "Conventions and rules" links it alongside `react.md` /
   `web-patterns.md`.

### Positive Consequences

- One JSON line per request on stdout, success or failure, with the
  step markers reached, the request id, the workspace id, and (on
  failure) the structured error envelope. Operators grep one stream
  to find the failing phase.
- HTTP wire stays frozen. No api-contracts change, no api-client
  change, no `apps/web` change.
- The redaction enricher is a single, testable rule set — credentials
  cannot leak through observability without explicitly adding them
  to a non-scoped path.
- The pattern composes with `createError` for any future
  non-request path (boot lifecycle handlers, async workers) without
  changing the request-stack semantics.
- Adopting `evlog`'s lightweight surface keeps the door open for the
  OTLP/Monoscope drain later — a one-line config change, not a
  rewrite.

### Negative Consequences

- One more runtime dependency (`evlog@^2.18.1`). Permissive MIT, but
  still a dependency to track.
- AsyncLocalStorage overhead per request. Negligible at pilot scale;
  measure with the broader sweep.
- Boot-time `console.*` calls in `main.ts` stay as `console.*` —
  they run outside any request scope; `useLogger()` would throw.
  Documented as a known limitation; revisited if pilot operators
  ask for boot-time observability.
- The spike does **not** sweep the rest of `apps/api`. The follow-up
  pass — one module at a time under the new rule — is queued in
  `ROADMAP.md` → Next.

## Pros and Cons of the Options

**Library A (`evlog`)** — purpose-built for the wide-event shape; the
NestJS adapter handles AsyncLocalStorage + response-lifecycle emit
without bespoke middleware; permissive MIT; tiny enough that the
abstraction surface fits on one rule page. Trade-off: the library is
new (v2.x, May 2026) — we pin a version and own the upgrade path.

**Library B (NestJS Logger + pino)** — fully idiomatic for Nest, well
understood. Trade-off: no wide-event abstraction means every `.log()`
becomes its own line and the "one event per request" rule has to be
enforced by a custom interceptor we'd write and maintain.

**Library C (OpenTelemetry SDK)** — solves distributed tracing
properly. Trade-off: huge surface for a problem we don't have at
pilot scale; collector + exporter infrastructure required; traces
are not business events (we'd still need wide events on top).

**Library D (no library)** — zero deps. Trade-off: every call site
re-derives the field set; correlation between request and emit is
manual; the `{ why, fix, link }` envelope and redaction are
hand-rolled in every file.

**Drain A (stdout)** — zero infra, works in every container.
Trade-off: no query interface beyond `grep` / `jq`; volume retention
is the container runtime's job. Acceptable at pilot scale.

**Drain B (filesystem)** — survives container restart if the volume
is persistent. Trade-off: writable-volume requirement on a container
we currently run stateless.

**Drain C (OTLP → Monoscope)** — the right destination. Trade-off:
blocked on `028` (deploy) + an S3 bucket decision; outside the
spike's smallest-change scope.

**Filter A (compose)** — every consumer of the api-contracts HTTP
wire keeps working unchanged; the wide event gains the structured
error for free. Trade-off: the upstream `evlog` example pattern is
not adopted verbatim; the deviation lives in this ADR.

**Filter B (replace)** — fully adopts the upstream pattern.
Trade-off: would break `@kizunu/api-contracts`, `@kizunu/api-client`,
and every `apps/web` consumer that relies on the existing error
envelope. Non-starter under the current contract.

## Migration Policy

- The spike (feature `086`) ships in one branch with the rule, the
  ADR, and the integration on a single hot route
  (`POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`).
- The sweep across the remaining `apps/api` modules
  (`identity`, `workspace`, `cadence`, `crm`, `engine`, `routing`)
  follows under "Next" on `ROADMAP.md`, one module at a time, gated
  by `.agents/rules/observability.md`. No "while I'm here" sweeps in
  unrelated PRs.
- `apps/web` and `@kizunu/api-contracts` are out of scope under this
  ADR; the wire envelope they consume does not change.
- The Monoscope drain (`createOTLPDrain` → self-hosted Monoscope) is
  a follow-up ADR if and when `028` + the S3 bucket decision unblock
  it — not a sub-clause here.

## References

- `.specs/features/086-observability-evlog-spike/` — the spike's
  spec, context, design, and tasks.
- `.specs/research/observability-evlog/` — commit-pinned upstream
  snippets (`07cf733` on `HugoRCD/evlog@main`).
- `.agents/rules/observability.md` — the operational rule.
- `packages/nestjs-shared/src/lib/filters/application-exception.filter.ts`
  — the existing `@Catch(ApplicationException)` filter, now
  enriching the wide event.
- `packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts`
  — the new `@Catch()` last-resort filter.
- `apps/api/src/shared/observability/evlog-options.ts` —
  `buildEvlogOptions` + `REDACTION_KEYS` + the redaction enricher.
- `apps/api/src/api.module.ts` — `EvlogModule.forRootAsync(...)` +
  the two `APP_FILTER` providers.
- `https://github.com/HugoRCD/evlog` — upstream repo.
- `https://github.com/monoscope-tech/monoscope` — the deferred OTLP
  drain target.
