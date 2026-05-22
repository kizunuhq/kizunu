# CI Validation Gate & Repo Governance — Design

Input: `spec.md` (CI-01..CI-CON). Trunk-only (`master`), Postgres-only, deploy out
(feature `028`). Reference pattern: `~/Workspaces/spice-target/.github`.

## Architecture: orchestrator + reusable workflows

```
ci.yml (orchestrator)
  on: push[master], pull_request[master, types: opened/sync/reopened/ready_for_review]
  concurrency: cancel-in-progress per ref
  jobs:
    changes   ─ dorny/paths-filter → outputs.code
    quality   ─ needs changes; if code; uses ./_quality.yml
    unit      ─ needs changes; if code; uses ./_unit.yml
    integration ─ needs changes; if code; uses ./_db-tests.yml (project: integration)
    e2e       ─ needs changes; if code AND not draft; uses ./_db-tests.yml (project: e2e)
    required  ─ needs [all]; if always(); aggregate + sticky comment   ← only required check
```

The two DB-backed jobs share one parameterized reusable `_db-tests.yml`
(`workflow_call` input `project`) rather than duplicated `_integration`/`_e2e`
files. Its job is named `DB Tests`, so the aggregator reads durations by the caller
prefixes `Integration / DB Tests` and `E2E / DB Tests`. Coverage extract+upload is a
composite action `.github/actions/coverage-summary` reused by `_unit` and `_db-tests`.

Each `_*.yml` is `on: workflow_call`, runs `./.github/actions/setup` first (existing
composite: Node 22 + Bun 1.3.13 + install cache + `--frozen-lockfile --ignore-scripts`).

### Job command mapping (full `check.sh` parity)

`check.sh` = `bun typecheck` + `bunx vp check` + `bunx vp test` + 4 scripts. Split:

| Job | Commands | Maps |
|---|---|---|
| `_quality` | `bunx vp check` (fmt+lint+types) ; `bun check:imports` ; `bun check:zod` ; `bun check:schema` ; `bun check:db` | CI-02 |
| `_unit` | `bunx vp test --project unit --project web --coverage` | CI-03 |
| `_db-tests` (×2) | postgres svc → `bun --filter @kizunu/api db:migrate` → `bunx vp test --project <integration\|e2e> --coverage` | CI-04, CI-07 |

`vp check` already covers typecheck+lint+format (confirmed via `vp check --help`), so no
separate typecheck step and no `vp check`-runs-tests problem. The 4 scripts use the
existing `check:imports|zod|schema|db` package scripts (the last is
`drizzle-checksums verify`, which subsumes spice-target's `_drift` job → no drift job).

### DB jobs (CI-04)

```yaml
services:
  postgres:
    image: postgres:16-alpine          # matches deploy/docker-compose.yml
    env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: kizunu_test }
    ports: ['5432:5432']
    options: >- --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
env:
  TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/kizunu_test
```

`global-setup.ts` reads `TEST_DATABASE_URL`, finds it reachable, and **skips** the
Compose bootstrap (verified). `bun db:test:setup` creates + migrates. DB projects are
`fileParallelism: false` (shared `kizunu_test`) — already set in `vite.config.ts`.

### Aggregator + sticky comment (CI-05, CI-CMT, CI-COV)

`required` job, `if: always()`, `needs: [changes, quality, unit, integration, e2e]`:
1. Download coverage artifacts (continue-on-error).
2. Build a markdown table: per-job icon · status · duration (durations from
   `gh api .../runs/<id>/jobs`), coverage summary line, collapsible failure blocks for
   failed jobs, run link. Skipped jobs labelled with reason (docs-only / draft e2e).
3. `marocchino/sticky-pull-request-comment@v2` header `ci-summary` (PR events only;
   no-op on push to master — CI-CON edge).
4. Final step fails iff any of quality/unit/integration/e2e is `failure`/`cancelled`.
   Coverage is report-only (CI-COV) — never fails the build.

Coverage extraction mirrors spice-target: each test job uploads `coverage-table.txt`
via `actions/upload-artifact`; the aggregator downloads + inlines them.

## Hygiene workflows

- **`pr-title.yml`** (CI-PRT) — `amannn/action-semantic-pull-request@v5`, `on:
  pull_request [opened, edited, synchronize, reopened] branches: [master]`. `types:`
  and `scopes:` synced to `commitlint.config.cjs` (types: feat fix docs style refactor
  perf test build ci chore revert; scopes: api web infra deps release; `requireScope:
  false`; `subjectPattern: ^(?![A-Z]).+$` to match `type-case`/lower-case subject).
- **`deps-outdated.yml`** (CI-OUT) — `on: schedule (weekly Mon) + workflow_dispatch`;
  `bun outdated` → upsert one issue titled `chore(deps): weekly outdated audit` via
  `gh issue`, close when clean. `permissions: issues: write`.
- **`dependabot.yml`** (CI-DEP) — `package-ecosystem: github-actions`, `directory: /`,
  weekly, grouped minor/patch, `target-branch: master`, `commit-message.prefix: ci`.

## Governance-as-code

- **`.github/ruleset.json`** (CI-RUL) — GitHub repo ruleset JSON: target `master`;
  rules `pull_request` (required_approving_review_count: **0** — keeps AGENTS.md
  autonomous squash-merge working), `required_status_checks` = `Required (CI)` (+
  `Lint PR title` once it exists), `non_fast_forward` + `deletion` + direct-push block
  via `creation`/`update` restriction. Committed only — applying it to the live repo is
  a manual import (documented in the file header comment).
- **`.github/CODEOWNERS`** (CI-OWN) — `* @kizunuhq/maintainers`; `/.github/
  @kizunuhq/maintainers`; `/apps/api/ @kizunuhq/maintainers`; `/apps/web/
  @kizunuhq/maintainers`. Placeholder team — header comment notes to swap for real
  handles/teams.
- **`CODE_OF_CONDUCT.md`** (CI-COC) — Contributor Covenant v2.1, contact
  `desenvolvimento@equipetech.net`. Repo root (GitHub community-profile location).

## Branch protection migration note

The orchestrator renames the single required check to **`Required (CI)`**. After merge,
branch protection / the imported ruleset must point at that check name (the old `CI /
Typecheck and lint` job name disappears). Captured as a post-merge action, not code.

## Testing approach (per generate-tests classification)

This feature is **CI/config (YAML/JSON/markdown)** — no application code, no fat
business logic to unit-test. Verification is:
- `actionlint` via the existing `lint-workflows.yml` (and `bun check` locally).
- `ruleset.json` / `dependabot.yml` are schema-validated by GitHub on use; we validate
  JSON parse + key presence locally.
- The real proof is the orchestrator running green on this feature's own PR, and a
  deliberately-broken check going red (the spec's Independent Tests / Success Criteria).

No Vitest specs are authored (nothing thin/fat to classify); `generate-tests` would
classify workflow YAML as out-of-scope for unit/integration tests. Gate = `bun check`
green + actionlint clean + the PR's own CI green.

## Requirement coverage

CI-01 ci.yml · CI-02 _quality · CI-03 _unit · CI-04 _integration/_e2e · CI-05 required ·
CI-06 changes filter · CI-07 e2e draft gate · CI-CMT/CI-COV required comment · CI-PRT
pr-title · CI-RUL ruleset.json · CI-OWN CODEOWNERS · CI-COC CODE_OF_CONDUCT · CI-DEP
dependabot · CI-OUT deps-outdated · CI-CON concurrency. All 16 mapped.
