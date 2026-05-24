# 042 — Web Feature Colocation Migration Tasks

The migration runs as a single coordinated change: file moves + import
rewrites must happen together to keep `bun check` green. Splitting per
feature would intermediate-break the build (a moved file with an old
importer fails typecheck). Tasks here track *phases*, each ending in a
green `bun check`.

## T-01 — Create target directories

`mkdir -p` every target under `_shell/`, `routes/`, `components/composed/`.

## T-02 — `git mv` all source files

Moves every file from `apps/web/src/features/<f>/...` to its Design target.
No import rewriting yet — `bun check` would fail mid-move; that's OK.

## T-03 — Rewrite all import sites

One coordinated `perl -i -pe` pass across `apps/web/src/**/*.{ts,tsx}`
applying every path rewrite in the Design map.

## T-04 — Delete `apps/web/src/features/`

Should be empty after T-02 (only directories remain). Remove the tree.

## T-05 — Regenerate `routeTree.gen.ts`

If the dev server / router plugin isn't running, run `bun typecheck` once
to trigger the plugin (it generates on transform). If the file is stale,
delete it and re-run.

## T-06 — `bun check`

Must be green. If any importer remains broken, fix it (single residual
that the perl pass missed).

## T-07 — Chrome smoke

Through the browser MCP. Verify:

- `/auth/login` renders, can navigate to signup/forgot password
- `/workspace` renders the dashboard (KPIs, first-run, recent journeys)
- `/workspace/cadences` opens the cadences tab; switching to templates
  tab works
- `/workspace/journeys` renders the journeys list
- `/workspace/my-channels` renders the my-channels table
- `/settings/members`, `/settings/channels`, `/settings/connectors`,
  `/settings/security` each render
- Command palette opens with `⌘K` and closes

## T-08 — Commit + push + PR + CI + squash-merge

One squashable commit ("refactor(web): colocate feature folders per
ADR-007 (042)"). Open PR, watch CI, merge.
