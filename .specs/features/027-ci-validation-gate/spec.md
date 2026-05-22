# CI Validation Gate & Repo Governance Specification

> Slug is `027-ci-validation-gate` (immutable number); scope also covers the
> governance-as-code and community-health files that pair with the merge gate.

## Problem Statement

Kizunu's `ci.yml` runs only `bun typecheck` + `bun lint`, while the local gate
`scripts/check.sh` (invoked by `bun check`) also runs the full test suite and four
`check-*` scripts. As a result a PR can break integration/e2e tests, or violate the
import-depth / zod-v4 / drizzle-naming / migration-checksum rules, and still merge to
`master` green. The AGENTS.md "Definition of Done" claims these are gated; CI does not
enforce them. The repo also lacks the governance-as-code (ruleset, code owners) that
would make the "one required check" enforceable and review routing explicit, and the
standard community-health file (code of conduct).

## Goals

- [ ] CI reaches **full `scripts/check.sh` parity** — every check that fails locally
      also fails CI (tests + the four `check-*` scripts).
- [ ] Branch protection pins **one** required status check, not N — and that policy is
      committed as code (`ruleset.json`), not click-configured.
- [ ] PR feedback is fast and legible — a single updating comment with per-job status,
      durations, and coverage.
- [ ] Commit/dep hygiene is automated — semantic PR titles, Actions dependency bumps,
      and a runtime-deps outdated audit.
- [ ] Review routing and community norms are explicit — `CODEOWNERS` and
      `CODE_OF_CONDUCT.md` are present.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Image build / GHCR `publish.yml`, Kamal rollout, `promote-prod.yml` | Feature `028-deploy-pipeline` (blocked on infra). This feature is its prerequisite. |
| `develop` branch, `pr-branch-policy.yml`, `auto-backport-hotfix.yml` | Trunk-only model — no second branch to police or backport to. |
| Coverage failing thresholds | Report-only first (CI-COV); tightening to a gate is a later decision. |
| Merge queue (`merge_group`) | Deferred; the `Required` job is designed to be merge-queue-ready but not enabled. |
| Redis service containers | Kizunu has no Redis (D5 — in-process poller). |
| Deploy / scraper / nightly workflows | Not applicable to Kizunu's trunk-only single-stack CI. |

---

## User Stories

### P1: Full-parity required gate ⭐ MVP

**User Story**: As a maintainer, I want CI to run everything `scripts/check.sh` runs
and surface it as one required check, so a PR that breaks a gated rule cannot merge to
`master`.

**Why P1**: This is the whole point — closing the enforcement gap. Without it the DoD
is unenforced and feature `028` would auto-stage untested merges.

**Acceptance Criteria**:

1. WHEN a PR targets `master` or a push lands on `master` THEN CI SHALL run, via a
   single orchestrator workflow, the jobs `_quality`, `_unit`, `_integration`, and
   `_e2e` as reusable workflows (`workflow_call`).
2. WHEN `_quality` runs THEN it SHALL execute `bunx vp check` (format + lint + type
   checks — confirmed it does NOT run tests) and the four scripts `check-import-depth`,
   `check-zod-v4`, `check-drizzle-schema-naming`, and `drizzle-checksums verify`. Tests
   live only in the `_unit` / `_integration` / `_e2e` jobs.
3. WHEN `_unit` runs THEN it SHALL execute `bunx vp test` for the non-DB projects
   (`unit` and `web`) with coverage.
4. WHEN `_integration` or `_e2e` runs THEN it SHALL provision a `postgres:16-alpine`
   service container, set `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kizunu_test`,
   run `bun db:test:setup`, then execute `bunx vp test --project integration` / `--project e2e`.
5. WHEN any of `_quality` / `_unit` / `_integration` / `_e2e` fails THEN the aggregator
   job `Required (CI)` SHALL fail; WHEN all pass (or are intentionally skipped) THEN it
   SHALL pass.
6. WHEN the diff touches only docs/specs (no `apps/**`, `packages/**`, lockfile,
   `*.json` config, or workflow files) THEN the code jobs SHALL be skipped and
   `Required (CI)` SHALL still pass.
