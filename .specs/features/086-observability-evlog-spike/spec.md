# Observability spike: wide events via `evlog` (086) — Specification

## Problem Statement

`apps/api` has almost no structured observability. The three `console.*`
calls left in the codebase live in `main.ts` (boot banner, two crash
handlers) — meaningful, but not nearly enough to debug a pilot incident
in production. When a Coex Embedded-Signup connect fails for an operator
mid-pilot, the only artifact today is a `{ code, message, context }`
HTTP response. There is no record of which step failed (config check?
OAuth code exchange? WABA subscribe? `verifyToken` stamp?), how long it
took, or what request id correlated.

The classic fix — sprinkle `console.log` lines — multiplies the noise
without solving the correlation problem (logs interleave across requests,
context is lost). The right fix is **wide events**: one structured
event per request that accumulates context as the handler progresses
and emits exactly once at response close, with errors carrying
actionable `why` / `fix` / `link` fields. The `evlog` library
(`evlog/nestjs`, MIT, v2.18.1) implements precisely that shape with a
first-class NestJS adapter.

This spike validates the pattern end-to-end on **one** route — the
Coex Embedded-Signup finish path,
`POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`, owned by
`ConnectMetaCoexUseCase` — the longest, most multi-step, most
operator-visible handler today. If the spike lands, the broader sweep
(`apps/api`-wide, gated by the new `observability.md` rule) follows
under Next.

Research bundle: `.specs/research/observability-evlog/` (commit-pinned
upstream snippets + distilled `context.md`).

## Goals

- [ ] **G1 — Wide-event logging on one route end-to-end.** Every
      request to `POST /workspaces/:id/channel-accounts/meta-whatsapp/connect`
      emits exactly one JSON line on stdout at response close, with
      method, path, status, duration, requestId, workspaceId, the
      pluginId (`meta-whatsapp-coex`), and one `step` enrichment per
      use-case phase (`assert-configured`, `oauth-exchange`,
      `coex-finalize`, `persist-account`).
- [ ] **G2 — Errors enrich the same event, never split it.** Whether
      the handler throws an `ApplicationException` (caught by the
      existing `ApplicationExceptionFilter`) or an unhandled error
      (caught by a new last-resort `@Catch()` filter), the wide event
      for that request carries the error envelope (message + status +
      optional `code` / `why` / `fix` / `link`). No second log line.
- [ ] **G3 — HTTP wire envelope unchanged.** The
      `{ code, message, context }` response shape stays exactly as
      `ApplicationExceptionFilter` renders it today. No api-contracts
      change. No api-client change. No web change. `why` / `fix` /
      `link` (when present) appear only in the server-side wide event,
      not in the HTTP body.
- [ ] **G4 — One project-wide module wiring, gated by config.**
      `EvlogModule.forRoot(...)` (or `forRootAsync` reading
      `ConfigService`) imported once into `ApiModule`. The module
      registers a global middleware that covers every request — but
      the spike scope of this feature is *only* the Coex Finish
      route's enrichment + the two filter integrations; other routes
      get the request-shell event "for free" (method, path, status,
      duration, requestId) without bespoke `useLogger().set(...)` calls.
- [ ] **G5 — Project rule documented.** A new
      `.agents/rules/observability.md` codifies the wide-event pattern
      (one event per request, accumulating context, error envelope
      composition, redaction, when to reach for `useLogger()`) so the
      Next-phase sweep has a contract to follow. AGENTS.md
      "Conventions and rules" links it alongside `react.md`,
      `web-patterns.md`, etc.
- [ ] **G6 — Architectural decision recorded.** A new ADR
      (`docs/adr/NNN-wide-events-via-evlog.md`) records the choice of
      `evlog`, the alternatives weighed (NestJS `Logger` + a pino
      stack, OpenTelemetry SDK auto-instrumentation), and the
      stdout-default drain decision (deferring OTLP → Monoscope until
      the Kamal pipeline `028` lands).

## Out of Scope

| Item | Reason |
| --- | --- |
| Replacing the `{ code, message, context }` HTTP envelope with evlog's `{ message, why, fix, link }` | Would break `@kizunu/api-contracts` + `@kizunu/api-client` + every web consumer. The HTTP wire is frozen; evlog enters server-side only. |
| Adding `why` / `fix` / `link` fields to every existing `ApplicationException` subclass | Sweep follows in Next, guided by the new rule. The spike only ensures the wire is in place. |
| Rolling out `useLogger().set(...)` enrichment across the rest of `apps/api` (workspace, identity, cadence, journey, etc.) | Sweep follows in Next, one module at a time. |
| Sampling rules (e.g. drop 90% of `info` events in prod) | The pilot has very low traffic; 100% retention is fine for now. Sampling lands with the OTLP/Monoscope drain (Later). |
| OTLP drain + self-hosted Monoscope | Blocked on Kamal `028` + S3 decision; tracked in `ROADMAP.md → Later`. |
| Replacing the three `console.*` calls in `main.ts` (boot banner, `unhandledRejection`, `uncaughtException`) | Those run *outside* the request stack — `useLogger()` has no AsyncLocalStorage there. Out-of-scope; revisit when boot/observability story matures. |
| Process-level metrics (CPU / memory / queue depth) | Async-worker domain; revisit when the engine spawns workers. |
| Migrating tests off `console.error` / `vi.spyOn(console, ...)` | The spike does not touch existing test setup; if any test breaks because evlog writes JSON to stdout, fix it locally with the `silent` option in the test bootstrap. |

