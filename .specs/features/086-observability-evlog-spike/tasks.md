# Wide-event observability spike via `evlog` (086) — Tasks

**Design**: `.specs/features/086-observability-evlog-spike/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (sequential)

```
T1
```

### Phase 2: Library, app & docs (parallel after T1)

```
     ┌→ T2 [P] ┐
     ├→ T3 [P] ┤
T1 ──┼→ T5 [P] ├──→ T4
     ├→ T6 [P] ┤
     └→ T7 [P] ┘
```

### Phase 3: Tests, gates, ship (sequential)

```
T4 → T8 → T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Add `evlog` dependency + observability options module

**What**: Add `evlog@^2.18.1` to `apps/api/package.json` `dependencies`; run
`bun install` so the lockfile updates. Create the options module
`apps/api/src/shared/observability/evlog-options.ts` exporting (a)
`REDACTION_KEYS` — a frozen, kebab-keyed list per design.md/C8 (`credentials`,
`accessToken`, `appSecret`, `verifyToken`, `client_secret`, plus path-scoped
`code`), (b) `redactionEnricher(ctx)` — walks
`ctx.event.{input, request, body, credentials}` and replaces matching keys
with `'[redacted]'`, (c) `buildEvlogOptions(config)` — assembles
`EvlogNestJSOptions` (`service`, `environment`, `version` read from
`ConfigService<Config>`, `exclude: ['/health']`, the enricher). Extend
`Config` with three optional fields (`service?: string`,
`environment?: string`, `version?: string`) only if they are not already
present.

**Where**:

- `apps/api/package.json` (dependency)
- `apps/api/src/shared/observability/evlog-options.ts` (new)
- `apps/api/src/api.config.ts` (only if the three fields are missing — read
  the file first)

**Depends on**: None

**Reuses**: `ConfigService` from `@kizunu/config-module`; `Config` type
from `apps/api/src/api.config`; `EvlogNestJSOptions` from `evlog/nestjs`;
`EnrichContext` from `evlog`.

**Requirement**: OBS-02, OBS-06, OBS-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `apps/api/package.json` lists `evlog: ^2.18.1`.
- [ ] `bun install` succeeded; lockfile updated.
- [ ] `evlog-options.ts` ≤ 30 lines per function; file ≤ ~80 lines total.
- [ ] `REDACTION_KEYS` is a `const X = [...] as const` (per
      `.agents/rules/enums.md` §1 — closed vocabulary).
- [ ] `buildEvlogOptions(config)` returns a pure object; no side-effects.
- [ ] No `../../../` imports (uses `@kizunu/api/*`).
- [ ] No comments narrating *what* the code does; allowed only on the path
      scoping for `code` (the only non-obvious bit per C8.1).
- [ ] File is under `apps/api/src/shared/observability/` — sibling to
      `shared/http/` (matches the existing layout).

**Tests**: covered by T8 (focused unit specs on `REDACTION_KEYS`
+ `redactionEnricher`)
**Gate**: `bun typecheck`

**Verify**:

```
test -f apps/api/src/shared/observability/evlog-options.ts && \
  bun typecheck && \
  grep -q '"evlog"' apps/api/package.json
```

**Commit**: `feat(api): add evlog dep + observability options module`

---

### T2: `UnhandledExceptionFilter` in `@kizunu/nestjs-shared` [P]

**What**: Add a last-resort `@Catch()` filter at
`packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts` that
captures any non-`ApplicationException` throw into the request-scoped wide
event via `useLogger().error(parsedError)`, then rethrows so NestJS's
built-in catch-all renders the default 500. Guard the `useLogger()` call
with a try/catch (C14) so a request that never passed through the evlog
middleware (theoretically: a throw upstream of the middleware) still
propagates cleanly. Export from the package's barrel so consumers can
import it as `@kizunu/nestjs-shared/lib/filters/unhandled-exception.filter`.

**Where**:

- `packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts`
  (new)
- `packages/nestjs-shared/src/index.ts` (or the existing barrel — read
  first; add the export only if other filters are re-exported there)

**Depends on**: T1 (depends on the `evlog` dependency being present in the
workspace; the package itself doesn't import `evlog` directly, but the
resolver needs it hoistable)

**Reuses**: `@nestjs/common` (`Catch`, `ExceptionFilter`, `ArgumentsHost`);
`useLogger` and `parseError` from `evlog/nestjs` and `evlog` respectively.

