# Engine State Machine + EntryTrigger Tasks

## T1 — LeadJourney state machine — ENG-01, ENG-02
`lead-journey-status.ts`, `journey-event.ts` (derived const objects), `journey.errors.ts`,
`lead-journey-transition.ts` (pure transition table + `transition()`).
Gate: typecheck.

## T2 — entry_triggers schema + migration + repo + errors — ENG-03, ENG-04
Schema + `bun db:generate`; `entry-trigger.repository.ts`; `entry-trigger.errors.ts`.
Gate: typecheck + drizzle gates.

## T3 — use-cases + contracts + client + HTTP + module — ENG-03, ENG-04
create/list/delete entry-trigger use-cases (validate connector account + cadence);
`api-contracts/engine` + `Routes`; `api-client/engine` hooks; controller; `engine.module.ts`
(import CrmModule + CadenceModule); register in `api.module.ts`.
Gate: `bun check`.

## T4 — tests (generate-tests) — ENG-01..04
Unit: transition (all events, legal + illegal); create-entry-trigger branches. Integration: repo.
Gate: `bun check` + CI lint.

## T5 — docs
ROADMAP (engine state machine + EntryTrigger landed; ingestion/scheduler/inbound remain), STATE, STRUCTURE.
Gate: `bun check`.
</content>
