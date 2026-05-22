# CRM Connector + Pipedrive Design

Mirrors the channel module's port/registry/account pattern (feature 002/003).

## Module layout

New module `apps/api/src/modules/crm/`:

```
crm/
├── crm.module.ts
├── core/
│   ├── connector/
│   │   ├── crm-connector.ts              # CRMConnector port
│   │   ├── crm-connector-manifest.ts
│   │   ├── normalized-event.ts           # { type, externalId, ownerExternalId, occurredAt, stageId?, idempotencyKey, raw }
│   │   ├── normalized-lead.ts            # { externalId, ownerExternalId, name, phone?, raw }
│   │   ├── crm-activity.ts               # logActivity input { type, subject, note?, ownerExternalId }
│   │   ├── stage-ref.ts                  # { pipelineId?, stageId }
│   │   ├── crm-connector-registry.ts     # CRM_CONNECTORS DI token + registry
│   │   └── __test__/
│   ├── use-cases/                        # create/list connector accounts (+ __test__)
│   └── errors/crm.errors.ts
├── http/controllers/connector-account.controller.ts   # admin, workspace-scoped
├── persistence/connector-account.repository.ts
└── plugins/pipedrive/
    ├── pipedrive.connector.ts            # implements CRMConnector
    ├── pipedrive-credentials.ts          # zod: { apiToken, companyDomain, activityType?, phoneFieldKey? }
    ├── pipedrive-webhook.ts              # parseWebhook normalization (pure)
    ├── pipedrive-api.ts                  # outbound HTTP (fetch injectable)
    └── __test__/
```

Table `apps/api/src/db/schemas/connector-accounts.ts`. Migration via `bun db:generate`.

## Port (D3 — frozen)

```ts
interface CRMConnector {
  readonly manifest: CrmConnectorManifest
  parseWebhook(raw: unknown, config: unknown): NormalizedEvent[]   // pure, never throws
  fetchLead(externalId: string, credentials: unknown): Promise<NormalizedLead>
  logActivity(externalId: string, activity: CrmActivity, credentials: unknown): Promise<{ externalActivityId: string }>
  moveStage(externalId: string, stage: StageRef, credentials: unknown): Promise<void>
  markLost(externalId: string, reason: string, credentials: unknown): Promise<void>
  setField(externalId: string, field: string, value: unknown, credentials: unknown): Promise<void>
}
```

`NormalizedEvent.type` is the internal vocabulary (`'lead.stage_entered'`). Registry is
a copy of `ChannelPluginRegistry` shape (DI token `CRM_CONNECTORS`, `get`/`has`/
`listManifests`/`validateCredentials`).

## ConnectorAccount

```ts
connectorAccounts = pgTable('connector_accounts', {
  ...defaults(),
  workspaceId -> workspaces (cascade),
  connectorId: varchar(100),
  name: varchar(120),
  credentials: jsonb,
}, index on workspaceId)
```

No per-user access (CRM is workspace-level). Use-cases: `CreateConnectorAccount`
(validate via registry, persist), `ListWorkspaceConnectorAccounts` (projection without
credentials). Repo: `create`, `listByWorkspace`, `findByIdInWorkspace`,
`findByConnectorInWorkspace` (engine seam — outbound actions resolve the token).

## Pipedrive connector

- **credentials** (`pipedrive-credentials.ts`, strict zod): `apiToken`, `companyDomain`
  (for the `https://{domain}.pipedrive.com/api/v1` base), optional `activityType`
  (default `task`), optional `phoneFieldKey`.
- **parseWebhook** (`pipedrive-webhook.ts`, pure): defensive walk of the v1 webhook
  envelope (`event`, `current`, `previous`, `meta`); emit a `lead.stage_entered` event
  only when `current.stage_id !== previous.stage_id`; idempotency key
  `pipedrive:deal:{id}:event:{event}:{timestamp}`. Never throws.
- **pipedrive-api.ts**: `fetch`-based calls (base/fetch injectable for tests).
  `logActivity` → POST `/activities` (`deal_id`, `user_id`, `type`, `subject`, `note`);
  `moveStage` → PUT `/deals/{id}` `{ stage_id }`; `markLost` → PUT `/deals/{id}`
  `{ status: 'lost', lost_reason }`; `setField` → PUT `/deals/{id}` `{ [field]: value }`;
  `fetchLead` → GET `/deals/{id}` → `NormalizedLead`. API token passed as `?api_token=`.
  Non-OK → `CrmRequestFailedException`.

## HTTP + contracts

`packages/api-contracts/src/crm/` (create + list connector account schemas) + `Routes.connectorAccounts`
(`/workspaces/:id/connector-accounts`). Admin controller reuses `WorkspaceAdminGuard`.
Client hooks under `packages/api-client/src/crm/`.

## Errors (`crm.errors.ts`)

`UnknownCrmConnectorException` (404), `DuplicateCrmConnectorException` (500),
`InvalidConnectorCredentialsException` (422), `ConnectorAccountNotFoundException` (404),
`CrmRequestFailedException` (502).

## Test strategy (generate-tests)

- **Fat (unit):** registry (resolve/dup/credential validation); `parseWebhook` (stage
  change, no-change, non-deal, junk, idempotency key); Pipedrive outbound actions
  (request shape + non-OK error) with a fake fetch.
- **Integration:** `connector-account.repository` create/list/findByConnector against
  `kizunu_test` (projection excludes credentials).
- **Thin:** controllers + create/list use-cases are passthrough.
</content>