---

## User Stories

### P1: Operator can correlate a failed Coex connect to a single structured event ⭐ MVP

**User Story:** As a pilot operator debugging a failed Embedded-Signup
connect, I want one JSON line per failed request that names the failing
step, the request id, the workspace id, and the error envelope, so that
I can grep one file (or one container stream) and know exactly what
broke without re-running the operator's flow.

**Why P1:** The whole point of the spike. Without G1+G2+G3 working
together on one route, there is nothing to ship.

**Acceptance Criteria:**

1. WHEN an operator POSTs a valid Embedded-Signup payload to
   `/workspaces/:id/channel-accounts/meta-whatsapp/connect` and the
   Meta exchanges succeed THEN the API SHALL emit exactly one JSON
   line to stdout at response close with `level: "info"`,
   `method: "POST"`, `path: "/workspaces/:id/channel-accounts/meta-whatsapp/connect"`,
   `status: 201`, a numeric or string `duration`, a non-empty
   `requestId`, `workspaceId`, `pluginId: "meta-whatsapp-coex"`, and
   the four `step` markers
   (`assert-configured`, `oauth-exchange`, `coex-finalize`,
   `persist-account`) accumulated into the event payload.
2. WHEN the operator's POST fails with `MetaCoexNotConfiguredException`
   THEN the API SHALL emit exactly one JSON line with `level: "error"`,
   `status: 422` (or whatever the exception's
   `suggestedHttpStatusCode` is), the request's `requestId` and
   `workspaceId`, **and** an `error: { code: "<dot-namespaced>",
   message, ... }` block carrying at minimum the existing
   `ApplicationException` fields.
3. WHEN the handler throws an unhandled (non-`ApplicationException`)
   error THEN the API SHALL still emit exactly one JSON line with
   `level: "error"`, `status: 500`, the request's `requestId`, and an
   `error` block containing the message + parsed stack-safe envelope;
   the HTTP response SHALL be Nest's default 500 (unchanged).
4. WHEN the API receives a request with an `x-request-id` header
   THEN the wide event's `requestId` field SHALL be that header's
   value; **WHEN** the header is absent THEN `requestId` SHALL be a
   newly generated UUID.

**Independent Test:** A curl/supertest call against the route returns
the same JSON HTTP envelope it returns today (`{ id, pluginId,
channelMode, name }` on success or `{ code, message, context }` on
known failure); stdout shows exactly one JSON line per request whose
shape matches the criteria above. No additional `console.*` lines from
within the handler.

---

### P2: Contributor can follow the new convention without re-reading evlog docs

**User Story:** As a contributor about to instrument the next route,
I want a short, opinionated rule in `.agents/rules/observability.md`
that tells me *exactly* how to attach context, what to redact, when
to reach for `log.error` vs throwing `createError`, and how to keep
the existing `{ code, message, context }` HTTP envelope intact — so
I do not have to reinvent the integration shape.

**Why P2:** Without the rule the spike is one isolated route; the
sweep that follows (Next) needs a contract.

**Acceptance Criteria:**

1. WHEN a contributor opens `AGENTS.md` THEN the "Conventions and
   rules" section SHALL list `observability.md` alongside `react.md`,
   `web-patterns.md`, etc., with the same one-line summary pattern
   (verb-first, ≤2 sentences).
2. WHEN a contributor opens `.agents/rules/observability.md` THEN it
   SHALL be in English, ≤ ~150 lines (matches `base-ui.md`'s
   brevity), with bad/good examples covering at least: (a) the
   one-event-per-request rule (no `console.*` in handlers), (b) the
   `useLogger().set(...)` enrichment pattern, (c) the
   `ApplicationException` ↔ wide-event composition (filter logs, wire
   envelope unchanged), (d) the redaction list (`credentials.*`,
   `accessToken`, `code`, `verifyToken`, `appSecret` at minimum), (e)
   pointer to <https://github.com/HugoRCD/evlog> and the in-repo
   research bundle for deeper questions.
3. WHEN the rule references how the spike applies the pattern THEN
   it SHALL link to `ConnectMetaCoexUseCase` and the two filters as
   the canonical examples.

**Independent Test:** A reader unfamiliar with evlog can land on
`observability.md` from AGENTS.md in one hop, read it in under five
minutes, and know exactly what to do (and not do) when adding the next
route's enrichment.

