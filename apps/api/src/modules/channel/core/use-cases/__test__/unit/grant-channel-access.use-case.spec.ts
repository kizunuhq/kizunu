import {
  ChannelAccountNotFoundException,
  UserNotInWorkspaceException,
} from '@kizunu/api/modules/channel/core/errors/channel.errors'
import { GrantChannelAccessUseCase } from '@kizunu/api/modules/channel/core/use-cases/grant-channel-access.use-case'
import type { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import type { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import type { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { describe, expect, it } from 'vite-plus/test'

interface Scenario {
  account?: { id: string; pluginId: string }
  membership?: { id: string; status: 'active' | 'inactive' }
}

function buildUseCase(scenario: Scenario) {
  const grantCalls: Array<{ channelAccountId: string; userId: string }> = []

  const accounts = {
    findByIdInWorkspace: async () => scenario.account,
  } as unknown as ChannelAccountRepository

  const access = {
    grant: async (channelAccountId: string, userId: string) => {
      grantCalls.push({ channelAccountId, userId })
    },
  } as unknown as ChannelAccessRepository

  const members = {
    findExistingMembership: async () => scenario.membership,
  } as unknown as WorkspaceMemberRepository

  return { grantCalls, useCase: new GrantChannelAccessUseCase(accounts, access, members) }
}

const input = { workspaceId: 'ws-1', channelAccountId: 'acc-1', userId: 'user-1' }

describe('GrantChannelAccessUseCase', () => {
  it('rejects when the account does not belong to the workspace', async () => {
    const { useCase, grantCalls } = buildUseCase({ account: undefined })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ChannelAccountNotFoundException)
    expect(grantCalls).toHaveLength(0)
  })

  it('rejects when the target user is not a member of the workspace', async () => {
    const { useCase, grantCalls } = buildUseCase({
      account: { id: 'acc-1', pluginId: 'fake' },
      membership: undefined,
    })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(UserNotInWorkspaceException)
    expect(grantCalls).toHaveLength(0)
  })

  it('grants access when the account and membership both check out', async () => {
    const { useCase, grantCalls } = buildUseCase({
      account: { id: 'acc-1', pluginId: 'fake' },
      membership: { id: 'membership-1', status: 'active' },
    })

    await useCase.execute(input)

    expect(grantCalls).toEqual([{ channelAccountId: 'acc-1', userId: 'user-1' }])
  })
})
