---
name: new-branch-and-pr
description: Create a fresh branch from the latest main, complete focused work with tests, then commit, push, and open a pull request. Use when starting a change that should ship through a clean branch-and-PR workflow, or when the user says "open a PR", "start a branch for X", "ship this as a PR".
---

# New branch and PR

End-to-end workflow for taking a change from a clean branch to an open pull request.

## Trigger

Starting work that should be shipped through a clean branch-and-PR workflow — a new feature, fix, or focused change set destined for review.

## Workflow

1. **Clean the tree.** Run `git status`. If there are uncommitted changes, stash, commit, or confirm with the user how to handle them — never silently discard work.
2. **Branch from latest main.** Sync first: `git fetch origin && git switch master && git pull --ff-only`, then `git switch -c <type>/<short-description>` (e.g. `feat/workspace-invites`, `fix/auth-token-expiry`).
3. **Implement and test.** Make the change. Add or update tests for the behavior (see the project test rules). Keep the diff scoped to one change set.
4. **Verify before committing.** Run `bun check` and the relevant test suite. Resolve failures rather than committing red.
5. **Commit focused changes.** Use a conventional-commit subject (`feat(scope): …`, matching this repo's history). Stage only files belonging to this change set.
6. **Push.** `git push -u origin HEAD`.
7. **Open the PR.** `gh pr create` against `master` with a concise summary and a test-notes section.

## Guardrails

- Keep the branch scoped to one change set — split unrelated work into separate branches.
- Never commit with failing `bun check` or tests; report failures instead.
- Include verification notes (what you ran, what passed) in the PR body before requesting review.
- Branch and PR target `master` (this repo's main branch).

## Output

- New branch name
- PR summary and test notes
- PR URL (from `gh pr create`)