---

### P3: Decision is recorded for the next reviewer

**User Story:** As a future reviewer (or auditor, or open-source
contributor) trying to understand why `apps/api` uses `evlog` instead
of NestJS's built-in `Logger`, pino, or OpenTelemetry SDK, I want a
short ADR that names the alternatives weighed, the constraint that
selected `evlog`, and what's deferred — so I do not have to dig
through PR history.

**Why P3:** The decision is small but load-bearing for the sweep
that follows. The ADR is cheap and keeps doctrine durable.

**Acceptance Criteria:**

1. WHEN a future reader opens `docs/adr/README.md` THEN the new ADR
   SHALL be indexed there with a one-line summary in the same format
   as ADRs 001–008.
2. WHEN the ADR file is opened THEN it SHALL be in the standard
   project format (Context / Decision / Consequences / Alternatives),
   under ~200 lines, in English, and SHALL explicitly call out:
   (a) the alternatives weighed (NestJS `Logger`+pino, OpenTelemetry
   SDK auto-instrumentation, no observability), (b) the
   stdout-default drain choice and why OTLP is deferred, (c) the
   anchoring that the HTTP error envelope is frozen and evlog is
   server-side only.

---

## Edge Cases

- **`exclude` paths:** evlog's middleware SHALL be configured to
  exclude `/health` (and any other no-op endpoints registered today)
  so we do not emit one event per Kubernetes/Kamal liveness probe.
- **Sealed logger:** WHEN a use case attempts `log.set(...)` after the
  response has flushed (e.g. fire-and-forget Promise) THEN evlog
  SHALL ignore the call with its built-in `console.warn`; the spike
  does not introduce such call sites, but the rule documents the
  hazard.
- **Tests that assert on `console.*`:** WHEN an existing test relies
  on no JSON line landing on stdout THEN the spike's task ledger
  SHALL include re-running the full `bun check` and resolving any
  fallout (likely zero — the three controllers exercised by e2e
  already write to real stdout under `vp test`).
- **Redacted fields:** WHEN the wide event payload would otherwise
  include any of `credentials`, `accessToken`, `appSecret`, `code`
  (OAuth short-lived code), `verifyToken`, `client_secret` THEN the
  enricher SHALL mask them (replace value with `"[redacted]"` or
  drop) before stdout emission.
- **High-cardinality fields:** WHEN the handler attaches a value that
  would explode cardinality (e.g. raw user input strings) THEN the
  contributor SHALL group it under a single `input` key rather than
  promoting it to a top-level field — codified in the rule.

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| OBS-01 | G1 — Wide-event emission on Coex Finish (success path, all four steps enriched) | Design | Pending |
| OBS-02 | G1/G4 — `EvlogModule.forRoot/forRootAsync` wired into `ApiModule`; `exclude: ['/health']` | Design | Pending |
| OBS-03 | G2 — `ApplicationExceptionFilter` enriches the wide event with the structured error; HTTP wire unchanged | Design | Pending |
| OBS-04 | G2 — New last-resort `@Catch()` filter captures unhandled throws into the wide event before Nest's default 500 | Design | Pending |
| OBS-05 | G1 edge — `x-request-id` header is honored; absent → generated UUID | Design | Pending |
| OBS-06 | Edge — `/health` excluded from wide-event emission | Design | Pending |
| OBS-07 | Edge — Redaction enricher masks the credential vocabulary list before emit | Design | Pending |
| OBS-08 | G5 — `.agents/rules/observability.md` introduced (≤150 lines, bad/good, redaction list, link to research) | Tasks | Pending |
| OBS-09 | G5 — AGENTS.md "Conventions and rules" links `observability.md` | Tasks | Pending |
| OBS-10 | G6 — ADR `docs/adr/NNN-wide-events-via-evlog.md` written + indexed in `docs/adr/README.md` | Tasks | Pending |
| OBS-11 | G1 — `ConnectMetaCoexUseCase` enriched with the four step markers + workspaceId + pluginId | Tasks | Pending |

**Coverage:** 11 total, all mapped to design/tasks, 0 unmapped.

---

## Success Criteria

- [ ] Manual verification: `bun dev` running, curl/Postman against
      the Coex Finish route shows the existing HTTP response shape
      **and** one JSON line on stdout with the contracted fields
      (success path and failure path).
- [ ] `bun check` green: typecheck + `vp check` (lint + format + tests)
      + import-depth + zod-v4 + drizzle-naming + drizzle-checksums.
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors (CI strictness).
- [ ] `thermo-nuclear-code-quality-review` on the branch diff raises
      zero structural concerns (or all raised items are resolved
      before ship).
- [ ] A contributor reading `AGENTS.md` reaches the new
      `observability.md` rule in one hop and can instrument the next
      route without consulting external evlog docs.
- [ ] `.specs/research/observability-evlog/` is referenced from
      `observability.md` and the ADR as the canonical deep reference.
