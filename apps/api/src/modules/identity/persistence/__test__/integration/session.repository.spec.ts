import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { sessions } from '@kizunu/api/db/schemas/sessions'
import { users } from '@kizunu/api/db/schemas/users'
import { SessionRepository } from '@kizunu/api/modules/identity/persistence/session.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

const service = { db } as unknown as DrizzleService
const repo = new SessionRepository(service)

const HOUR_MS = 60 * 60 * 1000

let userCounter = 0

async function seedUser(): Promise<string> {
  userCounter += 1
  const [user] = await db
    .insert(users)
    .values({
      email: `user-${userCounter}-${crypto.randomUUID()}@example.com`,
      passwordHash: 'hashed',
      name: 'Test User',
    })
    .returning({ id: users.id })
  return user!.id
}

interface SeedSessionInput {
  userId: string
  expiresAt?: Date
  revokedAt?: Date | null
  lastSeenAt?: Date | null
}

async function seedSession(input: SeedSessionInput): Promise<string> {
  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash: crypto.randomUUID(),
      activeWorkspaceId: null,
      expiresAt: input.expiresAt ?? new Date(Date.now() + HOUR_MS),
      revokedAt: input.revokedAt ?? null,
      lastSeenAt: input.lastSeenAt ?? null,
    })
    .returning({ id: sessions.id })
  return session!.id
}

async function isRevoked(sessionId: string): Promise<boolean> {
  const [row] = await db
    .select({ revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
  return row?.revokedAt != null
}

describe('SessionRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['sessions', 'users'])
  })

  afterAll(async () => {
    await closeDb()
  })

  describe('listActiveForUser', () => {
    it('excludes revoked and expired sessions', async () => {
      const userId = await seedUser()
      const active = await seedSession({ userId })
      await seedSession({ userId, revokedAt: new Date() })
      await seedSession({ userId, expiresAt: new Date(Date.now() - HOUR_MS) })

      const result = await repo.listActiveForUser(userId)

      expect(result.map((s) => s.id)).toEqual([active])
    })

    it('orders by last-seen (falling back to created) most recent first', async () => {
      const userId = await seedUser()
      const older = await seedSession({ userId, lastSeenAt: new Date(Date.now() - HOUR_MS) })
      const newer = await seedSession({ userId, lastSeenAt: new Date() })

      const result = await repo.listActiveForUser(userId)

      expect(result.map((s) => s.id)).toEqual([newer, older])
    })
  })

  describe('revokeForUser', () => {
    it('does not revoke a session owned by another user', async () => {
      const owner = await seedUser()
      const intruder = await seedUser()
      const sessionId = await seedSession({ userId: owner })

      const affected = await repo.revokeForUser(intruder, sessionId)

      expect(affected).toBe(0)
      expect(await isRevoked(sessionId)).toBe(false)
    })

    it('revokes the user own active session', async () => {
      const userId = await seedUser()
      const sessionId = await seedSession({ userId })

      const affected = await repo.revokeForUser(userId, sessionId)

      expect(affected).toBe(1)
      expect(await isRevoked(sessionId)).toBe(true)
    })
  })

  describe('revokeOthersForUser', () => {
    it('revokes every active session except the kept one', async () => {
      const userId = await seedUser()
      const keep = await seedSession({ userId })
      const other = await seedSession({ userId })

      await repo.revokeOthersForUser(userId, keep)

      expect(await isRevoked(keep)).toBe(false)
      expect(await isRevoked(other)).toBe(true)
    })

    it('leaves other users sessions untouched', async () => {
      const userId = await seedUser()
      const stranger = await seedUser()
      const current = await seedSession({ userId })
      const strangerSession = await seedSession({ userId: stranger })

      await repo.revokeOthersForUser(userId, current)

      expect(await isRevoked(strangerSession)).toBe(false)
    })
  })

  afterEach(async () => {
    await truncateAll(['sessions', 'users'])
  })
})
