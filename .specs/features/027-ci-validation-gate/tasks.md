# CI Validation Gate & Repo Governance — Tasks

Atomic tasks. All under `.github/` + repo root. Trunk-only. Gate per task =
`actionlint` clean (via `lint-workflows.yml` / local) + valid parse; final gate =
`bun check` green + the feature PR's own CI green.

| # | Task | Files | Reqs | Depends |
|---|---|---|---|---|
| T1 | `_quality` reusable: `vp check` + 4 scripts | `.github/workflows/_quality.yml` | CI-02 | — |
| T2 | `_unit` reusable: `vp test --project unit --project web --coverage` + coverage artifact | `.github/workflows/_unit.yml` | CI-03 | — |
| T3+T4 | `_db-tests` reusable (parameterized by `project`): postgres svc + `db:migrate` + project test + coverage; `+ coverage-summary` composite action shared with `_unit` | `.github/workflows/_db-tests.yml`, `.github/actions/coverage-summary/action.yml` | CI-04, CI-07 | — |
| T5 | `ci.yml` orchestrator: triggers, concurrency, `changes` (paths-filter), call reusables (`_db-tests` ×2 with `project`), `Required (CI)` aggregator + sticky `ci-summary` comment | `.github/workflows/ci.yml` | CI-01, CI-05, CI-06, CI-07, CI-CMT, CI-COV, CI-CON | T1,T2,T3+T4 |
| T6 | `pr-title.yml`: semantic-PR-title synced to commitlint types/scopes | `.github/workflows/pr-title.yml` | CI-PRT | — |
| T7 | `deps-outdated.yml`: weekly `bun outdated` → upsert tracking issue | `.github/workflows/deps-outdated.yml` | CI-OUT | — |
| T8 | `dependabot.yml`: github-actions, weekly, grouped, target master | `.github/dependabot.yml` | CI-DEP | — |
| T9 | `ruleset.json`: master ruleset (PR, `Required (CI)` + `Lint PR title`, no direct push, 0 approvals) | `.github/ruleset.json` | CI-RUL | T5,T6 |
| T10 | `CODEOWNERS` | `.github/CODEOWNERS` | CI-OWN | — |
| T11 | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) | `CODE_OF_CONDUCT.md` | CI-COC | — |
| T12 | Docs: update `.specs/codebase/TESTING.md` (CI runs the gate) + STATE.md decision; mark roadmap IN PROGRESS→done at ship | `.specs/...` | — | T1–T11 |

## Per-task "done when"

- **T1** `_quality` runs `bunx vp check` then `bun check:imports|zod|schema|db`; fails on any.
- **T2** `_unit` runs non-DB projects (`unit`,`web`) with `--coverage`; uploads `unit-coverage` (lcov + table). No DB service.
- **T3/T4** `postgres:16-alpine` health-gated; `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kizunu_test`; `bun db:test:setup`; then the project test + coverage artifact. `global-setup.ts` skips Compose (reachable DB).
- **T5** `on: push[master] + pull_request[master, …, ready_for_review]`; `concurrency cancel-in-progress`; `changes` job gates code jobs; `e2e` also gated on `pull_request.draft == false`; `required` `if: always()` aggregates + posts one `ci-summary` comment (PR only) + fails iff a required job failed; coverage report-only.
- **T6** rejects uppercase subject / unknown type; types+scopes match `commitlint.config.cjs`.
- **T7** dispatch + weekly; single issue `chore(deps): weekly outdated audit`, closed when clean; `issues: write`.
- **T8** valid Dependabot v2; `target-branch: master`; grouped minor/patch; `ci` commit prefix.
- **T9** valid JSON; targets `master`; requires PR (0 approvals) + the two status checks; blocks direct push/deletion/non-ff. Header comment: manual import.
- **T10** valid CODEOWNERS; default + `.github` + per-app; header notes placeholder team.
- **T11** Contributor Covenant 2.1, contact `desenvolvimento@equipetech.net`.
- **T12** TESTING.md states CI enforces the full gate; STATE.md records the trunk-only CI decision.

## Notes

- T1–T4, T6–T8, T10, T11 are independent — implement in parallel-safe order.
- T5 depends on the reusables existing (it calls them). T9 references the check names
  from T5/T6.
- No Vitest specs authored (see design — config-only feature). Verification is
  actionlint + `bun check` + the PR's own green CI.
