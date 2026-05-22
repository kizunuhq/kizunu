import { ChannelAccountNotFoundException } from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { RevokeChannelAccessUseCase } from '@kizunu/api/modules/channel/core/use-cases/revoke-channel-access.use-case'
import type { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import type { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { describe, expect, it } from 'vite-plus/test'

function buildUseCase(account: { id: string; pluginId: string } | undefined) {
  const revokeCalls: Array<{ channelAccountId: string; userId: string }> = []

  const accounts = {
    findByIdInWorkspace: async () => account,
  } as unknown as ChannelAccountRepository

  const access = {
    revoke: async (channelAccountId: string, userId: string) => {
      revokeCalls.push({ channelAccountId, userId })
    },
  } as unknown as ChannelAccessRepository

  return { revokeCalls, useCase: new RevokeChannelAccessUseCase(accounts, access) }
}

const input = { workspaceId: 'ws-1', channelAccountId: 'acc-1', userId: 'user-1' }

describe('RevokeChannelAccessUseCase', () => {
  it('rejects when the account does not belong to the workspace', async () => {
    const { useCase, revokeCalls } = buildUseCase(undefined)

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ChannelAccountNotFoundException)
    expect(revokeCalls).toHaveLength(0)
  })

  it('revokes access when the account belongs to the workspace', async () => {
    const { useCase, revokeCalls } = buildUseCase({ id: 'acc-1', pluginId: 'fake' })

    await useCase.execute(input)

    expect(revokeCalls).toEqual([{ channelAccountId: 'acc-1', userId: 'user-1' }])
  })
})
