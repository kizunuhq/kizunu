import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  ...defaults(),
  email: varchar({ length: 255 }).notNull().unique(),
  // Nullable: OAuth-only accounts have no password until they set one via reset.
  passwordHash: varchar({ length: 255 }),
  name: varchar({ length: 255 }).notNull(),
  emailVerifiedAt: timestamp({ withTimezone: true }),
  lastLoginAt: timestamp({ withTimezone: true }),
  failedAttempts: integer().notNull().default(0),
  lockedUntil: timestamp({ withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
