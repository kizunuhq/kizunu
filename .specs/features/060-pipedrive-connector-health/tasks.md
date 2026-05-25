# Pipedrive connector health check — Tasks

## T1 — Contracts: ConnectorHealth schemas + Routes entry

`packages/api-contracts/src/crm/connector-health.contract.ts` exports
the two schemas + inferred types + closed-vocabulary const objects for
`status` (`'ok'|'fail'`) and `overall` (`'ready'|'degraded'|'unreachable'`)
per `.agents/rules/enums.md` §1. `Routes` gains
`connectorAccountHealth(workspaceId, accountId)`. Re-export from `crm/index.ts`.

**Done when:** schemas accept/reject sample bodies in a focused unit test.

## T2 — API port: `checkHealth?` + registry seam + exception

- Add `ConnectorHealth`/`ConnectorHealthCheck` to `core/connector/connector-health.ts` (re-export of the contract type).
- Add `checkHealth?` to `CRMConnector`.
- Add `ConnectorHealthUnsupportedException` (`crm.health-unsupported`, 422).
- Add `CrmConnectorRegistry.checkHealth(id, rawCredentials)`.

**Done when:** registry unit spec covers both branches (hook present / missing).

## T3 — `runPipedriveHealth` helper

`plugins/pipedrive/pipedrive-health.ts` exports the pure function
described in design D2. Uses `Promise.allSettled` over four fetch calls.
Five-plus unit tests cover the matrix.

## T4 — Wire Pipedrive

`pipedrive.connector.ts` declares `checkHealth: async ({ credentials }) => runPipedriveHealth({ fetchFn, baseUrlOverride }, credentials)`.

## T5 — Use case + controller

- `CheckConnectorHealthUseCase` orchestrator (thin).
- Controller adds `GET ...accountId/health`.
- Wire into `CrmModule`.

## T6 — E2E (3 scenarios)

`connector-health-flow.spec.ts` — same `injectPipedriveFetch` pattern as
059 T8 / connector-directory-flow. Three cases: happy / token-rejected /
unsupported-connector (force a fake non-pipedrive registry entry, or
just assert the route surfaces a 404 when the account doesn't exist — pick
the cleaner one).

## T7 — Web — health hook + pill primitive

- `packages/api-client/src/crm/use-connector-health.ts` (TanStack Query).
- `apps/web/src/components/composed/connector-health-pill.tsx`
  (composed primitive, ≤50 lines, uses shadcn tooltip).

## T8 — Web — settings/connectors row integration

Wire the pill + refresh button into the existing
`apps/web/src/routes/_app/settings/connectors/index.tsx` table (a "Status"
column). Per-row health fetch is independent — no batch endpoint.

## T9 — Docs + state

- `ROADMAP.md` PLANNED → COMPLETE on the row.
- `STATE.md` Lessons entry.

Each task ends with `bun check` green.
