import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { memberships } from '@kizunu/api/db/schemas/memberships'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new UserRepository({ db } as unknown as DrizzleService)

interface Seed {
  workspaceId: string
  userId: string
  membershipId: string
  email: string
}

async function seedVerifiedActive(): Promise<Seed> {
  const email = `bdr-${crypto.randomUUID()}@acme.com`
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const [user] = await db
    .insert(users)
    .values({ email, name: 'BDR', emailVerifiedAt: new Date() })
    .returning({ id: users.id })
  const [membership] = await db
    .insert(memberships)
    .values({ workspaceId: workspace!.id, userId: user!.id, role: 'member', status: 'active' })
    .returning({ id: memberships.id })
  return {
    workspaceId: workspace!.id,
    userId: user!.id,
    membershipId: membership!.id,
    email,
  }
}

describe('UserRepository.findVerifiedActiveByEmail (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['memberships', 'users', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('returns userId + membershipId when verified, active, in the given workspace', async () => {
    const seed = await seedVerifiedActive()

    const found = await repository.findVerifiedActiveByEmail(seed.workspaceId, seed.email)

    expect(found).toEqual({ userId: seed.userId, membershipId: seed.membershipId })
  })

  it('returns undefined when no user has the email', async () => {
    const seed = await seedVerifiedActive()

    const found = await repository.findVerifiedActiveByEmail(seed.workspaceId, 'other@acme.com')

    expect(found).toBeUndefined()
  })

  it('returns undefined when the user exists but emailVerifiedAt is null', async () => {
    const seed = await seedVerifiedActive()
    await db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, seed.userId))

    const found = await repository.findVerifiedActiveByEmail(seed.workspaceId, seed.email)

    expect(found).toBeUndefined()
  })

  it('returns undefined when the membership is inactive', async () => {
    const seed = await seedVerifiedActive()
    await db
      .update(memberships)
      .set({ status: 'inactive' })
      .where(eq(memberships.id, seed.membershipId))

    const found = await repository.findVerifiedActiveByEmail(seed.workspaceId, seed.email)

    expect(found).toBeUndefined()
  })

  it('returns undefined when the user has no membership in this workspace', async () => {
    const seed = await seedVerifiedActive()
    const [otherWorkspace] = await db
      .insert(workspaces)
      .values({ name: 'Other', slug: `other-${crypto.randomUUID()}` })
      .returning({ id: workspaces.id })

    const found = await repository.findVerifiedActiveByEmail(otherWorkspace!.id, seed.email)

    expect(found).toBeUndefined()
  })
})
