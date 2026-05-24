# 041 — Web Patterns and Layering Specification

## Problem Statement

The backend is well-codified — per-module hexagonal layering, nominated errors,
contracts-first DTOs, and six ADRs spell out *how* to build it. The web app has
no equivalent. `react.md` covers individual primitives (functional components,
shadcn-first, Tailwind utility-first), and the recent 033–039 remake gave us a
consistent shell and screen set, but neither documents *how a new feature is
laid out*. As a result, every new web feature reinvents the route ↔ feature ↔
component boundary, URL state is hand-rolled per page, mutation hooks return
inconsistent shapes, and shared composites (`PageHeader`, `DataTable`,
`EmptyState`, `ResourceDialog`) have nowhere to live.

This feature codifies the web layering and patterns once, as an ADR plus an
enforceable rule file, and seeds the shared composites the rule references.
Existing code under `features/<f>/` is *not* migrated — it converts
opportunistically as each feature is next touched.

## Goals

- [ ] ADR-007 is accepted and indexed in `docs/adr/README.md`, recording the
  route-colocated layering, the mutation-hook shape, the invalidation
  ownership, and the URL-state recipe — with enough rationale that a future
  contributor can judge edge cases without re-litigating the call.
- [ ] `.agents/rules/web-patterns.md` exists and is referenced by `AGENTS.md`
  alongside the other rule files, covering pages, forms, URL state, data
  tables, dialogs, and error handling, all in the project's English-only /
  comment-sparse / ≤50-line-component / ≤30-line-function dialect.
- [ ] The shared composites the rule references (`PageHeader`, `EmptyState`,
  `DataTable`, `TablePagination`, `ResourceDialog`, `DeleteResourceDialog`, the
  `Field*` + `FormError` form primitives) exist under
  `apps/web/src/components/`, reusing anything already present and adding only
  the genuinely missing ones.
- [ ] `.specs/codebase/STRUCTURE.md` and `docs/web-structure.md` describe the
  route-colocated tree (`routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`),
  the promotion-to-`components/` rule, and the deprecation of the top-level
  `features/` folder for new work.
- [ ] `bun check` is green at every commit; no behavior changes ship in this
  branch (composites are new files or pure-extract refactors).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Bootstrap Vitest + RTL for `apps/web` | Listed in `CONCERNS.md` ("no frontend tests") — separate effort, drives its own ADR / tooling choices. |
| Refactor existing `packages/api-client/*/use-*.ts` hooks to the new shape | Touches every web call site; out of this branch's blast radius. Rule applies going forward; opportunistic migration as call sites change. |
| Migrate `apps/web/src/features/<f>/` into `routes/_app/<f>/-*` colocation | "New code only" decision locked with user. Each existing feature converts the next time it's touched. |
| Any `apps/api/` change | This is a web-only concern. |
| New feature work, new screens | This branch documents and seeds; it doesn't ship product surface. |

---

## User Stories

### P1: A contributor opening a new web feature finds one prescriptive recipe ⭐ MVP

**User Story**: As a contributor (human or agent) starting a new web feature,
I want one place that tells me where the route file goes, where the form lives,
how URL state is wired, how the mutation hook is shaped, and which composites
to reuse — so I don't have to read three existing features and guess what the
convention is.

**Why P1**: This is the actual job. Without it the feature is just a tree
rearrangement.

**Acceptance Criteria**:

1. WHEN the contributor reads `.agents/rules/web-patterns.md` THEN it SHALL
   prescribe, for a typical CRUD-ish feature: (a) the route tree under
   `routes/_app/<feature>/`, (b) the smart-page / dumb-form split, (c) the
   `FieldGroup`/`Field`/`FieldLabel`/`FieldError`/`FormError` form primitives,
   (d) the URL-state pattern (Zod schema + `use-<feature>-search` hook reading
   `Route.useSearch()`), (e) the `DataTable` + `TablePagination` composition,
   (f) the `ResourceDialog` / `DeleteResourceDialog` composition for modals,
   (g) the error-handling table mapping query-failure / mutation-on-form-page /
   mutation-in-dialog to `EmptyState` / `FormError` / `toast.error`.
