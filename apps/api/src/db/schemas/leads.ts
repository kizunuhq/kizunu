import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { connectorAccounts } from './connector-accounts'
import { users } from './users'
import { workspaces } from './workspaces'

/**
 * A lead mirrored from the CRM (one per connector account + external deal id). The
 * engine sends to `phone`; `ownerExternalId` is the CRM owner, mapped to a Kizunu
 * user (`ownerUserId`) once reassignment exists — null until then.
 */
export const leads = pgTable(
  'leads',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectorAccountId: uuid()
      .notNull()
      .references(() => connectorAccounts.id, { onDelete: 'cascade' }),
    externalId: varchar({ length: 120 }).notNull(),
    ownerExternalId: varchar({ length: 120 }),
    ownerUserId: uuid().references(() => users.id, { onDelete: 'set null' }),
    name: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 40 }),
  },
  (table) => [
    uniqueIndex('leads_account_external_idx').on(table.connectorAccountId, table.externalId),
  ],
)

export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
