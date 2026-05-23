# Kizunu — Agent Guide

This file is the entry point for any agent working in this repo. Read it, then
follow the links into `.specs/` for depth. Keep changes aligned with what is
documented here.

## What Kizunu is

Kizunu is an open-source, channel-agnostic **sales engagement engine**:
multi-channel outbound cadences with automatic reply-stop and pluggable
providers. WhatsApp is the first channel, but the engine is not WhatsApp-specific
— channels (Meta Cloud API, Telegram, email, SMS) and CRMs (Pipedrive, HubSpot)
enter as plugins/connectors behind frozen contracts.

- **Vision & positioning:** `docs/vision.md`
- **Product voice & design north star:** `PRODUCT.md`, `DESIGN.md`
- **v0.1 scope (the current contract):** `docs/v0.1-scope.md` — a real pilot run
  end-to-end (Pipedrive stage → WhatsApp cadence → reply-stop → mark lost). If any
  part of that doesn't run, v0.1 is not done.

Bun-based monorepo: `apps/` (`api` = NestJS 11, `web` = React 19 + TanStack +
Vite) and shared code in `packages/`.

## Source of truth: `.specs/`

Planning and codebase knowledge live under `.specs/`. Load on demand; do not
duplicate their content here.

### `.specs/project/` — vision and memory

- **`PROJECT.md`** — vision, goals, tech stack, scope boundaries, constraints.
- **`ROADMAP.md`** — the v0.1 milestone broken into features, each with a status
  (`PLANNED` / `IN PROGRESS` / `COMPLETE`); plus Phase 1.5 and future phases.
- **`STATE.md`** — persistent memory across sessions: settled decisions (D1–D7),
  open questions, blockers, lessons, preferences. Update it as work progresses.

### `.specs/codebase/` — brownfield map (read before touching code)

- **`STACK.md`** — frameworks, languages, dependencies, tooling.
- **`ARCHITECTURE.md`** — patterns (per-module hexagonal, use-case unit, nominated
  errors, the end-to-end type-safe API boundary, the `@kizunu/api-client` layout).
- **`CONVENTIONS.md`** — naming/format/zod/drizzle/error rules as the code does them,
  each tied to its enforcing script.
- **`STRUCTURE.md`** — directory tree and where each capability lives.
- **`TESTING.md`** — test frameworks, the coverage matrix, parallelism, gate
  commands, and the test-authoring policy (see "Testing" below).
- **`INTEGRATIONS.md`** — external services (Postgres today; Meta/Pipedrive planned).
- **`CONCERNS.md`** — evidence-backed risks and tech debt, prioritized.

### `docs/adr/` — Architecture Decision Records

Significant decisions are recorded as ADRs, indexed in **`docs/adr/README.md`**.
ADRs are **immutable**: never edit an Accepted ADR — supersede it with a new ADR
and link back. Use the `create-adr` skill to add one.

## Type-safe API boundary

Endpoint shapes are **born in `@kizunu/api-contracts`** and shared by both ends, so
the API and the web client cannot drift. See `.specs/codebase/ARCHITECTURE.md`
("End-to-end type-safe API boundary") for the full flow. In short:

1. **`@kizunu/api-contracts`** owns the truth. Each `*.contract.ts` exports zod
   schemas (top-level v4 formats: `z.email()`, `z.uuid()`, `z.iso.datetime()`) and
   their inferred types. All paths live in one `Routes` table
   (`src/routes/index.ts`): strings for static routes, functions for parameterized
   ones. The error envelope is `{ code, message, context }`.
2. **`apps/api`** turns each schema into a DTO via `createZodDto(...)`; the global
   `ZodValidationPipe` validates input and the `ApplicationExceptionFilter` renders
   the error envelope. Controller paths must match `Routes`.
3. **`@kizunu/api-client`** is the typed browser client — `get/post/patch/put/del<T>`
   over `fetch` (`credentials: 'include'`, no version prefix), `ApiError` (status +
   `code` + intent getters), per-domain `*.api.ts` calling `Routes.*`, and per-action
   `use-*.ts` TanStack Query hooks keyed by `query-keys.ts`.

**Rule:** new endpoints start with a contract in `@kizunu/api-contracts` (schema +
`Routes` entry), then the API controller, then the `*.api.ts` + `use-*.ts` in
`@kizunu/api-client`. The web app consumes the client package
(`@kizunu/api-client/identity/use-current-user`) — do not write bespoke `fetch`
wrappers inside `apps/web`.