2. WHEN the contributor follows the rule end-to-end THEN the resulting code
   SHALL satisfy `bun check` without needing a lint override (English-only
   identifiers, ≤50-line components, ≤30-line functions, ≤3 positional params,
   no `switch/case`, no section-marker comments, no PT strings outside i18n).
3. WHEN the contributor opens `.specs/codebase/STRUCTURE.md` or
   `docs/web-structure.md` THEN both SHALL describe the same route-colocated
   tree, mention that `features/` is legacy/deprecated for new work, and point
   at `.agents/rules/web-patterns.md` and ADR-007 as the source of truth.

**Independent Test**: Hand the rule + ADR to a contributor (or agent) and ask
them to scaffold a fictitious `/_app/instruments` CRUD feature on paper; if the
result compiles in their head against the rule alone (no need to read existing
features), the story is satisfied.

---

### P1: The decisions we just made are immutable and discoverable ⭐ MVP

**User Story**: As the team, I want the four locked architectural calls
captured as an Accepted ADR so future PRs can be judged against them and any
reversal goes through the formal ADR-supersede path — not a Slack thread.

**Why P1**: ADRs are the kizunu way (`docs/adr/README.md`: "immutable
historical records"). Without an ADR the rule has no constitutional weight.

**Acceptance Criteria**:

1. WHEN ADR-007 is opened THEN it SHALL record, with context and rationale: the
   route-colocation choice (vs. the legacy `features/` folder), the
   mutation-hook shape (`{ domainName: mutate, ... }`, not raw `{ mutate, ... }`),
   the invalidation ownership (centralized in the hook, chains caller
   callbacks), and the URL-state recipe (Zod schema on the route +
   `use-<feature>-search` hook).
2. WHEN `docs/adr/README.md` is opened THEN it SHALL list ADR-007 with Accepted
   status; the rule file SHALL link back to ADR-007 for rationale.
3. WHEN a future contributor wants to change one of these calls THEN the ADR
   SHALL make clear that the path is "supersede with a new ADR", not "edit
   ADR-007 in place".

**Independent Test**: A reader unfamiliar with this discussion can read ADR-007
alone and explain *why* the project picked each call.

---

### P2: Shared composites the rule references actually exist and are usable

**User Story**: As a contributor following the rule, I want the composites it
names (`PageHeader`, `EmptyState`, `DataTable`, `TablePagination`,
`ResourceDialog`, `DeleteResourceDialog`, `Field*` + `FormError`) to exist in
`apps/web/src/components/` so the recipe isn't a paper tiger.

**Why P2**: The rule is useful even without every composite — a contributor
could build a feature against shadcn primitives directly. But the composites
remove repeated chrome and make the rule's recipes one-line imports rather
than "build this yourself."

**Acceptance Criteria**:

1. WHEN a composite already exists in `apps/web/src/components/` THEN this
   branch SHALL reuse it (and harmonize its prop API with the rule if needed)
   rather than creating a duplicate.
2. WHEN a composite the rule names does not exist THEN this branch SHALL add
   it under `apps/web/src/components/` with the prop shape the rule documents,
   built from shadcn primitives where available (per `react.md` §0).
3. WHEN each new composite lands THEN it SHALL respect `react.md` §9
   (≤50 lines) and `comments.md` (no section dividers, English only).
4. WHEN `bun check` runs on the resulting branch THEN it SHALL be green.

**Independent Test**: Each composite can be imported from
`@kizunu/web/components/<name>` and used per the rule's example snippet
without further wiring.

---

### P3: Existing call sites can adopt the new hook shape opportunistically

**User Story**: As a contributor refactoring an existing screen, I want the
rule to say clearly that *existing* `use-*.ts` hooks may keep their current
raw-TanStack shape until I touch them, and that new hooks SHALL use the
domain-name shape — so I don't trip over inconsistency or feel pressure to
sweep the whole codebase.

**Why P3**: This is a "comfort" clause. It doesn't add capability; it prevents
the rule from being read as a mandate to migrate everything in this branch
(which we already excluded under Out of Scope).

**Acceptance Criteria**:

1. WHEN the rule covers the mutation-hook shape THEN it SHALL include a
   paragraph stating that existing hooks keep their current shape until next
   touched, and that mixed shapes are tolerated during the transition.
2. WHEN ADR-007 is read THEN it SHALL note the same transition allowance, so
   the immutable record matches the rule's pragmatic stance.

**Independent Test**: A contributor reading the rule does not feel compelled
to open `packages/api-client/identity/use-login.ts` just to rename `mutate`.

---

## Edge Cases

- WHEN a feature is *not* CRUD-ish (e.g. the cadence builder, a wizard, the
  command palette) THEN the rule SHALL state that the route-colocation tree
  and the smart-page / dumb-component split still apply, but the `DataTable` /
  `ResourceDialog` recipes are optional — the rule is a recipe book, not a
  straitjacket.
- WHEN a composite needs a prop the reference's prop shape doesn't cover (e.g.
  a `DataTable` column whose `accessor` returns a complex element with
  per-row context) THEN the rule SHALL show the composite's extension points
  rather than recommending a fork.
- WHEN an existing screen under `features/<f>/` is touched for an unrelated
  reason (a one-line copy fix) THEN the rule SHALL clarify that the migration
  to route-colocation is *not* triggered — opportunistic means "when the work
  is already in that file's neighborhood", not "every time anyone edits it".
- WHEN `AGENTS.md` already lists the existing rule files THEN the edit SHALL
  add `web-patterns.md` to that list (AGENTS.md says don't edit it unless the
  user asks — the user explicitly asked for this layering change, which is the
  trigger).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| WEB-01 | P1: One prescriptive recipe | Design | Pending |
| WEB-02 | P1: One prescriptive recipe (Layout + `bun check` clean) | Design | Pending |
| WEB-03 | P1: One prescriptive recipe (STRUCTURE.md + web-structure.md updated) | Design | Pending |
| WEB-04 | P1: Decisions immutable via ADR | Design | Pending |
| WEB-05 | P1: ADR indexed and linked | Design | Pending |
| WEB-06 | P1: ADR is supersede-only | Design | Pending |
| WEB-07 | P2: Reuse existing composites | Design | Pending |
| WEB-08 | P2: Add missing composites built on shadcn | Design | Pending |
| WEB-09 | P2: Composites respect react.md §9 + comments.md | Design | Pending |
| WEB-10 | P2: `bun check` green | Design | Pending |
| WEB-11 | P3: Transition clause in rule | Design | Pending |
| WEB-12 | P3: Transition clause in ADR | Design | Pending |

**ID format:** `WEB-NN`.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified.

**Coverage:** 12 total, 0 mapped to tasks (Tasks phase pending).

---

## Success Criteria

How we know the feature is successful:

- [ ] A contributor (or agent) can scaffold a new CRUD-ish web feature using
  only the rule + ADR + the seeded composites, without needing to read an
  existing feature for guidance.
- [ ] ADR-007 appears in `docs/adr/README.md` with Accepted status; the rule
  file links back to it.
- [ ] `bun check` is green on the final branch; `CI=1 bunx vp lint` reports
  0 warnings / 0 errors.
- [ ] No file under `apps/web/src/features/<f>/` is moved or rewritten in this
  branch; no `packages/api-client/*/use-*.ts` hook is reshaped in this branch.
- [ ] `.specs/codebase/STRUCTURE.md`, `docs/web-structure.md`, and `AGENTS.md`
  all reference the new rule file and the route-colocated tree consistently.
