import { WorkspaceMembershipRequiredException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { SwitchActiveWorkspaceUseCase } from '@kizunu/api/modules/identity/core/use-cases/switch-active-workspace.use-case'
import type {
  MembershipRepository,
  MembershipWithWorkspace,
} from '@kizunu/api/modules/identity/persistence/membership.repository'
import type { SessionRepository } from '@kizunu/api/modules/identity/persistence/session.repository'
import { describe, expect, it } from 'vite-plus/test'

const ACTIVE_MEMBERSHIP: MembershipWithWorkspace = {
  workspaceId: 'ws-1',
  workspaceName: 'Acme',
  workspaceSlug: 'acme',
  role: 'member',
  status: 'active',
}

function buildFakes(membership: MembershipWithWorkspace | undefined) {
  const updateCalls: Array<{ sessionId: string; workspaceId: string }> = []

  const memberships = {
    findActiveByUserAndWorkspace: async () => membership,
  } as unknown as MembershipRepository

  const sessions = {
    updateActiveWorkspace: async (sessionId: string, workspaceId: string) => {
      updateCalls.push({ sessionId, workspaceId })
    },
  } as unknown as SessionRepository

  return { updateCalls, useCase: new SwitchActiveWorkspaceUseCase(sessions, memberships) }
}

const input = { sessionId: 'session-1', userId: 'user-1', workspaceId: 'ws-1' }

describe('SwitchActiveWorkspaceUseCase', () => {
  it('rejects switching to a workspace the user is not an active member of', async () => {
    const { useCase } = buildFakes(undefined)

    const result = useCase.execute(input)

    await expect(result).rejects.toBeInstanceOf(WorkspaceMembershipRequiredException)
  })

  it('does not touch the session when membership is missing', async () => {
    const { useCase, updateCalls } = buildFakes(undefined)

    await useCase.execute(input).catch(() => undefined)

    expect(updateCalls).toHaveLength(0)
  })

  it('updates the session and returns the new active workspace on success', async () => {
    const { useCase, updateCalls } = buildFakes(ACTIVE_MEMBERSHIP)

    const result = await useCase.execute(input)

    expect(result).toEqual({ activeWorkspaceId: 'ws-1' })
    expect(updateCalls).toEqual([{ sessionId: 'session-1', workspaceId: 'ws-1' }])
  })
})
