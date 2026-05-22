import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

import { workspaces } from './workspaces'

/**
 * A channel plugin instance owned by a workspace (no ownerId). `pluginId` selects
 * the plugin in the registry; `credentials` holds plugin-specific config validated
 * against that plugin's configSchema and is never returned by read endpoints.
 */
export const channelAccounts = pgTable(
  'channel_accounts',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    pluginId: varchar({ length: 100 }).notNull(),
    name: varchar({ length: 120 }).notNull(),
    credentials: jsonb().notNull(),
  },
  (table) => [index('channel_accounts_workspace_idx').on(table.workspaceId)],
)

export type ChannelAccount = typeof channelAccounts.$inferSelect
export type NewChannelAccount = typeof channelAccounts.$inferInsert
