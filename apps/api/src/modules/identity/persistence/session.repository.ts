import { type Session, sessions } from '@kizunu/api/db/schemas/sessions'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm'

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

  async revokeAllForUser(userId: string): Promise<void> {
    await this.drizzle.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
  }

  async listActiveForUser(userId: string): Promise<Session[]> {
    return await this.drizzle.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(sql`coalesce(${sessions.lastSeenAt}, ${sessions.createdAt})`))
  }

  async touchLastSeen(id: string, seenAt: Date): Promise<void> {
    await this.drizzle.db.update(sessions).set({ lastSeenAt: seenAt }).where(eq(sessions.id, id))
  }

  /**
   * Revokes a session only if it belongs to the user and is still active. The
   * affected-row count lets the caller enforce ownership without a separate
   * fetch-then-compare (a session the user does not own affects zero rows).
   */
  async revokeForUser(userId: string, sessionId: string): Promise<number> {
    const rows = await this.drizzle.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)),
      )
      .returning({ id: sessions.id })
    return rows.length
  }

  async revokeOthersForUser(userId: string, exceptSessionId: string): Promise<void> {
    await this.drizzle.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          ne(sessions.id, exceptSessionId),
          isNull(sessions.revokedAt),
        ),
      )
  }

  async updateActiveWorkspace(id: string, activeWorkspaceId: string): Promise<void> {
    await this.drizzle.db.update(sessions).set({ activeWorkspaceId }).where(eq(sessions.id, id))
  }
}
