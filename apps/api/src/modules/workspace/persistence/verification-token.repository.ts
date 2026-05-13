import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { verificationTokens } from '../../../db/schemas/verification-tokens'

export type VerificationTokenType = 'email_verification' | 'password_reset' | 'invitation'

export interface VerificationTokenRecord {
  id: string
  type: VerificationTokenType
  userId: string | null
  email: string | null
  workspaceId: string | null
  hashedToken: string
  expiresAt: Date
  consumedAt: Date | null
}

@Injectable()
export class VerificationTokenRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: {
    type: VerificationTokenType
    userId?: string | null
    email?: string | null
    workspaceId?: string | null
    hashedToken: string
    expiresAt: Date
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(verificationTokens)
      .values({
        type: input.type,
        userId: input.userId ?? null,
        email: input.email ?? null,
        workspaceId: input.workspaceId ?? null,
        hashedToken: input.hashedToken,
        expiresAt: input.expiresAt,
      })
      .returning({ id: verificationTokens.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create verification token')
    return created
  }

  async findActiveByHashedToken(
    type: VerificationTokenType,
    hashedToken: string,
  ): Promise<VerificationTokenRecord | undefined> {
    const rows = await this.drizzle.db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.type, type),
          eq(verificationTokens.hashedToken, hashedToken),
          isNull(verificationTokens.consumedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async markConsumed(id: string): Promise<void> {
    await this.drizzle.db
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, id))
  }
}
