import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users'
import { workspaces } from './workspaces'

export const sessions = pgTable(
  'sessions',
  {
    ...defaults(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar({ length: 255 }).notNull().unique(),
    activeWorkspaceId: uuid().references(() => workspaces.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    lastSeenAt: timestamp({ withTimezone: true }),
    userAgent: text(),
    ipAddress: varchar({ length: 45 }),
  },
  (table) => [index('sessions_user_revoked_idx').on(table.userId, table.revokedAt)],
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
