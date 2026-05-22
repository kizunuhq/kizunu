import { ChannelAccessNotFoundException } from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { SetPrimaryChannelUseCase } from '@kizunu/api/modules/channel/core/use-cases/set-primary-channel.use-case'
import type { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import { describe, expect, it } from 'vite-plus/test'

function buildUseCase(found: { accessId: string; pluginId: string } | undefined) {
  const primaryCalls: Array<{ userId: string; accessId: string; pluginId: string }> = []

  const access = {
    findForUser: async () => found,
    makePrimary: async (args: { userId: string; accessId: string; pluginId: string }) => {
      primaryCalls.push(args)
    },
  } as unknown as ChannelAccessRepository

  return { primaryCalls, useCase: new SetPrimaryChannelUseCase(access) }
}

const input = { userId: 'user-1', channelAccountId: 'acc-1' }

describe('SetPrimaryChannelUseCase', () => {
  it('rejects when the caller has no access to the account', async () => {
    const { useCase, primaryCalls } = buildUseCase(undefined)

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ChannelAccessNotFoundException)
    expect(primaryCalls).toHaveLength(0)
  })

  it('promotes the access using the plugin resolved from the existing grant', async () => {
    const { useCase, primaryCalls } = buildUseCase({ accessId: 'access-9', pluginId: 'fake' })

    await useCase.execute(input)

    expect(primaryCalls).toEqual([{ userId: 'user-1', accessId: 'access-9', pluginId: 'fake' }])
  })
})
