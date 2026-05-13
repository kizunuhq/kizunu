import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'
import { workspaces } from './workspaces'

export const verificationTokenTypeEnum = pgEnum('verification_token_type', [
  'email_verification',
  'password_reset',
  'invitation',
])

export const verificationTokens = pgTable('verification_tokens', {
  ...defaults(),
  type: verificationTokenTypeEnum().notNull(),
  userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
  email: varchar({ length: 255 }),
  workspaceId: uuid().references(() => workspaces.id, { onDelete: 'cascade' }),
  hashedToken: varchar({ length: 255 }).notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  consumedAt: timestamp({ withTimezone: true }),
})

export type VerificationToken = typeof verificationTokens.$inferSelect
export type NewVerificationToken = typeof verificationTokens.$inferInsert
