import { MembershipNotFoundException } from '@kizunu/api/modules/workspace/core/errors/workspace.errors'
import { UpdateMemberStatusUseCase } from '@kizunu/api/modules/workspace/core/use-cases/update-member-status.use-case'
import type {
  WorkspaceMemberRepository,
  WorkspaceMemberRow,
} from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { describe, expect, it } from 'vite-plus/test'

const MEMBER: WorkspaceMemberRow = {
  membershipId: 'membership-1',
  userId: 'user-1',
  userEmail: 'ada@example.com',
  userName: 'Ada Lovelace',
  role: 'member',
  status: 'active',
  joinedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function buildFakes(member: WorkspaceMemberRow | undefined) {
  const statusCalls: Array<{ membershipId: string; status: 'active' | 'inactive' }> = []

  const members = {
    findById: async () => member,
    setStatus: async (membershipId: string, status: 'active' | 'inactive') => {
      statusCalls.push({ membershipId, status })
    },
  } as unknown as WorkspaceMemberRepository

  return { statusCalls, useCase: new UpdateMemberStatusUseCase(members) }
}

describe('UpdateMemberStatusUseCase', () => {
  it('fails when the membership does not exist', async () => {
    const { useCase, statusCalls } = buildFakes(undefined)

    const result = useCase.execute({
      workspaceId: 'ws-1',
      membershipId: 'missing',
      status: 'inactive',
    })

    await expect(result).rejects.toBeInstanceOf(MembershipNotFoundException)
    expect(statusCalls).toHaveLength(0)
  })

  it('updates the membership status and echoes the result', async () => {
    const { useCase, statusCalls } = buildFakes(MEMBER)

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      membershipId: 'membership-1',
      status: 'inactive',
    })

    expect(result).toEqual({ membershipId: 'membership-1', status: 'inactive' })
    expect(statusCalls).toEqual([{ membershipId: 'membership-1', status: 'inactive' }])
  })
})
