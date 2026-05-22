import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

import { workspaces } from './workspaces'

/**
 * A CRM connector instance owned by a workspace. `connectorId` selects the connector
 * in the registry; `credentials` holds the provider token + config validated against
 * that connector's configSchema and is never returned by read endpoints. CRM is
 * workspace-level, so there is no per-user access (unlike channel accounts).
 */
export const connectorAccounts = pgTable(
  'connector_accounts',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectorId: varchar({ length: 100 }).notNull(),
    name: varchar({ length: 120 }).notNull(),
    credentials: jsonb().notNull(),
  },
  (table) => [index('connector_accounts_workspace_idx').on(table.workspaceId)],
)

export type ConnectorAccount = typeof connectorAccounts.$inferSelect
export type NewConnectorAccount = typeof connectorAccounts.$inferInsert