## Conventions and rules

Project rules are codified in `.agents/rules/` and enforced by `scripts/check-*.ts`
+ `vp lint`/`vp fmt` (configured in `vite.config.ts`). Read the rule files before
writing code in their area:

- **`conventions.md`** — zod v4 top-level formats, no explicit Drizzle column names,
  migrations are immutable (regenerate via `bun db:generate`), no `../../../` deep
  imports (use `@kizunu/api/*` / `@kizunu/web/*`). All four are script-gated.
- **`code-standards.md`** — English identifiers, camelCase/PascalCase, no magic
  numbers, ≤2 nested `if/else`, ≤3 positional params, no `switch/case`, verb-first
  function names, no `var`, functions under 30 lines, one type per file.
- **`http.md`** — REST resource modeling, plural kebab-case names, JSON, status codes
  (200 ok / 422 business-rule / 500 infra).
- **`react.md`** — functional `.tsx` components, explicit props, state kept local,
  Tailwind utilities, `use`-prefixed hooks, components under ~50 lines.
- **`enums.md`** — closed vocabularies use `const X = {...} as const` + derived type
  (ADR-002); `PayloadMap + Handler<T>` for discriminated dispatch; bare unions only
  for React component-prop variants and internal narrowings of well-known external
  vocabularies (HTTP verbs etc.).
- **`comments.md`** — default to no comments; allow only when the _why_ is
  non-obvious (security, workaround, surprising behavior); JSDoc only for
  tool-surfaced public API; no section headers, test-phase markers, or task/PR
  references.
- **`test.md`** — see Testing below.

### Style basics (always)

- File and folder names in **kebab-case**; avoid vague names (`utils.ts`,
  `helpers.ts`, `misc.ts`) when a better name exists.
- No semicolons, single quotes, sorted imports + Tailwind classes (formatter).
- No emojis in code, commits, logs, or docs.
- Prefer self-explanatory code; comment *why*, not *what*.
- Delete unused variables — never prefix with underscore.

## Testing

**All test implementation goes through the `generate-tests` skill.** It classifies
code on the thin/fat spectrum and writes the right level:

- **Fat** (business rules, branches, validation, transforms) → focused unit/integration
  tests, one rule per test, real objects over mocks (mock only at boundaries).
- **Thin** (orchestration/passthrough) → covered by E2E (an HTTP call); skip dedicated
  tests unless there is a specific reason.

Do not mechanically turn every criterion or every layer into a test. Test details,
the coverage matrix, parallelism, and gate commands are in `.specs/codebase/TESTING.md`
and `.agents/rules/test.md`. Tests use Vitest via `vite-plus/test`; e2e uses
`supertest`. Integration/e2e share `kizunu_test` (serialized, not parallel-safe).

## Setup and validation

- Use **Bun** for all repo scripts and package management. Required: Bun `1.3.13+`,
  Node.js `22+`. Install with `bun install`.
- Dev: `bun dev` (all apps in parallel). Build: `bun build`.
- Typecheck: `bun typecheck`. Lint: `bun lint`. Format: `bun format`. Auto-fix: `bun fix`.
- DB lifecycle: `bun db:setup` / `bun db:test:setup` (Docker Compose under `deploy/`).
- **Full local gate:** `bun check` (see Definition of Done).
- Run the relevant checks after changes — do not stop at code edits.

## Definition of Done

A change is **done** only when all of the following hold. The flow below does not
advance past a feature until they do.

1. **Behavior is complete and matches the spec** — every requirement in the
   feature's `spec.md` is implemented; no `SPEC_DEVIATION` left unresolved.
2. **Tests exist for the behavior** — authored via the `generate-tests` skill (fat
   code has focused tests; thin code is covered by e2e). New/changed behavior is
   covered.
3. **`bun check` is green.** This is the build gate and runs:
   - `bun typecheck` (all packages, `tsc --noEmit`)
   - `bunx vp check` — lint (oxlint, **warnings are errors in CI**) + format check + tests
   - `bun scripts/check-import-depth.ts` (no `../../../` imports)
   - `bun scripts/check-zod-v4.ts` (top-level zod v4 formats only)
   - `bun scripts/check-drizzle-schema-naming.ts` (no explicit column names)
   - `bun scripts/drizzle-checksums.ts verify` (migrations unchanged)