7. WHEN a PR is a draft THEN `_e2e` SHALL be skipped; WHEN the PR is marked ready for
   review (or the event is a push to `master`) THEN `_e2e` SHALL run.

**Independent Test**: Open a PR that breaks an e2e test → `Required (CI)` is red and
the PR is blocked. Open a docs-only PR → `Required (CI)` is green with code jobs
skipped. Confirm a zod-v3 chained format in a PR fails `_quality`.

---

### P2: Legible PR feedback comment

**User Story**: As a reviewer, I want one updating PR comment summarizing CI, so I can
read status, durations, and coverage without opening the Actions tab.

**Why P2**: High signal, but the gate (P1) is what actually blocks merges; the comment
is reporting on top of it.

**Acceptance Criteria**:

1. WHEN CI completes on a PR THEN `Required (CI)` SHALL upsert a single sticky comment
   (stable header `ci-summary`) — not a new comment per run.
2. WHEN the comment renders THEN it SHALL show a per-job table of status icon, result,
   and duration, plus a coverage summary line.
3. WHEN a job failed THEN the comment SHALL include a collapsible section with that
   job's failure detail and a link to the run.
4. WHEN coverage artifacts exist THEN they SHALL be reported (report-only — coverage
   numbers SHALL NOT fail the build in this feature).

**Independent Test**: Push twice to a PR → exactly one `ci-summary` comment exists and
it updated in place; a failing job shows its collapsible failure block.

---

### P2: Semantic PR title validation

**User Story**: As a maintainer using squash-merge, I want PR titles validated as
Conventional Commits, so the squashed commit on `master` stays changelog-clean.

**Why P2**: Protects trunk history quality; independent of the test gate.

**Acceptance Criteria**:

1. WHEN a PR targeting `master` is opened or edited THEN a check SHALL validate the
   title against the Conventional Commit types kept in sync with the project's
   commitlint config.
2. WHEN the title's subject starts with an uppercase letter or uses an unknown type
   THEN the check SHALL fail with a corrective message.

**Independent Test**: A PR titled `Fix bug` fails; `fix(ci): correct cache key` passes.

---

### P2: Branch protection as code

**User Story**: As a maintainer, I want the `master` protection committed as a
`ruleset.json`, so the "one required check" policy is reproducible and reviewable
instead of hidden in repo settings.

**Why P2**: Codifies the enforcement CI-05 assumes. The workflows run regardless, but
without this the gate is a manual setting that can silently drift.

**Acceptance Criteria**:

1. WHEN the ruleset is applied to `master` THEN it SHALL require a pull request before
   merge and require the `Required (CI)` status check to pass.
2. WHEN the `pr-title` check exists THEN the ruleset SHALL also require it.
3. WHEN a contributor pushes directly to `master` THEN the ruleset SHALL block it.
4. WHEN the ruleset file changes THEN it SHALL live in-repo (e.g. `.github/ruleset.json`)
   and be importable via the GitHub rulesets UI/API.

**Independent Test**: Import `ruleset.json` on a test repo → direct pushes to `master`
are rejected and a PR without a green `Required (CI)` cannot merge.

---

### P3: Review routing and community health

**User Story**: As a maintainer, I want code owners and a code of conduct in place, so
reviews are auto-routed and the project states its community norms.

**Why P3**: Governance/community hygiene; no impact on the merge gate or tests.

**Acceptance Criteria**:

1. WHEN a PR changes paths matched in `CODEOWNERS` THEN the listed owner(s) SHALL be
   auto-requested as reviewers.
2. WHEN the ruleset's "require review from code owners" rule is enabled THEN it SHALL
   compose with `CODEOWNERS` (review required from the matched owner).
3. WHEN the repository is viewed THEN a `CODE_OF_CONDUCT.md` (Contributor Covenant)
   SHALL be present at a location GitHub recognizes for the community profile.

**Independent Test**: GitHub's community-profile checklist shows Code of Conduct and
Code Owners satisfied; a PR touching an owned path auto-requests the owner.

