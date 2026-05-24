# 042 — Web Feature Colocation Migration Specification

## Problem Statement

Feature 041 shipped ADR-007 + `.agents/rules/web-patterns.md` prescribing
route-colocation under `routes/_app/<feature>/{-components,-hooks,-utils,
-dialogs}/`, with a transition clause permitting opportunistic migration.
The user has now requested a full sweep — migrate every `apps/web/src/
features/<f>/` (10 folders, 72 files, 52 importing files) to the
colocated layout in a single change, so that all subsequent contributors
land in a uniform tree.

## Goals

- [ ] Every file under `apps/web/src/features/<f>/` is moved to its
  doctrine-correct home (see Design).
- [ ] All 52 import sites are rewritten; `apps/web/src/features/` is
  deleted at the end.
- [ ] `bun check` is green at the end.
- [ ] Chrome smoke verifies the golden path on the migrated surfaces.
- [ ] No behavior change — pure file-tree refactor.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Reshape `packages/api-client/*/use-*.ts` mutation hooks | Feature 043 — distinct concern. |
| Rewrite forms to `react-hook-form` | Doctrine permits opportunistic; not required. |
| Convert ad-hoc `validateSearch` to Zod schemas | Opportunistic; defer to feature work. |
| New tests | Test-bootstrap is a separate concern (CONCERNS.md). |
| Any `apps/api/` change | Web-only refactor. |

## User Stories

### P1: Uniform tree across all web features ⭐ MVP

**User Story**: As a contributor (human or agent), I want every web
feature to live in its colocated home so that the tree has one shape, the
rule's recipes apply uniformly, and the deprecated `features/` folder no
longer exists.

**Acceptance Criteria**:

1. WHEN `apps/web/src/features/` is listed THEN it SHALL not exist.
2. WHEN the rule's checklist (§10) is applied to any of the migrated
   features THEN every file SHALL be where the checklist predicts.
3. WHEN `bun check` runs THEN it SHALL be green (types, lint, format, all
   existing web tests).
4. WHEN the dev server is loaded in Chrome THEN the login flow, the
   workspace dashboard, cadences tab, journeys list, settings → members
   / channels / connectors / security, and the command palette SHALL all
   render and respond identically to pre-migration.

## Edge Cases

- `app-shell/` wraps every `_app/*` route; it is not owned by a feature
  route folder. Resolved by moving to `apps/web/src/_shell/app-shell/`
  alongside `_shell/providers/` (Design §1).
- `marketing/` is rendered from the public `routes/index.tsx`, not under
  `_app/`. Resolved by moving to `apps/web/src/routes/-marketing/`
  (TanStack `-` prefix excludes from routing). (Design §2).
- `command/` is mounted globally in the shell, not on a route. Resolved by
  moving to `apps/web/src/_shell/command/`. (Design §3).
- `PluginSelect` is consumed by both channel and cadence — qualifies for
  graduation to `apps/web/src/components/composed/plugin-select.tsx`.
  `lookup-select.tsx` already living at `components/lookup-select.tsx`
  also belongs under `composed/`; both move in this PR.
- `email-verification-banner` is consumed by `app-shell.tsx` only; it
  moves with app-shell to `_shell/app-shell/`.

## Success Criteria

- [ ] `apps/web/src/features/` is gone.
- [ ] `bun check` green; `CI=1 bunx vp lint` reports 0 warnings, 0 errors.
- [ ] Chrome smoke green on login, dashboard, cadences, journeys, settings
  hub tabs, command palette.
- [ ] No behavior diff visible vs. master.
