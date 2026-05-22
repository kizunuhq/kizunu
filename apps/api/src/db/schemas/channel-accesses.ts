import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { boolean, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { channelAccounts } from './channel-accounts'
import { users } from './users'

/**
 * Grants a user access to a channel account. `isPrimary` marks the user's default
 * outbound account for the account's plugin; the one-primary-per-user-per-plugin
 * rule is enforced in the use-case (the plugin dimension lives on the joined
 * account row), not by a DB constraint.
 */
export const channelAccesses = pgTable(
  'channel_accesses',
  {
    ...defaults(),
    channelAccountId: uuid()
      .notNull()
      .references(() => channelAccounts.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPrimary: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex('channel_accesses_account_user_idx').on(table.channelAccountId, table.userId),
  ],
)

export type ChannelAccess = typeof channelAccesses.$inferSelect
export type NewChannelAccess = typeof channelAccesses.$inferInsert
