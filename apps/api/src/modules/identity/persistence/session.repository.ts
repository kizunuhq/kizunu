import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { type Session, sessions } from '../../../db/schemas/sessions'

export interface CreateSessionInput {
  userId: string
  tokenHash: string
  activeWorkspaceId: string | null
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}

@Injectable()
export class SessionRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const rows = await this.drizzle.db
      .insert(sessions)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        activeWorkspaceId: input.activeWorkspaceId,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
      })
      .returning()
    const created = rows[0]
    if (!created) throw new Error('Failed to create session')
    return created
  }

  async findActiveByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const rows = await this.drizzle.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async revoke(id: string): Promise<void> {
    await this.drizzle.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id))
  }

  async updateActiveWorkspace(id: string, activeWorkspaceId: string): Promise<void> {
    await this.drizzle.db.update(sessions).set({ activeWorkspaceId }).where(eq(sessions.id, id))
  }
}
