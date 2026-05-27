# Observability spike (086) — Context

Gray areas that `spec.md` left implicit, resolved here so `design.md`
and `tasks.md` can plan against fixed decisions. The user authorized
fully autonomous execution; the decisions below are taken in good
faith from the project's conventions and the upstream research bundle
(`.specs/research/observability-evlog/`). Any of them can be re-opened
later via STATE.md or an ADR amendment.

## C1. evlog package version pin

**Decision:** add `evlog@^2.18.1` to `apps/api/package.json` (caret).
**Why:** the upstream package follows semver from 2.x onwards; the
NestJS adapter and the `useLogger` / `createError` API surface are
both stable on the 2.x line per the snippets pulled at commit
`07cf733`. The caret lets us pick up patch fixes (and minor
sampling/redaction improvements) without a new ADR.

## C2. Drain — stdout only, no `createFsDrain` in the spike

**Decision:** do **not** wire any drain. `EvlogModule.forRoot({})`
emits wide events to `console.*` by default (verified in
`logger.ts:240`), which lands on container stdout — exactly what
operators capture today via Docker / Kamal logs.
**Why:** the smallest possible change that proves the shape. A disk
drain (`createFsDrain`) would introduce a writable-volume requirement
on the API container; an OTLP drain would force the Monoscope
decision the roadmap defers.

## C3. Where the module is imported

**Decision:** `ApiModule` (`apps/api/src/api.module.ts`) imports
`EvlogModule.forRootAsync({ inject: [ConfigService], useFactory })`.
The factory reads `service`/`environment`/`version` from `ConfigService`
(existing `Config` schema, no new env vars required if the values
already exist; otherwise add three optional config fields).
**Why:** every other cross-cutting concern (mail, persistence,
exception filter, auth) is wired in `ApiModule` via `APP_FILTER` /
`APP_GUARD` providers or `Module.forRoot…` imports. Matching that
pattern keeps the module wiring grep-discoverable.

## C4. Filter ordering — keep `ApplicationExceptionFilter`, add `UnhandledExceptionFilter`

**Decision:** keep the existing `@Catch(ApplicationException)`
`ApplicationExceptionFilter` exactly as-is on the wire (response
envelope unchanged). Inside its `catch`, additionally call
`useLogger().error(exception)` so the wide event captures the
structured error.

Add a new last-resort `@Catch()` filter (no class arg) registered as
a second `APP_FILTER` provider that runs *after* `ApplicationExceptionFilter`
in registration order. Its job: call `useLogger().error(unknown)`,
then rethrow so NestJS's built-in catch-all renders the default 500
response. This keeps the HTTP behavior identical to today's behavior
for unhandled errors.

**Why:** swapping the existing filter for evlog's example pattern
(which renders `{ message, why, fix, link }` to the response) would
break the api-contracts wire envelope. Composition over replacement.

## C5. Where the new last-resort filter lives

**Decision:** `packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts`.
**Why:** filters that any app might want belong in `nestjs-shared`
(the same package that already exports `ApplicationExceptionFilter`).
The web app does not consume it, but the package is the right home —
matches `application-exception.filter.ts` placement exactly.

## C6. Where the enrichment & redaction logic lives

**Decision:** a thin helper module
`apps/api/src/shared/observability/evlog-options.ts` exporting:

- `buildEvlogOptions(config: ConfigService<Config>)` — assembles the
  `EvlogNestJSOptions` (service/environment/version from config,
  `exclude: ['/health']`, the redaction `enrich` callback).
- `REDACTION_KEYS` — the closed-vocabulary list of paths to mask.

`ApiModule` calls `buildEvlogOptions` from its `forRootAsync` factory.

