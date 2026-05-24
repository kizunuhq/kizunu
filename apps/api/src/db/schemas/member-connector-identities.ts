import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { connectorAccounts } from './connector-accounts'
import { memberships } from './memberships'
import { workspaces } from './workspaces'

/**
 * Maps a workspace member to a connector-side user identity (e.g. a Pipedrive
 * user id). Two uniqueness rules enforce the spec: one external id per
 * connector account (so a Pipedrive user maps to exactly one member), and one
 * external id per member per connector account (so a member can't own two
 * Pipedrive identities on the same account).
 */
export const memberConnectorIdentities = pgTable(
  'member_connector_identities',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    membershipId: uuid()
      .notNull()
      .references(() => memberships.id, { onDelete: 'cascade' }),
    connectorAccountId: uuid()
      .notNull()
      .references(() => connectorAccounts.id, { onDelete: 'cascade' }),
    externalId: varchar({ length: 120 }).notNull(),
    createdBy: varchar({ length: 80 }).notNull(),
    sourceEmail: varchar({ length: 255 }),
  },
  (table) => [
    uniqueIndex('mci_account_external_idx').on(table.connectorAccountId, table.externalId),
    uniqueIndex('mci_account_membership_idx').on(table.connectorAccountId, table.membershipId),
  ],
)

export type MemberConnectorIdentityRow = typeof memberConnectorIdentities.$inferSelect
export type NewMemberConnectorIdentityRow = typeof memberConnectorIdentities.$inferInsert
