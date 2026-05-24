# ADR-007: Web Frontend Layering and Patterns

- **Date**: 2026-05-23
- **Status**: Accepted
- **Deciders**: Kizunu team
- **Tags**: web, frontend, layering, conventions

## Context and Problem Statement

The backend is heavily codified — per-module hexagonal layering, nominated
errors, contract-first DTOs, the end-to-end type-safe API boundary, and six
ADRs spell out *how* the API is built. The web app has no equivalent. The
existing rule files cover individual primitives — `react.md` mandates
functional components, shadcn-first primitives, Tailwind utility-first; but
neither it nor `STRUCTURE.md` describes *how a new web feature is laid out*.

The 033–039 remake stabilized the app shell, dashboard, settings hub, cadence
editor, journeys list, and the command palette, and shipped a usable
`components/composed/` set (`PageHeader`, `EmptyState`, `DataTable`,
`SettingsLayout`/`SettingsRow`, `KpiTile`, `TooltipOnHover`, `Kbd`). What is
*not* in the tree:

- A consistent place for per-feature components, hooks, and utilities.
  `apps/web/src/features/<feature>/` was used during the remake but is a
  thin convention: every feature reinvents the route ↔ feature ↔ component
  boundary, and the routes themselves are bare wrappers.
- A standard recipe for URL-driven state — `routes/_app/workspace/cadences.tsx`
  hand-rolls a `validateSearch` narrowing instead of using a Zod schema.
- A consistent mutation-hook shape — existing `use-*.ts` hooks return the
  raw TanStack Query mutation, so call sites destructure `mutate` and then
  immediately rebind it to a domain name locally.
- An invalidation contract — some hooks invalidate inside the hook, others
  expect the caller to do it.
- Shared dialog chrome — every dialog re-implements the header / scroll body
  / footer structure.

A second-time-around feature audit (preceding this ADR) drew on a peer
project's web pattern doctrine and identified the gap. This ADR records the
calls that resolve it.

## Decision Drivers

- One prescriptive recipe per common feature shape (list + create + edit +
  destructive action), so a new web feature has one obvious path and review
  has one obvious standard to compare against.
- Stay native to TanStack Router idioms (file-based routes, sigils, route
  data) instead of inventing parallel registries.
- Reuse the composites the 033–039 remake stabilized — do not re-shape APIs
  that already work in product.
- Avoid forcing a sweep migration on the just-stabilized surface. Existing
  features under `apps/web/src/features/<f>/` are tolerated until they are
  next touched.
- Keep the existing two-layer api-client design (pure `*.api.ts` over fetch +
  TanStack Query `use-*.ts` hooks) — see `ARCHITECTURE.md` "End-to-end
  type-safe API boundary" — but standardize hook return shape and
  invalidation ownership.

## Considered Options

### Layering

- **A** — Route-colocate per feature under
  `routes/_app/<feature>/{-components,-hooks,-utils,-dialogs}/`. The
  TanStack Router `-` prefix marks folders as non-route. Promote into
  `apps/web/src/components/` only when 2+ features consume the same piece.
- **B** — Keep the top-level `apps/web/src/features/<feature>/` folder.
  Route files stay thin and import from `features/`.

### Mutation hook return shape

- **A** — Hooks return `{ <domainName>: mutate, ...rest }`, where
  `<domainName>` matches the use case (`createInstitution`,
  `updateInstitution`, `revokeSession`). Caller writes `createInstitution(input)`.
- **B** — Hooks return the raw TanStack Query mutation
  (`{ mutate, mutateAsync, isPending, ... }`). Caller writes `mutate(input)`
  and re-binds to a domain name locally if it wants one.

### Cache invalidation ownership

- **A** — The hook owns invalidation. Each `use-*` mutation hook calls
  `queryClient.invalidateQueries({ queryKey: ... })` for keys it semantically
  owns, then chains the caller's `options.onSuccess`.
- **B** — The call site owns invalidation. Each consumer remembers which keys
  to invalidate after each action.

### URL-driven state

- **A** — Per-feature Zod schema next to the route file, registered with
  `validateSearch`. A dedicated `use-<feature>-search` hook reads
  `Route.useSearch()` and exposes typed update handlers.
- **B** — Status quo: hand-rolled `validateSearch` per route (current
  `cadences.tsx`), free-form narrowings, no shared hook.

## Decision Outcome

Chosen options: **A** on all four.

- **Layering**: route-colocation under `routes/_app/<feature>/`. The
  `apps/web/src/features/<feature>/` folder is *legacy* for new work.
  Existing folders convert opportunistically — when a feature is next worked
  on, its components/hooks/utils move into the route folder in the same PR.
  Mixed layouts are tolerated during the transition.