4. **Lint is clean under CI strictness** — `CI=1 bunx vp lint` reports 0 warnings, 0
   errors (CI fails on warnings). Resolve them; do not disable rules except at the
   documented boundaries in `vite.config.ts`.
5. **Conventional Commits** — focused commits, one logical change each, subjects
   describing the outcome; commitlint clean with no warnings.
6. **Docs updated** — if scope/behavior changed, update the relevant `.specs/*`,
   `docs/v0.1-scope.md`, or an ADR. Keep `ROADMAP.md`/`STATE.md` current.

## Skills are invoked, not just read

When this guide names a skill (in **bold**, e.g. `tlc-spec-driven`,
`generate-tests`, `review-and-ship`), that is a **mandatory directive to INVOKE the
skill through the Skill tool** — running it, phase by phase where it has phases —
not an invitation to read its reference files. Reading a skill's markdown is never
a substitute for running it, and producing by hand the artifact a skill would have
produced (a `spec.md`, a `tasks.md`, a test file) does not satisfy the step. Each
skill named in the flow below is required at its step.

If a named skill is genuinely not installed, say so explicitly and stop — do not
silently hand-roll its work. Verify availability from the repo root
(`ls .claude/skills/`), not a subdirectory.

## Default development flow

Every feature — **even one not yet on the roadmap** — runs through this flow,
end to end and autonomously:

1. **Plan by invoking `tlc-spec-driven` at each phase.** Invoke the skill — do not
   just read it — once per phase, in order, producing files under
   `.specs/features/<feature>/`:
   - **Specify** — always → `spec.md`
   - **Context** — when the feature has ambiguous gray areas → `context.md`
   - **Design** — when the scope warrants it (architectural decisions, new
     patterns); you decide per feature whether to invoke it → `design.md`
   - **Tasks** — always → `tasks.md`
   Every feature ends with at minimum `spec.md` and `tasks.md`; never let the
   skill's auto-sizing skip Tasks. If the feature isn't on `ROADMAP.md`, add it.
2. **Branch with `new-branch-and-pr`.** Sync `master`, then
   `git switch -c <type>/<short-description>`. Keep the branch scoped to one
   change set.
3. **Implement by invoking `tlc-spec-driven` (Execute/implement phase).** Drive the
   build through the skill's Execute phase — one task at a time, plan → implement →
   verify → commit — not free-form coding. Follow the conventions and the type-safe
   API boundary; keep commits focused and conventional.
4. **Test with `generate-tests`.** For every task, classify thin/fat and author the
   right tests — never skip this skill for test work.
5. **Reach Definition of Done.** Make `bun check` green and confirm every DoD item.
6. **`thermo-nuclear-code-quality-review`.** Run the strict maintainability audit on
   the branch diff. **Fix everything it raises** — pursue the structural
   simplifications, not just cosmetic nits. Re-run `bun check` after fixing.
7. **Verify alignment with the spec.** Confirm the implemented behavior matches
   `spec.md` (and the v0.1 contract). Resolve any deviation before shipping.
8. **Ship with `review-and-ship`.** Final correctness/regression/intent review,
   commit, push, open or update the PR against `master` with verification notes.
9. **Watch CI with `ci-watcher`.** Monitor the PR's checks.
10. **Fix CI with `fix-ci`** if anything is red — diagnose and apply focused fixes
    until all checks pass. Loop back to `ci-watcher`.
11. **Squash to `master`.** Once CI is green and every Definition-of-Done item is
    satisfied and the feature is spec-aligned, **squash-merge to `master`**
    (autonomous — no human gate). Delete the branch.

Guardrails: never commit or merge with a red `bun check`, failing tests, or red CI;
never bypass git hooks; keep unrelated work on separate branches.

## Branches and commits

- Default branch is `master`. Branch from `master` (`<type>/<short-description>`,
  e.g. `feat/cadence-engine`, `fix/auth-token-expiry`).
- Conventional Commits (enforced by commitlint); one logical change per commit;
  short outcome-describing subjects; wrap body lines; never leave commitlint
  warnings unresolved.

## Documentation

- Update `docs/v0.1-scope.md` when v0.1 scope changes; update `docs/vision.md` when
  long-term positioning shifts. Keep `.specs/` current. Do not let docs silently drift.
- Never change this file (`AGENTS.md`) unless the user explicitly asks.
