# Cadence Aggregate Tasks

## T1 — schema + migration — CAD-01..04
`cadences` + `cadence_steps` (+ enums) schema; `bun db:generate`.
Gate: typecheck + drizzle gates.

## T2 — contracts (actions, steps, cadence) + Routes — CAD-01..04
`api-contracts/cadence/cadence.contract.ts` (CadenceActionSchema discriminated union, step + cadence request/response) + `Routes.cadences`.
Gate: typecheck + zod-v4.

## T3 — validator + errors + repository — CAD-01..04
`cadence-validator.ts` (pure), `cadence.errors.ts`, `cadence.repository.ts` (transactional createWithSteps/replaceSteps, getWithSteps, list w/ count, delete).
Gate: typecheck.

## T4 — use-cases + controller + module + client — CAD-01..04
create/list/get/update/delete use-cases (inject registry.has + template lookup into validator); cadence.controller.ts; wire into cadence.module.ts; api-client/cadence hooks.
Gate: `bun check`.

## T5 — tests (generate-tests) — CAD-01..04
Unit: validator (5 cases), create/update branches, get/delete not-found. Integration: repo createWithSteps/getWithSteps/replaceSteps/list-count.
Gate: `bun check` + CI lint.

## T6 — docs
ROADMAP (cadence aggregate landed; EntryTrigger with engine), STATE, STRUCTURE.
Gate: `bun check`.
</content>
