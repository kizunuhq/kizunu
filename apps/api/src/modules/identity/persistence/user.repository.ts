import { memberships } from '@kizunu/api/db/schemas/memberships'
import { type User, users } from '@kizunu/api/db/schemas/users'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq, isNotNull, sql } from 'drizzle-orm'

@Injectable()
export class UserRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: string): Promise<User | undefined> {
    const rows = await this.drizzle.db.select().from(users).where(eq(users.id, id)).limit(1)
    return rows[0]
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.drizzle.db.select().from(users).where(eq(users.email, email)).limit(1)
    return rows[0]
  }

  /**
   * Resolves a workspace member whose email matches the (lowercased) candidate AND
   * whose email is verified AND whose membership is active. The owner-mapping
   * auto-match path uses this — only verified, active members can claim a CRM
   * external owner identity by email.
   */
  async findVerifiedActiveByEmail(
    workspaceId: string,
    lowercaseEmail: string,
  ): Promise<{ userId: string; membershipId: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ userId: users.id, membershipId: memberships.id })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(
        and(
          eq(users.email, lowercaseEmail),
          isNotNull(users.emailVerifiedAt),
          eq(memberships.workspaceId, workspaceId),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1)
    return rows[0]
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.drizzle.db.update(users).set({ passwordHash }).where(eq(users.id, id))
  }

  async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.drizzle.db.update(users).set({ emailVerifiedAt: verifiedAt }).where(eq(users.id, id))
  }

  async incrementFailedAttempts(id: string): Promise<number> {
    const rows = await this.drizzle.db
      .update(users)
      .set({ failedAttempts: sql`${users.failedAttempts} + 1` })
      .where(eq(users.id, id))
      .returning({ failedAttempts: users.failedAttempts })
    return rows[0]?.failedAttempts ?? 0
  }

  async lockUntil(id: string, until: Date): Promise<void> {
    await this.drizzle.db.update(users).set({ lockedUntil: until }).where(eq(users.id, id))
  }

  async resetFailedAttemptsAndTouchLastLogin(id: string): Promise<void> {
    await this.drizzle.db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(users.id, id))
  }
}
