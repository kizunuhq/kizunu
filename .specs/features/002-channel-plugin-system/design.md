# Channel Plugin System Design

Implements `spec.md`. Follows the per-module hexagonal layout (`core/`, `http/`,
`persistence/`), the type-safe API boundary, and the "one type per file" rule.

## Module layout

New module `apps/api/src/modules/channel/`:

```
channel/
├── channel.module.ts
├── core/
│   ├── plugin/
│   │   ├── channel-plugin.ts            # ChannelPlugin port (interface)
│   │   ├── channel-plugin-manifest.ts   # manifest type
│   │   ├── channel-capability.ts        # 'freeform' | 'template' | 'media'
│   │   ├── channel-decision.ts          # Decision type
│   │   ├── send-payload.ts              # send() input
│   │   ├── send-result.ts               # send() output
│   │   ├── inbound-message.ts           # parseInbound() output element
│   │   ├── validate-input.ts            # validate() input (step/leadState/channelState)
│   │   ├── channel-plugin-registry.ts   # registry service
│   │   └── __test__/                     # fake plugin + registry specs
│   ├── use-cases/
│   │   ├── create-channel-account.use-case.ts
│   │   ├── list-workspace-channel-accounts.use-case.ts
│   │   ├── grant-channel-access.use-case.ts
│   │   ├── revoke-channel-access.use-case.ts
│   │   ├── set-primary-channel.use-case.ts
│   │   ├── list-my-channels.use-case.ts
│   │   ├── list-available-plugins.use-case.ts
│   │   └── __test__/unit/*.spec.ts
│   └── errors/channel.errors.ts
├── http/controllers/
│   ├── channel-account.controller.ts    # workspace-scoped (admin)
│   └── my-channel.controller.ts         # caller-scoped (member)
└── persistence/
    ├── channel-account.repository.ts
    └── channel-access.repository.ts
```

Tables in `apps/api/src/db/schemas/`: `channel-accounts.ts`, `channel-accesses.ts`
(+ exports in `index.ts`). Migration via `bun db:generate` (immutable thereafter).

## Contract (the port, D2 — frozen)

```ts
// channel-capability.ts
export type ChannelCapability = 'freeform' | 'template' | 'media'

// channel-plugin-manifest.ts
export interface ChannelPluginManifest {
  id: string
  name: string
  capabilities: ChannelCapability[]
  configSchema: ZodType // validates ChannelAccount.credentials
}

// channel-decision.ts
export interface ChannelDecision {
  action: 'send' | 'skip' | 'error'
  mode?: 'freeform' | 'template'
  reason?: string
}

// channel-plugin.ts
export interface ChannelPlugin {
  readonly manifest: ChannelPluginManifest
  send(payload: SendPayload, credentials: unknown): Promise<SendResult>
  parseInbound(raw: unknown, credentials: unknown): Promise<InboundMessage[]>
  validate(input: ValidateInput): ChannelDecision
}
```

`validate` is synchronous (pure decision over given state). `send`/`parseInbound`
are async (network/parse). `credentials` is `unknown` at the port; each plugin
narrows it via its own `configSchema`. Engine-facing supporting types
(`SendPayload`, `SendResult`, `InboundMessage`, `ValidateInput`) are deliberately
minimal here and may gain fields in `003`/engine without breaking the port shape.

### Registry

`ChannelPluginRegistry` (Injectable). Plugins self-register at module init through a
DI multi-provider token `CHANNEL_PLUGINS` (array of `ChannelPlugin`); the registry
indexes them by `manifest.id` in its constructor, throwing on duplicates.

- `get(id): ChannelPlugin` — throws `UnknownChannelPluginException` if absent.
- `has(id): boolean`
- `listManifests(): ChannelPluginManifest[]`
- `validateCredentials(id, credentials): unknown` — runs the plugin's `configSchema`,
  throwing `InvalidChannelCredentialsException` on failure; returns parsed value.

For this slice the fake plugin lives under `core/plugin/__test__/` and is provided
into `CHANNEL_PLUGINS` only in tests. The module ships with an empty plugin array so
production wiring is real but no live plugin exists yet (Meta arrives in `003`).

## Tables

```ts
// channel-accounts.ts
export const channelAccounts = pgTable('channel_accounts', {
  ...defaults(),
  workspaceId: uuid().notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  pluginId: varchar({ length: 100 }).notNull(),
  name: varchar({ length: 120 }).notNull(),
  credentials: jsonb().notNull(),
})

// channel-accesses.ts
export const channelAccesses = pgTable('channel_accesses', {
  ...defaults(),
  channelAccountId: uuid().notNull().references(() => channelAccounts.id, { onDelete: 'cascade' }),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPrimary: boolean().notNull().default(false),
}, (t) => [uniqueIndex('channel_accesses_account_user_idx').on(t.channelAccountId, t.userId)])
```

