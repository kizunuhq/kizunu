# Pipedrive connector health check — Design

## D1 — Port addition: `CRMConnector.checkHealth?`

Mirror the `directory?` shape. New types:

```ts
// apps/api/src/modules/crm/core/connector/connector-health.ts
export interface ConnectorHealthCheck {
  id: string
  label: string
  status: 'ok' | 'fail'
  detail?: string
}

export interface ConnectorHealth {
  overall: 'ready' | 'degraded' | 'unreachable'
  checks: ConnectorHealthCheck[]
}
```

Port additions:

```ts
export interface CRMConnector<S extends ZodType = ZodType, I extends ZodType = S> {
  ...
  checkHealth?(input: { credentials: z.infer<S> }): Promise<ConnectorHealth>
}
```

Registry seam:

```ts
async checkHealth(id: string, rawCredentials: unknown): Promise<ConnectorHealth> {
  const connector = this.get(id)
  if (!connector.checkHealth) throw new ConnectorHealthUnsupportedException(id)
  return connector.checkHealth({ credentials: this.parseCredentials(connector, id, rawCredentials) })
}
```

New exception:

```ts
export class ConnectorHealthUnsupportedException extends ApplicationException {
  constructor(connectorId: string) {
    super('crm.health-unsupported', 'This CRM connector does not expose a health check.', 422, { connectorId })
  }
}
```

## D2 — Pipedrive implementation

New file `apps/api/src/modules/crm/plugins/pipedrive/pipedrive-health.ts`:

- Pure function `runPipedriveHealth(ctx, credentials)` returning `ConnectorHealth`.
- Runs four Pipedrive calls in parallel via `Promise.allSettled`:
  - `/v1/users/me`
  - `/v1/pipelines`
  - `/v1/stages`
  - `/v1/dealFields`
- For each, on 401/403 → `{token: fail with token-rejected detail}` overrides token check AND triggers `overall=unreachable`. On other non-2xx or thrown error → `fail` with detail. On 2xx → parse `data.length` and assert ≥ 1.
- The `user` check reads `/v1/users/me`'s body in addition to its status: both `data.id` and `data.email` present and non-empty.
- The `webhook` check is a synchronous read of `credentials.webhookToken`: present-and-non-empty → ok, else → fail.
- Overall calculation:
  - Token fail → `unreachable`.
  - Else any fail → `degraded`.
  - Else → `ready`.

Wire-in: `pipedrive.connector.ts` declares `checkHealth: async ({ credentials }) => runPipedriveHealth({ fetchFn, baseUrlOverride }, credentials)`.

## D3 — Use case + controller

New `CheckConnectorHealthUseCase`:

```ts
@Injectable()
export class CheckConnectorHealthUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly registry: CrmConnectorRegistry,
  ) {}

  async execute(input: { workspaceId: string; accountId: string }): Promise<ConnectorHealth> {
    const account = await this.accounts.findInWorkspaceOrThrow(input.accountId, input.workspaceId)
    return this.registry.checkHealth(account.connectorId, account.credentials)
  }
}
```

Repo seam: reuse existing `findInWorkspaceOrThrow` (or whichever flavor exists; pick the one that throws `ConnectorAccountNotFoundException`).

Controller adds:

```ts
@Get(':id/connector-accounts/:accountId/health')
async health(@Param('id') workspaceId, @Param('accountId') accountId) {
  return await this.checkHealthUseCase.execute({ workspaceId, accountId })
}
```

`WorkspaceAdminGuard` covers AuthN/AuthZ (PCH-07) via the class-level guard.

## D4 — Contract

`packages/api-contracts/src/crm/connector-health.contract.ts`:

```ts
export const ConnectorHealthCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.union([z.literal('ok'), z.literal('fail')]),
  detail: z.string().optional(),
})
export const ConnectorHealthSchema = z.object({
  overall: z.union([z.literal('ready'), z.literal('degraded'), z.literal('unreachable')]),
  checks: z.array(ConnectorHealthCheckSchema),
})
export type ConnectorHealthCheck = z.infer<typeof ConnectorHealthCheckSchema>
export type ConnectorHealth = z.infer<typeof ConnectorHealthSchema>
```

Add `Routes.connectorAccountHealth = (workspaceId, accountId) => \`/workspaces/\${workspaceId}/connector-accounts/\${accountId}/health\``.

The TS interface `ConnectorHealth` exported from the contract is the authoritative shape; the API port `core/connector/connector-health.ts` re-uses it (single source of truth for the wire shape; closed-vocabulary `'ok'|'fail'`/`'ready'|'degraded'|'unreachable'` follows the bare-union exception for internal narrowings under `.agents/rules/enums.md` §3.2 — actually no, this is a wire vocabulary the web also branches on, so use the const-object pattern). Revisit in tasks — if it stays internal to API, bare union is fine; if web branches on it for styling, follow rule §1.

**Decision in spec:** web branches on overall to pick the pill color. Therefore the vocabulary is closed and shared → use const-object + derived type per rule §1.

## D5 — Web

- New `@kizunu/api-client/crm/use-connector-health.ts` (query hook, `enabled: true`, no auto-refetch).
- New composed primitive
  `apps/web/src/components/composed/connector-health-pill.tsx` — takes
  `{ health: ConnectorHealth | undefined, isPending, onRefresh }` and
  renders the pill + tooltip. Tooltip uses the existing shadcn
  `tooltip` primitive.
- Settings/connectors list rewrite: the table gains a "Status" column.
  Per-row component fetches its own health (avoids batch endpoint
  scope). A small refresh button (Phosphor `ArrowsClockwise`) sits next
  to the pill.

## Test plan

- **Fat**: `runPipedriveHealth` — five branch tests covering each Pipedrive
  call's success + failure, the token-rejected → unreachable rule, and
  the parallel-execution invariant (assert all four fetch calls were
  initiated before any awaited the first response — use `Promise.race`
  on the `fetchFn` invocations).
- **Fat**: registry's `checkHealth` — happy + unsupported.
- **Thin**: use-case (orchestration).
- **E2E**: 3 scenarios — happy path (all checks pass), token-rejected
  (overall unreachable), non-Pipedrive connector (`crm.health-unsupported`).
- **Fat**: web health-pill component — three pill colors + tooltip text + refresh click handler.

## Out-of-scope (deferred)

- Periodic polling (CONCERNS, when needed).
- Health badge in the journey-recovery surface (feature 072 territory).
