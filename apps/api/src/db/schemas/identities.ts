import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users'

/**
 * Links a local user to an external OAuth identity. The unique
 * `(provider, providerAccountId)` makes a repeat login idempotent and is the key
 * the callback resolves a returning user by.
 */
export const identities = pgTable(
  'identities',
  {
    ...defaults(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar({ length: 50 }).notNull(),
    providerAccountId: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex('identities_provider_account_idx').on(table.provider, table.providerAccountId),
  ],
)

export type Identity = typeof identities.$inferSelect
export type NewIdentity = typeof identities.$inferInsert
