---
name: fix-ci
description: Find failing PR checks, inspect their logs or external check links, and apply focused fixes until CI is green. Use when a branch or PR has failing CI and the user says "fix CI", "checks are red", "get this green", or "why is the build failing". Pairs with ci-watcher (which only watches/reports); this skill diagnoses and fixes.
---

# Fix CI

Iterative path from red checks to green: diagnose the first actionable failure, fix it minimally, push, re-check, repeat.

## Trigger

A branch or PR has failing CI and needs a fast, iterative path to green checks. Use after ci-watcher reports a failure, or whenever the user asks to fix the build.

## Workflow

1. **Resolve the PR and survey checks.** `gh pr checks --json name,bucket,state,workflow,link` — `gh pr checks` is the source of truth for overall CI state.
2. **Find the first actionable error.** For a failed GitHub Actions check, pull logs: `gh run view <run-id> --log-failed`. For an external check, open its `link` to identify the failing command or service. Extract the root error, not just the final exit code.
3. **Reproduce locally when possible.** Many failures are `bun check` or test failures — run the same command locally to confirm before fixing.
4. **Apply the smallest safe fix.** Address one actionable failure; prefer minimal, low-risk changes over broad refactors.
5. **Push and re-check.** `git push`, then re-run `gh pr checks` (or `--watch --fail-fast`). Repeat until all checks pass.

## Guardrails

- Fix one actionable failure at a time — don't batch speculative changes.
- Prefer minimal, low-risk fixes before any broader refactor.
- Keep `gh pr checks` as the source of truth for overall PR CI state.
- Don't disable, skip, or `xfail` a check to force green without flagging it to the user.

## Output

- Primary failing job and root error
- Fixes applied, in iteration order
- Current CI status and next action
