import type { Assert, Equal } from '@kizunu/nestjs-shared/lib/types/type-assert'
import { defaults } from '@kizunu/nestjs-shared/modules/persistence/schemas/defaults'
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { VerificationTokenType } from '../../modules/workspace/core/domain/verification-token'
import { users } from './users'
import { workspaces } from './workspaces'

const verificationTokenTypeEnumValues = [
  'email_verification',
  'password_reset',
  'invitation',
] as const

export const verificationTokenTypeEnum = pgEnum(
  'verification_token_type',
  verificationTokenTypeEnumValues,
)

export type _SchemaMatchesDomain = Assert<
  Equal<(typeof verificationTokenTypeEnumValues)[number], VerificationTokenType>
>

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