---

### P3: Dependency automation

**User Story**: As a maintainer, I want Actions bumps and a runtime-deps audit
automated, so dependencies don't silently rot.

**Why P3**: Maintenance hygiene; no impact on the merge gate.

**Acceptance Criteria**:

1. WHEN the weekly schedule fires THEN Dependabot SHALL open grouped (minor/patch)
   GitHub-Actions update PRs targeting `master`.
2. WHEN the weekly schedule fires THEN a `deps-outdated` workflow SHALL run
   `bun outdated` and upsert a single tracking issue (one per title), closing it when
   everything is up to date.

**Independent Test**: Manually dispatch `deps-outdated` → a single tracking issue is
created/updated; re-run with no outdated deps → the issue is closed.

---

## Edge Cases

- WHEN two pushes land on the same PR in quick succession THEN concurrency SHALL cancel
  the superseded run (`cancel-in-progress`) without leaving a stale red status.
- WHEN the Postgres service is slow to accept connections THEN the DB jobs SHALL wait on
  a health check before running migrations (no flaky "connection refused").
- WHEN `global-setup.ts` sees a reachable `TEST_DATABASE_URL` THEN it SHALL NOT attempt
  the Docker-Compose bootstrap (CI uses the service container, not Compose).
- WHEN a job is skipped (docs-only or draft e2e) THEN the sticky comment SHALL label it
  "skipped" with the reason, not "failed".
- WHEN the run is a push to `master` (no PR) THEN the sticky-comment step SHALL no-op
  gracefully (nothing to comment on) while the gate still runs.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CI-01 | P1: orchestrator calls 4 reusables on push/PR to master | Design | Pending |
| CI-02 | P1: `_quality` = typecheck + lint + format + 4 scripts (not `vp check`) | Design | Pending |
| CI-03 | P1: `_unit` = `vp test` unit + web + coverage | Design | Pending |
| CI-04 | P1: `_integration`/`_e2e` = postgres:16 service + db:test:setup + project test | Design | Pending |
| CI-05 | P1: `Required (CI)` aggregator = single branch-protection check | Design | Pending |
| CI-06 | P1: docs-only changes skip code jobs, gate still green | Design | Pending |
| CI-07 | P1: e2e draft-gated (ready_for_review / push) | Design | Pending |
| CI-CMT | P2: sticky `ci-summary` comment (status, durations, coverage, failures) | Design | Pending |
| CI-COV | P2: coverage report-only (no failing threshold) | Design | Pending |
| CI-PRT | P2: semantic PR title validation synced to commitlint | Design | Pending |
| CI-RUL | P2: `ruleset.json` requires PR + `Required (CI)` (+ `pr-title`) on master | Design | Pending |
| CI-OWN | P3: `CODEOWNERS` auto-routes review of matched paths | - | Pending |
| CI-COC | P3: `CODE_OF_CONDUCT.md` (Contributor Covenant) present | - | Pending |
| CI-DEP | P3: Dependabot grouped Actions bumps, target master | - | Pending |
| CI-OUT | P3: `deps-outdated` weekly `bun outdated` → upserted tracking issue | - | Pending |
| CI-CON | Edge: concurrency cancel-in-progress per ref | Design | Pending |

**Coverage:** 16 total, 0 mapped to tasks (Tasks phase pending).

---

## Success Criteria

- [ ] A PR that fails any `check.sh` step (test or `check-*` script) cannot merge to
      `master` — verified by a deliberately-broken PR going red on `Required (CI)`.
- [ ] Branch protection requires exactly one check (`Required (CI)`).
- [ ] A docs-only PR goes green in well under the full-suite time (code jobs skipped).
- [ ] Each PR carries exactly one `ci-summary` comment that updates in place.
- [ ] A non-conventional PR title is rejected before merge.
- [ ] `master` protection is defined by an in-repo `ruleset.json` (no direct pushes; PR
      + `Required (CI)` enforced).
- [ ] GitHub's community profile shows Code of Conduct and Code Owners satisfied.
- [ ] The weekly dep audit maintains a single tracking issue.
