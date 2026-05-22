# CRM Connector + Pipedrive Tasks

## T1 — CRM connector port + registry + errors — CRM-01
Port types (one per file), `crm.errors.ts`, `crm-connector-registry.ts` (`CRM_CONNECTORS` token).
Gate: `bun typecheck`.

## T2 — connector_accounts schema + migration + repo — CRM-02
Schema + `bun db:generate`; `connector-account.repository.ts` (create/listByWorkspace/findByIdInWorkspace/findByConnectorInWorkspace).
Gate: typecheck + drizzle gates.

## T3 — ConnectorAccount use-cases + api-contracts + client — CRM-02
`CreateConnectorAccount`, `ListWorkspaceConnectorAccounts`; `api-contracts/crm` + `Routes`; `api-client/crm` hooks.
Gate: typecheck + zod-v4.

## T4 — Pipedrive connector — CRM-03, CRM-04
`pipedrive-credentials.ts`, `pipedrive-webhook.ts` (parseWebhook), `pipedrive-api.ts` (outbound), `pipedrive.connector.ts`; register into `CRM_CONNECTORS`.
Gate: typecheck.

## T5 — HTTP controller + module wiring — CRM-02
`connector-account.controller.ts` (admin), `crm.module.ts` (registry, repo, use-cases, `CRM_CONNECTORS: [new PipedriveConnector()]`, import WorkspaceModule), register in `api.module.ts`.
Gate: `bun check`.

## T6 — Tests (generate-tests) — CRM-01..04
Unit: registry, parseWebhook (4 cases + idempotency), Pipedrive actions (fake fetch). Integration: connector-account repo.
Gate: `bun check` + CI lint.

## T7 — Docs + state
ROADMAP (CRM connector built, EntryTrigger/webhook endpoint with engine), STATE, STRUCTURE, INTEGRATIONS, CONCERNS (connector credentials unencrypted).
Gate: `bun check`.
</content>
