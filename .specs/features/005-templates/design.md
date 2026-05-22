# Templates Design

Module `apps/api/src/modules/cadence/` (the cadence aggregate, feature `006`, will join
this module). This slice adds the template sub-area.

```
cadence/
├── cadence.module.ts
├── core/
│   ├── use-cases/{create,list-workspace,update,delete}-template.use-case.ts (+ __test__)
│   └── errors/template.errors.ts
├── http/controllers/template.controller.ts          # admin, workspace-scoped
└── persistence/template.repository.ts
```

Table `apps/api/src/db/schemas/templates.ts`:

```ts
templates = pgTable('templates', {
  ...defaults(),
  workspaceId -> workspaces (cascade),
  name: varchar(120),
  channelPluginId: varchar(100),
  providerTemplateName: varchar(255),
  language: varchar(20),
  variables: jsonb().$type<string[]>().notNull().default([]),
}, uniqueIndex('templates_workspace_name_idx').on(workspaceId, name))
```

The unique index is the DB backstop; the use-case pre-checks `findByName` and throws
`DuplicateTemplateException` for a clean 409 (the fat rule).

## Use-cases

- `CreateTemplate` — reject duplicate name (pre-check), persist, return id. **Fat.**
- `ListWorkspaceTemplates` — projection of all fields. Thin.
- `UpdateTemplate` — `findByIdInWorkspace` or throw `TemplateNotFoundException`; patch
  provided fields. **Fat** (not-found branch + partial update).
- `DeleteTemplate` — `findByIdInWorkspace` or throw; delete. **Fat** (not-found branch).

Repository: `create`, `findByName(workspaceId, name)`, `findByIdInWorkspace(id, workspaceId)`,
`listByWorkspace`, `update(id, patch)`, `delete(id)`.

## HTTP + contracts

`packages/api-contracts/src/cadence/` (`template.contract.ts` with create/update request +
template response shapes) + `Routes.templates` (`/workspaces/:id/templates`,
`/workspaces/:id/templates/:templateId`). Admin controller reuses `WorkspaceAdminGuard`.
Client hooks under `packages/api-client/src/cadence/`.

## Errors (`template.errors.ts`)

`TemplateNotFoundException` (404), `DuplicateTemplateException` (409).

## Test strategy (generate-tests)

- **Fat (unit):** Create (duplicate rejection + success), Update (not-found + patch),
  Delete (not-found). Fake repo at the boundary.
- **Integration:** template repo create/findByName/list/update/delete + unique index
  against `kizunu_test`.
- **Thin:** controller + list use-case are passthrough.
</content>
