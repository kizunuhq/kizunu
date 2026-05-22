# 027 — CI validation gate discovery

> **Status:** discovery / mapping only. NOT a committed spec; it is the input to
> Specify. Split out of the original deploy-pipeline discovery — the rollout half
> now lives in `028-deploy-pipeline` (blocked on infra). This feature is unblocked
> and is a prerequisite for 028: deploy must never fire off a merge that wasn't
> test-gated.

## Goal

Make CI enforce what the local gate (`bun check` → `scripts/check.sh`) already
enforces. Today `ci.yml` runs only `typecheck` + `bun lint`, so a PR can break
integration/e2e tests or violate the four `check-*` rules and still merge green.
Close that gap with a reusable-workflow orchestrator, real test jobs, and a single
required status check.

## The gap (verified against the repo)

`scripts/check.sh` runs the full gate; `ci.yml` runs a fraction of it:

| Step | `scripts/check.sh` | `ci.yml` (today) |
|---|---|---|
| `bun typecheck` | yes | yes |
| `bunx vp check` (lint + format) | yes | lint only (`bun lint`) |
| **`bunx vp test`** (unit + integration + e2e + web) | yes | **never runs** |
| `check-import-depth` / `check-zod-v4` / `check-drizzle-schema-naming` / `drizzle-checksums verify` | yes | **never runs** |

So the AGENTS.md "Definition of Done" claims these are gated; CI does not enforce
them. This feature makes CI reach **full `check.sh` parity**.

## Why it's near drop-in (infra is CI-ready)

The test infra already supports a service-container DB without Docker Compose:

- `apps/api/src/__test__/global-setup.ts` reads `TEST_DATABASE_URL ?? APP_DATABASE_URL`
  and only runs `bun db:test:setup` (Compose) when the DB is **unreachable** — point
  it at a GitHub `services: postgres` container and the bootstrap no-ops.
- `vite.config.ts` `projects` already split `unit` / `integration` / `e2e` (DB
  projects `fileParallelism: false`, shared `kizunu_test`) — a 1:1 map onto the
  reusables below. No new test machinery, only workflow wiring.

## Decided scope: full `check.sh` parity, decomposed

- **`_quality`** = `tsc` + `vp lint` + format-check + the four gate scripts
  (`check-import-depth`, `check-zod-v4`, `check-drizzle-schema-naming`,
  `drizzle-checksums verify`).
  - **Do not use `bunx vp check` here** — per AGENTS.md it bundles tests, which would
    run the suite twice (once in `_quality`, again in the test jobs). Use `vp lint` +
    format-check only.
  - The `drizzle-checksums verify` script already subsumes spice-target's separate
    `_drift` job (codegen drift), so no dedicated drift job is needed.
- **`_unit`** = `bunx vp test --project unit` + coverage.
- **`_integration` / `_e2e`** = `postgres:16-alpine` service (matching `deploy/`),
  `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kizunu_test`,
  `bun db:test:setup` (create + migrate), then `vp test --project integration|e2e`.
  e2e is draft-gated (see orchestrator).

## Reference — spice-target CI surface (same stack)

Map of what to adopt for Kizunu (trunk-only):

| spice-target piece | What it does | Kizunu adoption |
|---|---|---|
| `ci.yml` orchestrator | One workflow calls all reusables; `dorny/paths-filter` skips everything on docs-only diffs. | **Adopt.** Replaces today's flat typecheck+lint `ci.yml`. |
| `Required (CI)` job | Single `if: always()` aggregator; the **only** branch-protection status check. Fails if any required job failed. | **Adopt.** Pin one check in branch protection instead of N. |
| **Sticky PR comment** | `marocchino/sticky-pull-request-comment` (header `ci-summary`): per-job table (icon · status · **duration** from the jobs API), coverage summary + collapsible full tables, collapsible failure logs for failed jobs, run link. | **Adopt.** One updating comment. Drop their SLO/Linear line or swap for our tracker. |
| `_quality` | lint + format + types + scripts. | **Adopt** as decided scope above. |
| `_unit` | unit tests + lcov/text coverage; coverage table artifact. | **Adopt.** Vitest via `vite-plus/test`. |
| `_integration` | Postgres **+ Redis** services, migrations, fat use-case tests. | **Adopt, Postgres-only** (no Redis); `kizunu_test`, serialized. |
| `_e2e` | services + migrations + e2e; **gated** to `ready_for_review` / `merge_group` / push (not draft). | **Adopt.** supertest; same draft-gating to keep drafts cheap. |
| `pr-title.yml` | Semantic PR title (`amannn/action-semantic-pull-request`), lowercase subject, types synced to commitlint. | **Adopt.** Squash-merge → PR title becomes the trunk commit. |
| `dependabot.yml` | GitHub-Actions-only, weekly, grouped minor/patch. | **Adopt** (target `master`). |
| `deps-outdated.yml` | Weekly `bun outdated` → upsert one tracking issue, auto-close when clean (Dependabot handles bun workspaces+catalog poorly). | **Adopt.** Complements dependabot (Actions-only). |
| `lint-workflows.yml` / `workflow-security-lint.yml` | actionlint + security lint on the workflows. | `lint-workflows.yml` **already exists**; consider the security lint too. |

Skip (n/a to trunk-only Kizunu): `pr-branch-policy.yml`, `auto-backport-hotfix.yml`,
`_e2e-scraper-nightly.yml`.

## Triggers (trunk-only)

`push: [master]` + `pull_request: [master]` (+ `merge_group` if we enable a merge
queue). No `develop`.

## Open questions

1. **Coverage thresholds / reporting** — fail under a threshold, or report-only at
   first? Where do coverage tables/artifacts live (PR comment only, or also a
   summary)?
2. **`vp test --project web`** — the web project lives in `apps/web/vite.config.ts`
   (jsdom). Fold into `_unit`, or a separate `_web` job? `check.sh`'s `vp test` runs
   all projects today.
3. **Merge queue** — adopt `merge_group` now (and run e2e in it) or later?

## Suggested next step

Run `tlc-spec-driven` Specify on this feature using this discovery as input
(spec.md → design.md → tasks.md per the enforced flow), then implement and ship via
the AGENTS.md flow. The deploy half (`028`) builds on a green gate from here.