**Requirement**: OBS-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] File exists with `@Catch()` decorator (no class arg).
- [ ] `catch` body ≤ 25 lines (per `code-standards.md` §10).
- [ ] `useLogger()` call wrapped in `try { … } catch {}` (C14).
- [ ] Rethrows the original exception after logging — does NOT render a
      response itself.
- [ ] No comments narrating; one-line comment allowed on the guard if it
      explains *why* (C14's middleware-miss scenario).

**Tests**: T8 will cover this (fat — two unit specs).
**Gate**: `bun typecheck`

**Verify**:

```
test -f packages/nestjs-shared/src/lib/filters/unhandled-exception.filter.ts && \
  bun typecheck
```

**Commit**: `feat(nestjs-shared): add UnhandledExceptionFilter`

---

### T3: `ApplicationExceptionFilter` enriches the wide event [P]

**What**: Mutate
`packages/nestjs-shared/src/lib/filters/application-exception.filter.ts`.
Inside the existing `catch`, before the `response.status(...).json(...)`
call, add a guarded `useLogger().error(exception)` so the wide event for
the request carries the structured error. Wire envelope **unchanged**
(spec G3 / OBS-03). Body still ≤ 25 lines.

**Where**:

- `packages/nestjs-shared/src/lib/filters/application-exception.filter.ts`
  (edit in place)

**Depends on**: T1 (dep hoist)

**Reuses**: existing `ApplicationException` import; `useLogger` from
`evlog/nestjs`.

**Requirement**: OBS-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `useLogger().error(exception)` added inside `catch`, guarded by
      try/catch (C14).
- [ ] `response.status(exception.suggestedHttpStatusCode).json({ code, message, context })`
      preserved byte-for-byte.
- [ ] No new imports beyond `useLogger`.
- [ ] No new exception fields surface on the HTTP response.
- [ ] File still ≤ 25 lines total (currently 16; add ~4).

**Tests**: T8 — thin per design.md; covered indirectly by existing e2e on
any `ApplicationException`-throwing route.
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck && \
  grep -q "useLogger" packages/nestjs-shared/src/lib/filters/application-exception.filter.ts
```

**Commit**: `feat(nestjs-shared): application-filter enriches wide event`

---

### T5: Enrich `ConnectMetaCoexUseCase` with step markers [P]

**What**: Add five `useLogger().set(...)` calls inside
`apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts`
per design.md/C7: at the top of `execute`, `log.set({ workspaceId, pluginId: MetaPluginId.Coex })`;
then one `log.set({ step: '<kebab-name>' })` immediately before each of
the four phases (`assert-configured`, `oauth-exchange`, `coex-finalize`,
`persist-account`). No body restructure. No new control flow. Import
`useLogger` from `evlog/nestjs`.

**Where**:

- `apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts`
  (edit in place)

**Depends on**: T1 (dep)

**Reuses**: existing method body; existing `MetaPluginId` import; no new
deps beyond `useLogger`.

**Requirement**: OBS-01, OBS-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Top-of-`execute` carries `useLogger().set({ workspaceId, pluginId })`.
- [ ] Four `useLogger().set({ step: '<phase>' })` calls present, one per
      phase, before its respective call (`assertConfigured`, `exchange`,
      `finalizeMetaCoexConnection`, `accounts.create`).
- [ ] No timing/duration captured per phase (out of scope per C7).
- [ ] No comments restating the step name; the kebab-case literal IS the
      name.
- [ ] File still passes ≤30-line per-function rule (`execute` was 30 LOC;
      adding 5 `log.set` lines remains within limit *or* extract to a
      private helper `enrichStep(name: string)` if needed).
- [ ] `MetaPluginId.Coex` is still the source of truth (no string literal
      duplication).

**Tests**: T8 — thin per design.md; the existing
`apps/api/src/__test__/e2e/meta-coex-connect.spec.ts` exercises the path.
`generate-tests` decides whether to extend it with a memory-drain
assertion.
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck && \
  grep -c "useLogger()\.set" apps/api/src/modules/channel/core/use-cases/connect-meta-coex.use-case.ts
# Expected: ≥5 occurrences
```

**Commit**: `feat(channel): enrich coex finish use case with wide-event steps`

---

### T6: Add `.agents/rules/observability.md` + AGENTS.md index entry [P]

**What**: Write the operational rule per design.md/F. Seven sections; ≤
~150 lines; English; no comments narrating code; bad/good examples;
canonical example points at `ConnectMetaCoexUseCase`, the two filters,
and `REDACTION_KEYS`. Add one bullet in `AGENTS.md` "Conventions and
rules" pointing at `observability.md` with a one-line summary in the same
voice as the other rules.

**Where**:

- `.agents/rules/observability.md` (new)
- `AGENTS.md` (one bullet appended in the rules list)

**Depends on**: T1 (so the rule can cite real file paths in examples)

**Reuses**: format of `.agents/rules/{react,web-patterns,base-ui,comments,enums}.md`.

**Requirement**: OBS-08, OBS-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `observability.md` exists with the seven sections from design.md/F;
      ≤ ~150 lines.
- [ ] § 2 explicitly states the
      `ApplicationException` ↔ wide-event composition and that
      `createError` is NOT adopted for domain errors.
- [ ] § 3 lists the `REDACTION_KEYS` vocabulary and points at the central
      enricher.
- [ ] § 4 cites the four kebab-case step markers from Coex Finish as the
      canonical example.
- [ ] § 7 links the in-repo research bundle, `comments.md`, the new ADR,
      and `react.md` § 0 (sibling convention).
- [ ] AGENTS.md "Conventions and rules" lists `observability.md` with the
      same one-line voice as the other entries.
- [ ] No semicolons / single quotes in TS samples.
- [ ] No `// 1.`, AAA, or task/PR references inside the rule.

**Tests**: none (pure documentation)
**Gate**: visual + `bun typecheck` (the rule file should not be parsed,
but the AGENTS.md edit must not regress anything else)

**Verify**:

```
test -f .agents/rules/observability.md && \
  grep -q "observability.md" AGENTS.md && \
  grep -q "REDACTION_KEYS" .agents/rules/observability.md
```

**Commit**: `docs(rules): add observability.md wide-event rule`

---

### T7: Add ADR `009-wide-events-via-evlog.md` + index [P]

**What**: Write the ADR per design.md/G. Standard layout (Status / Context
/ Decision / Consequences / Alternatives / References). Number assigned
the next sequential slot — `009` (after `008-forms-react-hook-form-zod.md`).
Append one row to `docs/adr/README.md` in numeric order.

**Where**:

- `docs/adr/009-wide-events-via-evlog.md` (new)
- `docs/adr/README.md` (one row appended)

**Depends on**: T1 (so the ADR can cite the real options module)

**Reuses**: format of `docs/adr/008-forms-react-hook-form-zod.md`.

**Requirement**: OBS-10

**Tools**:

- MCP: NONE
- Skill: `create-adr` (preferred if installed) — otherwise hand-write per
  the format

**Done when**:

- [ ] File exists at `docs/adr/009-wide-events-via-evlog.md`; ≤ ~200
      lines; English; no emoji.
- [ ] Status: Accepted (per project convention — ADRs land Accepted, not
      Proposed).
- [ ] "Alternatives" section explicitly names NestJS `Logger` + pino,
      OpenTelemetry SDK auto-instrumentation, and no-observability.
- [ ] "Consequences" calls out the stdout-default drain choice + that
      OTLP/Monoscope is deferred to Phase 1.7+`028`.
- [ ] "References" links `.specs/research/observability-evlog/`,
      `.agents/rules/observability.md`, and feature 086.
- [ ] `docs/adr/README.md` lists ADR 009 in numeric order, format
      matches the existing eight rows.

**Tests**: none
**Gate**: visual

**Verify**:

```
test -f docs/adr/009-wide-events-via-evlog.md && \
  grep -q "009-wide-events-via-evlog" docs/adr/README.md
```

**Commit**: `docs(adr): 009 wide events via evlog`

---

### T4: Wire `EvlogModule.forRootAsync` + `UnhandledExceptionFilter` into `ApiModule`

**What**: Edit `apps/api/src/api.module.ts`. Add an import for
`EvlogModule` from `evlog/nestjs`; add
`EvlogModule.forRootAsync({ inject: [ConfigService], useFactory: (config) => buildEvlogOptions(config) })`
to `imports[]`. Add an `APP_FILTER` provider for `UnhandledExceptionFilter`
*after* the existing `ApplicationExceptionFilter` provider (NestJS
resolves the more specific filter first, falls back to the `@Catch()`
filter for unhandled cases).

**Where**:

- `apps/api/src/api.module.ts` (edit in place)

**Depends on**: T1, T2, T3 (must exist before they can be wired)

**Reuses**: existing `APP_FILTER` import; existing `ConfigService` use;
the new `buildEvlogOptions` and `UnhandledExceptionFilter`.

**Requirement**: OBS-02, OBS-04, OBS-05, OBS-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `EvlogModule` import added.
- [ ] `EvlogModule.forRootAsync(...)` present in `imports[]`.
- [ ] Second `APP_FILTER` provider for `UnhandledExceptionFilter`
      present in `providers[]`, *after* the
      `ApplicationExceptionFilter` provider.
- [ ] No other top-level changes to `ApiModule` (controllers, providers,
      imports unchanged otherwise).
- [ ] File length still under the soft cap (currently ≤ ~60 lines).

**Tests**: covered transitively by every existing e2e (which now flow
through the middleware).
**Gate**: `bun typecheck`

**Verify**:

```
bun typecheck && \
  grep -q "EvlogModule" apps/api/src/api.module.ts && \
  grep -q "UnhandledExceptionFilter" apps/api/src/api.module.ts
```

**Commit**: `feat(api): wire EvlogModule + UnhandledExceptionFilter`

---

### T8: Author focused tests via `generate-tests`

**What**: Invoke the `generate-tests` skill against three artifacts:
`evlog-options.ts` (fat — redaction rule set), `unhandled-exception.filter.ts`
(fat — translates unknown→event + guarded), and the
`ConnectMetaCoexUseCase` enrichment (thin — let the skill decide whether
the existing e2e needs an extension via a memory drain). The skill is
the authority on thin/fat classification and on whether to extend the
existing e2e.

**Where**:

- `apps/api/src/shared/observability/__test__/...` (paths owned by the
  skill)
- `packages/nestjs-shared/src/lib/filters/__test__/...` (path owned by
  the skill)
- Possibly extend `apps/api/src/__test__/e2e/meta-coex-connect.spec.ts`

**Depends on**: T1, T2, T3, T5

**Reuses**: Vitest harness; `createMemoryDrain()` from `evlog` for any
integration spec the skill writes.

**Requirement**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-07, OBS-11

**Tools**:

- MCP: NONE
- Skill: `generate-tests`

**Done when**:

- [ ] Specs exist for `REDACTION_KEYS` + `redactionEnricher` (one rule
      per test).
- [ ] Specs exist for `UnhandledExceptionFilter` (happy path +
      middleware-miss guard path).
- [ ] The skill's call on whether to extend the Coex e2e is honored
      (extend or skip — record the decision in the PR description).
- [ ] `bun test:unit` (or the package's relevant target) runs the new
      specs and passes.

**Tests**: unit + (possibly) one integration extension
**Gate**: `bun test:unit` (and `bun test:integration` if the skill
extended the Coex e2e)

**Verify**:

```
bun test:unit
```

**Commit**: `test(api,nestjs-shared): cover evlog options + unhandled filter`

---

### T9: `bun check` gate (full)

**What**: Run the full quality gate; iterate fixes until green.

**Where**: Repo root.

**Depends on**: T4, T6, T7, T8

**Reuses**: `scripts/check.sh` orchestration.

**Requirement**: gate

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `bun check` exits 0 (typecheck + `bunx vp check` lint/format/tests
      + `check-import-depth.ts` + `check-zod-v4.ts` +
      `check-drizzle-schema-naming.ts` + `drizzle-checksums.ts verify`).
- [ ] `CI=1 bunx vp lint` reports 0 warnings, 0 errors.
- [ ] No test fallout from JSON-line stdout (if any test asserts on
      empty stdout, pass `silent: true` to that test's
      `EvlogModule.forRoot`).

**Tests**: full gate
**Gate**: full

**Verify**:

```
bun check
CI=1 bunx vp lint
```

**Commit**: (none — gate task; commits land on T1–T7)

---

### T10: `thermo-nuclear-code-quality-review` on branch diff

**What**: Invoke the strict-maintainability skill against the branch
diff. Apply every structural fix it raises (not just cosmetic). Re-run
`bun check`. Common shapes to expect on this diff: an `enrichStep` helper
in the use case if `execute` grew past 30 lines; the redaction walk
extracted to a pure helper if it grew past 30 lines; an unused import.

**Where**: Branch `feat/086-observability-evlog-spike`.

**Depends on**: T9

**Reuses**: `thermo-nuclear-code-quality-review` skill.

**Requirement**: AGENTS.md flow step 6

**Tools**:

- MCP: NONE
- Skill: `thermo-nuclear-code-quality-review`

**Done when**:

- [ ] Skill runs; every raised finding is either fixed or has a written
      one-line rebuttal in the PR description.
- [ ] `bun check` re-runs green after fixes.

**Tests**: none (review)
**Gate**: full (re-run after fixes)

**Verify**: Skill output captured; `bun check` exit 0.

---

### T11: Verify spec alignment + manual smoke

**What**: Walk the spec acceptance criteria (P1 AC 1–4, P2 AC 1–3, P3
AC 1–2) against the implemented behavior. Bring up `bun dev` (or the
container, whichever the project's `run` skill picks). Curl/Postman
the Coex Finish route with (a) a payload that succeeds against a fake
plugin, and (b) a payload that triggers `MetaCoexNotConfiguredException`.
Capture stdout. Confirm one JSON line per request with the contracted
fields; confirm the HTTP response is byte-identical to the pre-spike
shape.

**Where**: Running dev server / docker container + curl + stdout
capture.

**Depends on**: T10

**Reuses**: `bun dev`; the `run` skill if it covers `apps/api`.

**Requirement**: All OBS-*

**Tools**:

- MCP: NONE
- Skill: `verify` (optional helper) or `run`

**Done when**:

- [ ] Success path: one JSON line on stdout matching AC 1 (timestamp,
      level=info, method=POST, path, status=201, duration, requestId,
      workspaceId, pluginId=meta-whatsapp-coex, four step markers
      present); HTTP body matches pre-spike `{ id, pluginId,
      channelMode, name }`.
- [ ] Known-failure path: one JSON line on stdout matching AC 2
      (level=error, status from the exception, error block with `code`,
      `message`, optional `context`); HTTP body matches pre-spike
      `{ code, message, context }`.
- [ ] (If reachable) Unhandled-error path: one JSON line matching AC 3
      (level=error, status=500, error block, no `code` namespace);
      HTTP body is Nest's default 500.
- [ ] AC 4: `x-request-id` header honored when present; UUID
      generated otherwise.
- [ ] No `SPEC_DEVIATION` outstanding.

**Tests**: manual (HTTP + stdout)
**Gate**: none

**Verify**: Notes attached to the PR description.

---

### T12: `review-and-ship` → PR → `ci-watcher` → squash-merge → HISTORY sweep

**What**: Final correctness/intent review via the skill; commit, push,
open PR against `master` with the rule + ADR + the new filter +
options module + use-case enrichment cited; watch CI; `fix-ci` if
anything goes red; squash-merge once green. Delete branch. Sweep the
`086` entry from `ROADMAP.md → Now` into `HISTORY.md` Phase 2.2 (per
AGENTS.md DoD §6).

**Where**: Branch → PR → `master` → `ROADMAP.md` / `HISTORY.md`.

**Depends on**: T11

**Reuses**: `review-and-ship`, `ci-watcher`, `fix-ci` skills.

**Requirement**: AGENTS.md flow steps 8–11 + DoD §6

**Tools**:

- MCP: NONE
- Skill: `review-and-ship`, `ci-watcher`, `fix-ci`

**Done when**:

- [ ] PR opened against `master` with description quoting the rule, the
      ADR, the four code touchpoints, and the verification notes from T11.
- [ ] CI (the `Required (CI)` aggregator) is green.
- [ ] Squash-merged to `master`; branch deleted.
- [ ] `ROADMAP.md → Now` no longer carries `086`; `HISTORY.md` gains
      a new "Phase 2.2 — Observability spike" section with the
      _Landed_ blurb migrated from `ROADMAP.md`.
- [ ] STATE.md gains a Lessons entry capturing the doctrine — at least:
      "Wide events via `evlog` are the project's structured-logging
      pattern; HTTP wire envelope is frozen at `{ code, message, context }`;
      `createError` is not adopted for domain errors; redaction
      vocabulary lives in `apps/api/src/shared/observability/evlog-options.ts`.
      See ADR-009 / `.agents/rules/observability.md`."

**Tests**: full CI
**Gate**: full

**Verify**: `gh pr view --json mergedAt,state` shows merged.

---

## Parallel Execution Map

```
Phase 1 (sequential):
  T1 (dep + options module)

Phase 2 (parallel after T1):
  ├── T2 [P]  UnhandledExceptionFilter (nestjs-shared)
  ├── T3 [P]  ApplicationExceptionFilter mutation (nestjs-shared)
  ├── T5 [P]  Coex use-case enrichment (apps/api)
  ├── T6 [P]  observability.md rule + AGENTS.md
  └── T7 [P]  ADR-009 + README index

Sequential bridge:
  T4 (ApiModule wiring) — depends on T1, T2, T3

Phase 3 (sequential):
  T8 (tests) → T9 (bun check) → T10 (thermo-nuclear) → T11 (verify) → T12 (ship)
```

Each [P] task touches a disjoint file set:

- T2 / T3 — different files in `packages/nestjs-shared/src/lib/filters/`.
- T5 — single file in `apps/api/src/modules/channel/...`.
- T6 — `.agents/rules/observability.md` + a single bullet in `AGENTS.md`.
- T7 — `docs/adr/009-*.md` + one row in `docs/adr/README.md`.

The only overlap risk is two parallel commits both editing `AGENTS.md`
(T6) and `docs/adr/README.md` (T7) — not the same file, no merge
conflict. The two `packages/nestjs-shared/` filter edits are in
different files (one new, one mutation).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | dep + new options module + (maybe) Config extension | Granular |
| T2 | one new filter file | Granular |
| T3 | one filter mutation (~4 LOC) | Granular |
| T4 | one module wiring | Granular |
| T5 | one use-case enrichment (~6 LOC) | Granular |
| T6 | rule + AGENTS.md index | Granular |
| T7 | ADR + README index | Granular |
| T8 | tests via skill | Granular |
| T9 | gate run | Granular |
| T10 | review skill + fixes | Granular |
| T11 | manual smoke | Granular |
| T12 | PR lifecycle + HISTORY sweep | Granular |

---

## Diagram–Definition Cross-Check

| Task | Depends on (body) | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | — | OK |
| T2 | T1 | T1 → T2 | OK |
| T3 | T1 | T1 → T3 | OK |
| T5 | T1 | T1 → T5 | OK |
| T6 | T1 | T1 → T6 | OK |
| T7 | T1 | T1 → T7 | OK |
| T4 | T1, T2, T3 | T2/T3 → T4 | OK |
| T8 | T1, T2, T3, T5 | T4/T5 → T8 (T8 also needs T2/T3 — covered transitively) | OK |
| T9 | T4, T6, T7, T8 | T8 → T9 | OK |
| T10 | T9 | T9 → T10 | OK |
| T11 | T10 | T10 → T11 | OK |
| T12 | T11 | T11 → T12 | OK |

All match.

---

## Test Co-location Validation

| Task | Code layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | fat (rule set, enricher) | focused unit | via T8 | OK |
| T2 | fat (translation + guard) | focused unit | via T8 | OK |
| T3 | thin (single delegate call) | e2e covers | via T8 | OK |
| T4 | thin (config wiring) | e2e covers transitively | n/a | OK |
| T5 | thin (5 enrichment calls) | e2e covers; skill decides extension | via T8 | OK |
| T6 | doc | none | none | OK |
| T7 | doc | none | none | OK |
| T8 | tests | (this IS the test step) | yes | OK |
| T9 | gate | full | full | OK |
| T10 | review | full (re-run) | full (re-run) | OK |
| T11 | manual verify | smoke | yes | OK |
| T12 | CI gate | full | full | OK |

**Rationale for thin/fat split**: per `TESTING.md`'s matrix and
`generate-tests`' classification, the redaction rule set + the unknown→event
translation are the only artifacts encoding rules. Everything else is
orchestration glued by NestJS infrastructure (`APP_FILTER` providers,
middleware) and is covered by the existing e2e once it flows through the
new middleware. The skill makes the final call on each.

---

## Tools and skills

- **Implementation (T1–T7)**: hand-edited; mechanical scope.
- **Tests (T8)**: `generate-tests` skill.
- **Gate (T9)**: `bun check` shell.
- **Quality review (T10)**: `thermo-nuclear-code-quality-review` skill.
- **Smoke (T11)**: `verify` or `run` skill (optional); curl + stdout
  capture.
- **Ship (T12)**: `review-and-ship` → `ci-watcher` → `fix-ci`.
- **Branch (before T1)**: `new-branch-and-pr` skill (orchestrates the
  `master` sync + `git switch -c feat/086-observability-evlog-spike`).

No new MCPs required for the implementation tasks themselves.
