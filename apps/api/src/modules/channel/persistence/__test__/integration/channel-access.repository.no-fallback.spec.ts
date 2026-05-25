import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { channelAccesses } from '@kizunu/api/db/schemas/channel-accesses'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new ChannelAccessRepository({ db } as unknown as DrizzleService)

async function seedUser(): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({
      email: `bdr-${crypto.randomUUID()}@example.com`,
      passwordHash: 'x',
      name: 'BDR',
    })
    .returning({ id: users.id })
  return user!.id
}

async function seedWorkspace(): Promise<string> {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return workspace!.id
}

async function seedAccount(workspaceId: string, pluginId: string): Promise<string> {
  const [account] = await db
    .insert(channelAccounts)
    .values({ workspaceId, pluginId, name: `${pluginId}-account`, credentials: {} })
    .returning({ id: channelAccounts.id })
  return account!.id
}

async function grantPrimary(channelAccountId: string, userId: string): Promise<void> {
  await db.insert(channelAccesses).values({ channelAccountId, userId, isPrimary: true })
}

describe('ChannelAccessRepository.findPrimaryAccount — no-fallback invariant', () => {
  beforeEach(async () => {
    await truncateAll([
      'channel_accesses',
      'channel_accounts',
      'memberships',
      'workspaces',
      'users',
    ])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('returns user A primary when both A and B have primaries on different accounts', async () => {
    const workspaceId = await seedWorkspace()
    const userA = await seedUser()
    const userB = await seedUser()
    const accountA = await seedAccount(workspaceId, 'meta-whatsapp')
    const accountB = await seedAccount(workspaceId, 'meta-whatsapp')
    await grantPrimary(accountA, userA)
    await grantPrimary(accountB, userB)

    const aResult = await repository.findPrimaryAccount(userA, 'meta-whatsapp')
    const bResult = await repository.findPrimaryAccount(userB, 'meta-whatsapp')

    expect(aResult).toEqual({ channelAccountId: accountA })
    expect(bResult).toEqual({ channelAccountId: accountB })
  })

  it('returns undefined for a user who has no primary even when another BDR in the workspace does', async () => {
    const workspaceId = await seedWorkspace()
    const userA = await seedUser()
    const userB = await seedUser()
    const accountB = await seedAccount(workspaceId, 'meta-whatsapp')
    await grantPrimary(accountB, userB)

    const aResult = await repository.findPrimaryAccount(userA, 'meta-whatsapp')

    expect(aResult).toBeUndefined()
  })
})