No explicit Drizzle column names (snake_case derived). "One primary per user per
plugin" is enforced in the use-case (clear-then-set inside a transaction), not by a
DB constraint, because the plugin dimension lives on the joined account row.

## Use-cases (business rules = fat → unit tested)

| Use-case | Rules |
| --- | --- |
| `CreateChannelAccount` | registry.get(pluginId) or throw; registry.validateCredentials; persist scoped to workspace |
| `ListWorkspaceChannelAccounts` | return projection without `credentials` |
| `GrantChannelAccess` | account in workspace; target user is a workspace member; idempotent on `(account,user)` |
| `RevokeChannelAccess` | delete `(account,user)`; no-op if absent |
| `SetPrimaryChannel` | caller has access; tx: clear primary on caller's accounts of same plugin, set chosen |
| `ListMyChannels` | join access→account; include `isPrimary`; only caller's accounts |
| `ListAvailablePlugins` | registry.listManifests projection |

Membership check reuses `WorkspaceMemberRepository.findExistingMembership` — the
`channel` module imports it from the workspace module (exported via `WorkspaceModule`).

### Repositories

`ChannelAccountRepository`: `create`, `findByIdInWorkspace(id, workspaceId)`,
`listByWorkspace(workspaceId)`.
`ChannelAccessRepository`: `findByAccountAndUser`, `grant` (insert ignore on
conflict), `revoke`, `listByUser(userId)` (joined to account for pluginId/name),
`clearPrimaryForUserPlugin(userId, pluginId)`, `setPrimary(accessId)`,
`findPrimaryAccess(userId, pluginId)` (engine seam, returns the account or none).
Transaction helper from `DrizzleService` wraps clear+set in `SetPrimaryChannel`.

## HTTP + Routes (api-contracts first)

New contract dir `packages/api-contracts/src/channel/` with `*.contract.ts` for
each request/response, plus `Routes.channels` / `Routes.channelAccounts`:

```ts
channelAccounts: {
  collection: (workspaceId) => `/workspaces/${workspaceId}/channel-accounts`,
  access: (workspaceId, accountId) =>
    `/workspaces/${workspaceId}/channel-accounts/${accountId}/access`,
  accessMember: (workspaceId, accountId, userId) =>
    `/workspaces/${workspaceId}/channel-accounts/${accountId}/access/${userId}`,
},
channels: {
  mine: '/channel-accounts/mine',
  primary: (accountId) => `/channel-accounts/${accountId}/primary`,
  plugins: '/channel-plugins',
},
```

Endpoints:

| Method/Path | Guard | Use-case |
| --- | --- | --- |
| `POST /workspaces/:id/channel-accounts` | admin | CreateChannelAccount |
| `GET /workspaces/:id/channel-accounts` | admin | ListWorkspaceChannelAccounts |
| `POST /workspaces/:id/channel-accounts/:accountId/access` | admin | GrantChannelAccess |
| `DELETE /workspaces/:id/channel-accounts/:accountId/access/:userId` | admin | RevokeChannelAccess |
| `GET /channel-accounts/mine` | auth | ListMyChannels |
| `PUT /channel-accounts/:accountId/primary` | auth | SetPrimaryChannel |
| `GET /channel-plugins` | auth | ListAvailablePlugins |

`credentials` is accepted on create as `z.record(z.string(), z.unknown())` in the
contract (the plugin's `configSchema` does the real validation server-side) and is
never present in any response schema. Admin endpoints reuse `WorkspaceAdminGuard`
(keyed on the `:id` param).

`api-client`: `channel/channel.api.ts` calling `Routes.*`, plus hooks
`use-workspace-channels.ts`, `use-create-channel-account.ts`,
`use-grant-channel-access.ts`, `use-revoke-channel-access.ts`, `use-my-channels.ts`,
`use-set-primary-channel.ts`, `use-channel-plugins.ts`; query keys in `query-keys.ts`.

## Errors (`channel.errors.ts`, extend `ApplicationException`)

- `UnknownChannelPluginException` (404, `channel.plugin-unknown`)
- `DuplicateChannelPluginException` (500, `channel.plugin-duplicate`) — registry init
- `InvalidChannelCredentialsException` (422, `channel.invalid-credentials`)
- `ChannelAccountNotFoundException` (404, `channel.account-not-found`)
- `ChannelAccessNotFoundException` (404, `channel.access-not-found`)
- `UserNotInWorkspaceException` (422, `channel.user-not-in-workspace`)

## Test strategy (via generate-tests)

- **Fat (unit):** registry (resolve/unknown/duplicate/validateCredentials), and each
  use-case's branch rules (create validation, grant membership/workspace checks +
  idempotency, set-primary clear-per-plugin, list-mine projection). Fake plugin as
  the real collaborator; repositories are the boundary (test doubles in unit, or
  integration against `kizunu_test`).
- **Thin (e2e/integration):** controllers are passthrough; cover via the HTTP-level
  integration suite for the create→grant→set-primary→list-mine path and the
  no-credentials-in-response assertion.
</content>
