# Templates Tasks

## T1 — templates schema + migration + repo — TPL-01..03
Schema + `bun db:generate`; `template.repository.ts`; `template.errors.ts`.
Gate: typecheck + drizzle gates.

## T2 — use-cases — TPL-01..03
create/list-workspace/update/delete template use-cases.
Gate: typecheck.

## T3 — contracts + client + HTTP + module — TPL-01..03
`api-contracts/cadence` template schemas + `Routes.templates`; `api-client/cadence` hooks;
`template.controller.ts`; `cadence.module.ts`; register in `api.module.ts`.
Gate: `bun check`.

## T4 — tests (generate-tests) — TPL-01..03
Unit: create (dup + ok), update (not-found + patch), delete (not-found). Integration: repo.
Gate: `bun check` + CI lint.

## T5 — docs
ROADMAP (templates landed under the cadence line), STATE, STRUCTURE.
Gate: `bun check`.
</content>
