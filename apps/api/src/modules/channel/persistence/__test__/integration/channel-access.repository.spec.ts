import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { channelAccesses } from '@kizunu/api/db/schemas/channel-accesses'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new ChannelAccessRepository({ db } as unknown as DrizzleService)

async function seedUserAndWorkspace() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const [user] = await db
    .insert(users)
    .values({ email: `bdr-${crypto.randomUUID()}@example.com`, passwordHash: 'x', name: 'BDR' })
    .returning({ id: users.id })
  return { workspaceId: workspace!.id, userId: user!.id }
}

async function seedAccount(workspaceId: string, pluginId: string) {
  const [account] = await db
    .insert(channelAccounts)
    .values({ workspaceId, pluginId, name: `${pluginId}-account`, credentials: {} })
    .returning({ id: channelAccounts.id })
  return account!.id
}

describe('ChannelAccessRepository (integration)', () => {
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

  it('grants access idempotently for the same account and user', async () => {
    const { workspaceId, userId } = await seedUserAndWorkspace()
    const accountId = await seedAccount(workspaceId, 'fake')

    await repository.grant(accountId, userId)
    await repository.grant(accountId, userId)

    const rows = await db
      .select({ id: channelAccesses.id })
      .from(channelAccesses)
      .where(eq(channelAccesses.userId, userId))
    expect(rows).toHaveLength(1)
  })

  it('keeps at most one primary per user per plugin', async () => {
    const { workspaceId, userId } = await seedUserAndWorkspace()
    const fakeA = await seedAccount(workspaceId, 'fake')
    const fakeB = await seedAccount(workspaceId, 'fake')
    await repository.grant(fakeA, userId)
    await repository.grant(fakeB, userId)

    const accessA = await repository.findForUser(fakeA, userId)
    const accessB = await repository.findForUser(fakeB, userId)
    await repository.makePrimary({ userId, accessId: accessA!.accessId, pluginId: 'fake' })
    await repository.makePrimary({ userId, accessId: accessB!.accessId, pluginId: 'fake' })

    const channels = await repository.listByUser(userId)
    const primary = channels.filter((channel) => channel.isPrimary)
    expect(primary).toHaveLength(1)
    expect(primary[0]?.channelAccountId).toBe(fakeB)
  })

  it('does not clear the primary of a different plugin when promoting one plugin', async () => {
    const { workspaceId, userId } = await seedUserAndWorkspace()
    const fake = await seedAccount(workspaceId, 'fake')
    const other = await seedAccount(workspaceId, 'other')
    await repository.grant(fake, userId)
    await repository.grant(other, userId)
    const fakeAccess = await repository.findForUser(fake, userId)
    const otherAccess = await repository.findForUser(other, userId)

    await repository.makePrimary({ userId, accessId: fakeAccess!.accessId, pluginId: 'fake' })
    await repository.makePrimary({ userId, accessId: otherAccess!.accessId, pluginId: 'other' })

    expect(await repository.findPrimaryAccount(userId, 'fake')).toEqual({ channelAccountId: fake })
    expect(await repository.findPrimaryAccount(userId, 'other')).toEqual({
      channelAccountId: other,
    })
  })

  it('returns no primary account when the user has none for the plugin', async () => {
    const { workspaceId, userId } = await seedUserAndWorkspace()
    const fake = await seedAccount(workspaceId, 'fake')
    await repository.grant(fake, userId)

    expect(await repository.findPrimaryAccount(userId, 'fake')).toBeUndefined()
  })
})
