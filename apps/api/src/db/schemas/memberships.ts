import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgEnum, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'
import { workspaces } from './workspaces'

export const membershipRoleEnum = pgEnum('membership_role', ['admin', 'member'])
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'inactive'])

export const memberships = pgTable(
  'memberships',
  {
    ...defaults(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum().notNull().default('member'),
    status: membershipStatusEnum().notNull().default('active'),
  },
  (table) => [uniqueIndex('memberships_workspace_user_idx').on(table.workspaceId, table.userId)],
)

export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
