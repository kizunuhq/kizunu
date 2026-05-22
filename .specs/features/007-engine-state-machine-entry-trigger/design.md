# Engine State Machine + EntryTrigger Design

New module `apps/api/src/modules/engine/`.

```
engine/
├── engine.module.ts
├── core/
│   ├── domain/
│   │   ├── lead-journey-status.ts       # derived const object (ADR 002)
│   │   ├── journey-event.ts             # derived const object
│   │   └── lead-journey-transition.ts   # pure transition(current, event)
│   ├── use-cases/{create,list,delete}-entry-trigger.use-case.ts (+ __test__)
│   └── errors/{journey,entry-trigger}.errors.ts
├── http/controllers/entry-trigger.controller.ts   # admin, workspace-scoped
└── persistence/entry-trigger.repository.ts
```

Table `apps/api/src/db/schemas/entry-triggers.ts`.

## State machine (`lead-journey-transition.ts`, pure)

`LeadJourneyStatus` (const object → union): `running`, `paused`, `replied`,
`exhausted`, `stopped`, `error_state`, `paused_owner_inactive`.

`JourneyEvent`: `reply`, `exhaust`, `error`, `pause`, `resume`, `stop`,
`owner_inactive`, `owner_reactivated`.

A transition table (a `Record`, not a `switch`) maps each event to `{ from[], to }`:

```
reply             from [running, paused, paused_owner_inactive] → replied
exhaust           from [running]                                → exhausted
error             from [running]                                → error_state
pause             from [running]                                → paused
resume            from [paused]                                 → running
stop              from [running, paused, paused_owner_inactive] → stopped
owner_inactive    from [running]                                → paused_owner_inactive
owner_reactivated from [paused_owner_inactive]                  → running
```

`transition(current, event)`: if `current ∈ table[event].from` → `table[event].to`,
else throw `InvalidJourneyTransitionException(current, event)`. Pure and exhaustively
unit-tested (the D1 core).

## EntryTrigger

```ts
entryTriggers = pgTable('entry_triggers', {
  ...defaults(),
  workspaceId -> workspaces (cascade),
  connectorAccountId -> connector_accounts (cascade),
  pipelineId: varchar(100),   // nullable
  stageId: varchar(100),
  cadenceId -> cadences (cascade),
}, uniqueIndex(connectorAccountId, stageId))
```

Use-cases: `CreateEntryTrigger` (validate connector account in workspace via
`ConnectorAccountRepository.findByIdInWorkspace`, cadence in workspace via
`CadenceRepository.findByIdInWorkspace`, reject duplicate `(connectorAccountId,
stageId)`), `ListEntryTriggers`, `DeleteEntryTrigger` (not-found guard). The engine
module imports `CrmModule` (for `ConnectorAccountRepository`) and `CadenceModule`
(for `CadenceRepository`) — both already export those repos. Reuses
`ConnectorAccountNotFoundException` (crm) and `CadenceNotFoundException` (cadence).

Repository: `create`, `findByAccountAndStage`, `findByIdInWorkspace`, `listByWorkspace`,
`delete`, plus `findByStage(connectorAccountId, stageId)` (the ingestion seam — returns
the `cadenceId` to start). Engine seam only; CRUD covers the rest.

## HTTP + contracts

`packages/api-contracts/src/engine/entry-trigger.contract.ts` (create request + list
response) + `Routes.entryTriggers` (`/workspaces/:id/entry-triggers`,
`/workspaces/:id/entry-triggers/:triggerId`). Admin controller + `WorkspaceAdminGuard`.
Client hooks under `api-client/engine`.

## Errors

`engine` module: `InvalidJourneyTransitionException` (422, `journey.invalid-transition`),
`DuplicateEntryTriggerException` (409), `EntryTriggerNotFoundException` (404). Reuses
crm/cadence not-found exceptions for foreign references.

## Test strategy (generate-tests)

- **Fat (unit):** `transition` across every event from legal + illegal states; create
  entry-trigger branches (connector/cadence not-found, duplicate, success).
- **Integration:** entry-trigger repo create/findByAccountAndStage/list/delete +
  `findByStage` against `kizunu_test`.
- **Thin:** controller + list/delete passthrough.
</content>