- **Hook shape**: new mutation hooks return `{ <domainName>: mutate, ... }`.
  Existing hooks under `packages/api-client/*/use-*.ts` keep their current
  raw shape until next touched; mixed shapes are explicitly tolerated.
- **Invalidation**: the hook owns invalidation; it chains
  `options.onSuccess`. The caller's responsibility shrinks to side-effects
  (toast, navigate).
- **URL state**: every list/filter route exports a Zod schema for its search
  params and a `use-<feature>-search` hook in `-hooks/`. The route
  registers the schema with `validateSearch`.

The detailed recipes — page composition, smart-page / dumb-form split, form
primitives, data-table composition, dialog patterns, error-handling table —
live in `.agents/rules/web-patterns.md`. This ADR captures the load-bearing
calls so that future PRs are judged against them, and so that reversing any
one of them goes through a new superseding ADR rather than a Slack thread.

### Positive Consequences

- A new feature has one obvious place for everything: route file in
  `routes/_app/<feature>/index.tsx`, child UI in `-components/`, URL hook in
  `-hooks/use-<feature>-search.ts`. No ambient `features/` folder to invent
  conventions for.
- Mutation call sites read like domain code (`createInstitution(input)`)
  rather than transport plumbing (`mutate(input)`).
- Cache invalidation can't be silently forgotten at a call site — it is in
  the hook by construction.
- URL state is type-safe and shareable; `validateSearch` rejects bad URLs
  before the component mounts.

### Negative Consequences

- During the opportunistic-migration window, the tree carries two layouts
  (the legacy `features/<f>/` and the new route-colocated form). Reviewers
  must tolerate this; the rule file calls it out.
- Hook shape is also mixed during the transition. A consumer of a mixed-shape
  hook destructures `mutate` from one and a domain name from another. The
  rule's transition clause acknowledges this explicitly so contributors do
  not feel pressure to refactor existing hooks defensively.
- Centralized invalidation makes the hook slightly more opinionated. A
  consumer that *does not* want a particular key invalidated has to extend
  the hook signature rather than override at the call site.

## Pros and Cons of the Options

**Layering A (route-colocation)** — locality beats indirection; the route
file and its supporting UI sit next to each other in the tree. The `-`
sigil is the TanStack Router-native convention for non-route folders.
**Layering B (legacy `features/`)** — keeps the route layer minimal but
forces every contributor to learn where things live (`features/<feature>/`
implied, not enforced, and inconsistent across the existing tree).

**Hook shape A (domain name)** — call sites read declaratively; renaming a
use case is a coordinated rename across the hook and consumers.
**Hook shape B (raw mutate)** — zero churn to existing hooks; every consumer
ends up repeating a local `const createX = mutate` line, which is more
boilerplate than the rename saves.

**Invalidation A (hook-owned)** — invariant in one place; misses become
hook bugs, not consumer bugs.
**Invalidation B (call-site)** — flexible per call site but easy to forget;
adds risk in proportion to consumer count.

**URL state A (Zod + hook)** — typed handlers (`toggleSort`,
`handlePageChange`) once per feature, not per page. Search-param parsing is
correct by construction.
**URL state B (ad-hoc)** — minimal scaffolding per route but every route
re-implements parsing, defaults, and reset-on-filter-change.

## Migration Policy

- This ADR + the accompanying rule + the seeded composites are the only
  changes in this branch. No existing `features/<f>/` is moved; no existing
  `use-*.ts` hook is reshaped.
- When a feature is *next* worked on for any reason that already touches
  its tree (a new screen, a non-trivial refactor, a meaningful bug fix), the
  same PR moves it into `routes/_app/<feature>/{-components,-hooks,...}/` and
  updates any of its hooks that the PR is already editing to the new shape
  and invalidation pattern. Surface-only edits (a copy fix, a single
  className tweak) do not trigger the migration.
- The end state — when every `features/<f>/` is gone — is the trigger for an
  optional follow-up ADR formalizing the migration's completion and removing
  the legacy clause from the rule.

## References

- `.agents/rules/web-patterns.md` — the detailed recipes.
- `.agents/rules/react.md` §0 (shadcn-first primitives), §9 (component size).
- `.agents/rules/comments.md` — no section markers, no PR/task references.
- `.agents/rules/code-standards.md` §1 (English only), §10 (≤30-line
  functions).
- `docs/adr/001-domain-owns-vocabulary.md` — the inward-dependency rule, the
  same logic this ADR applies to the web app's route-vs-feature split.
- `apps/web/src/components/composed/{page-header,empty-state,data-table,
  resource-dialog,delete-resource-dialog,form-error,table-pagination}.tsx` —
  the composites the rule references.
