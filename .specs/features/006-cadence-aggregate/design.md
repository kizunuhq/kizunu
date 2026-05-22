# Cadence Aggregate Design

Extends `apps/api/src/modules/cadence/` (alongside the template sub-area).

```
cadence/
├── core/
│   ├── use-cases/{create,list-workspace,get,update,delete}-cadence.use-case.ts (+ __test__)
│   ├── domain/cadence-validator.ts       # pure: validate steps against registry + templates
│   └── errors/cadence.errors.ts
├── http/controllers/cadence.controller.ts  # admin, workspace-scoped
└── persistence/cadence.repository.ts        # transactional create/update with steps
```

## Tables

```ts
cadenceStatus = pgEnum('cadence_status', ['active', 'inactive'])
channelStrategy = pgEnum('channel_strategy', ['lead_owner'])

cadences = pgTable('cadences', {
  ...defaults(),
  workspaceId -> workspaces (cascade),
  name: varchar(120),
  status: cadenceStatus().notNull().default('active'),
  stopOnReply: boolean().notNull().default(true),
  onReply: jsonb().$type<CadenceAction[]>().notNull().default([]),
  onExhausted: jsonb().$type<CadenceAction[]>().notNull().default([]),
  onComplete: jsonb().$type<CadenceAction[]>().notNull().default([]),
})

cadenceSteps = pgTable('cadence_steps', {
  ...defaults(),
  cadenceId -> cadences (cascade),
  stepOrder: integer().notNull(),
  delayMinutes: integer().notNull(),
  jitterMinutes: integer().notNull().default(0),
  channelStrategy: channelStrategy().notNull().default('lead_owner'),
  channelPluginId: varchar(100).notNull(),
  templateId -> templates (set null, nullable),
}, uniqueIndex(cadenceId, stepOrder))
```

`CadenceAction` type lives in `@kizunu/api-contracts/cadence` (shared with the create
request) as a zod discriminated union on `type`; the engine consumes the inferred type.

## CadenceAction vocabulary (api-contracts, zod discriminated union)

```
move_stage   { type, stageId, pipelineId? }
mark_lost    { type, reason }
log_activity { type, activityType, subject, note? }
notify_user  { type, userId }
set_field    { type, key, value }
webhook_out  { type, url, payload? }
```

## Validation (`cadence-validator.ts`, pure → unit tested)

`validateSteps(steps, { hasPlugin, findTemplate })` returns void or throws:
- steps length >= 1 → else `EmptyCadenceException`.
- per step: `hasPlugin(channelPluginId)` → else `UnknownChannelPluginException`.
- per step with `templateId`: `findTemplate(templateId)` exists in workspace → else
  `TemplateNotFoundException`; `template.channelPluginId === step.channelPluginId` →
  else `TemplateChannelMismatchException`.

The use-case injects `ChannelPluginRegistry.has` and `TemplateRepository.findByIdInWorkspace`
behind these two callbacks, keeping the validator pure and unit-testable without DI.

## Use-cases

- `CreateCadenceUseCase` — validate (await template lookups), then
  `repo.createWithSteps(cadence, steps)` in a transaction. Returns id.
- `UpdateCadenceUseCase` — `findByIdInWorkspace` or `CadenceNotFoundException`;
  re-validate; `repo.replaceSteps` + update fields in a transaction.
- `GetCadenceUseCase` — cadence + ordered steps + hooks, or `CadenceNotFoundException`.
- `ListCadencesUseCase` — id, name, status, stepCount.
- `DeleteCadenceUseCase` — `findByIdInWorkspace` or throw; delete (cascade).

## Repository (`cadence.repository.ts`)

`createWithSteps` / `replaceSteps` run inside `drizzle.db.transaction`. Also
`findByIdInWorkspace`, `listByWorkspace` (with step count via a grouped count),
`getWithSteps`, `delete`.

## HTTP + contracts

`packages/api-contracts/src/cadence/cadence.contract.ts`: `CadenceActionSchema`,
`CadenceStepSchema` (delay/jitter `>= 0`, `channelPluginId`, optional `templateId`),
create/update request (name, status, stopOnReply, steps[], hooks), and response shapes.
`Routes.cadences` (`/workspaces/:id/cadences`, `/workspaces/:id/cadences/:cadenceId`).
Admin controller + `WorkspaceAdminGuard`. Client hooks under `api-client/cadence`.

## Errors (`cadence.errors.ts`)

`CadenceNotFoundException` (404), `EmptyCadenceException` (422),
`TemplateChannelMismatchException` (422). Reuses `UnknownChannelPluginException`
(channel module) and `TemplateNotFoundException` (template.errors).

## Test strategy (generate-tests)

- **Fat (unit):** `cadence-validator` (empty, unknown plugin, missing template, channel
  mismatch, valid) with in-memory callbacks; create/update use-case branches (validation
  + delegates to repo); get/delete not-found.
- **Integration:** `cadence.repository` `createWithSteps` + `getWithSteps` (ordered) +
  `replaceSteps` (no orphans) + list step count against `kizunu_test`.
- **Thin:** controller passthrough.
</content>