**Why:** keeps the module's wiring under ~30 lines; gives the rule
file something concrete to point at; makes the redaction list
unit-testable via `generate-tests` (fat code: a small ruleset is
exactly the case where the skill says "focused unit test, one rule per
test").

## C7. Per-step enrichment inside `ConnectMetaCoexUseCase`

**Decision:** the use case wraps each of its four phases in a single
`useLogger().set({ step: '<phase>' })` call placed at the start of
the phase. The phases are:

1. `assert-configured` — before `assertConfigured()`.
2. `oauth-exchange` — before `exchange(...)`.
3. `coex-finalize` — before `finalizeMetaCoexConnection(...)`.
4. `persist-account` — before `accounts.create(...)`.

We also `log.set({ workspaceId: input.workspaceId, pluginId: MetaPluginId.Coex })`
at the top of `execute`. No timing per phase in the spike (the wide
event already carries the request total duration; per-phase timing is
a follow-up).

**Why:** four phases is the natural decomposition already encoded in
the use-case body. Adding step-level enrichment requires four
one-line `log.set` calls and no restructure.

## C8. Redaction vocabulary

**Decision:** the `REDACTION_KEYS` constant masks (replaces value with
`'[redacted]'`) any object key whose name matches, *case-sensitively*,
one of:

- `credentials`
- `accessToken`
- `appSecret`
- `verifyToken`
- `client_secret`
- `code` *(only when the path is under `request.body` / `input` —
  see C8.1)*

**C8.1.** A literal `code` key on the wide event's top level would
collide with `error.code` (the `ApplicationException` dot-namespaced
code, which we **want** in the event). The enricher therefore scopes
its masking to known credential-bearing paths: it walks `event.input`,
`event.request`, `event.body`, and any explicitly attached
`event.credentials` subtree. Other `code` occurrences pass through.

**Why:** the OAuth short-lived code, the WhatsApp `accessToken`, the
Meta `appSecret`, and the per-WABA `verifyToken` are the fields a
leak would actually hurt; the rest is signal. We deliberately do not
ship a generic deny-list (regex over key paths) because the path
walking above is enough for the spike and easier to test.

## C9. ADR numbering

**Decision:** the new ADR takes the next sequential number from
`docs/adr/README.md`. Per memory + `AGENTS.md` ADRs are immutable;
title is **"Wide-event observability via `evlog`"**.

(Concrete number determined when `tasks.md` is written — depends on
the highest ADR currently indexed.)

## C10. Tests

**Decision:** delegated to the `generate-tests` skill at execute
time. Pre-classification (informational only — the skill is the
authority):

- `buildEvlogOptions` + `REDACTION_KEYS` enricher → **fat** (a rule
  set with branches → focused unit tests, one rule per test).
- `UnhandledExceptionFilter` → **fat** (translates `unknown → wide
  event payload`, with a fallback when `useLogger()` is unbound →
  one or two focused unit tests).
- `ApplicationExceptionFilter` enrichment (the additional
  `useLogger().error()` call) → **thin** orchestration; covered by
  the existing module e2e if any, or via a new tiny integration test
  that instantiates the filter against a `createMemoryDrain()`.
- `ConnectMetaCoexUseCase` step enrichment → **thin** (one `set`
  per phase; covered indirectly by the existing
  `meta-coex-connect.spec.ts` e2e if we extend that file to assert on
  the emitted event).

The skill makes the final call.

## C11. What "one route end-to-end" means for verification

**Decision:** "end-to-end" for this spike means: a real HTTP request
through the live Nest stack (e2e Supertest path, the existing
`meta-coex-connect.spec.ts`) plus a manual smoke (`bun dev`, curl,
visual check on container stdout). We do **not** add a new
"observability e2e" test pyramid — `generate-tests` decides whether
the existing e2e needs an assertion on the memory-drain capture.

## C12. Web / frontend

**Decision:** none. No `apps/web` change. No `@kizunu/api-contracts`
change. No `@kizunu/api-client` change.
**Why:** G3 of `spec.md` explicitly anchors the HTTP wire.

## C13. Boot-time `console.*` calls in `main.ts`

**Decision:** leave the three `console.*` calls in `main.ts`
untouched. They run outside any request stack (no AsyncLocalStorage
binding), so `useLogger()` would throw. The decision is documented in
the rule as a known limitation; a future feature can introduce a
boot-time logger if pilot operators ask.

## C14. Failure-to-bind behavior

**Decision:** the new last-resort filter SHALL guard its
`useLogger()` call with a try/catch that swallows the throw — exactly
as the upstream example does (`snippets/evlog-nestjs-example/app.controller.ts:28-31`).
If the request never passed through evlog middleware (theoretical:
something thrown before middleware ran), we silently fall back to
Nest's default rendering.

## C15. What we explicitly do not configure

| Option | Spike value | Rationale |
| --- | --- | --- |
| `sampling` | unset (100%) | One low-traffic route; tuning later. |
| `silent` | unset (false) | We want stdout output; no drain to deduplicate against. |
| `redact` (built-in upstream config) | not used | Our `enrich` callback handles redaction in-place; we control the rule, the test, and the doc. |
| `enrich` (custom) | yes — assembled by `buildEvlogOptions` | Carries the redaction walk + any future global fields (region, build sha) without re-touching the module wiring. |
| `exclude` | `['/health']` | C2 / C6 — no event per liveness probe. |
