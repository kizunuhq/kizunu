import type { Workspace } from '@kizunu/api/db/schemas/workspaces'
import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import { WorkspaceNotFoundException } from '@kizunu/api/modules/workspace/core/errors/workspace.errors'
import { InviteMemberUseCase } from '@kizunu/api/modules/workspace/core/use-cases/invite-member.use-case'
import type { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import type { WorkspaceRepository } from '@kizunu/api/modules/workspace/persistence/workspace.repository'
import { hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const NOW = new Date('2026-05-22T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

const WORKSPACE: Workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  createdAt: NOW,
  updatedAt: NOW,
}

type CreateInput = Parameters<VerificationTokenRepository['create']>[0]

function buildFakes(workspace: Workspace | undefined) {
  const created: CreateInput[] = []

  const workspaces = { findById: async () => workspace } as unknown as WorkspaceRepository
  const verificationTokens = {
    create: async (input: CreateInput) => {
      created.push(input)
      return { id: 'token-1' }
    },
  } as unknown as VerificationTokenRepository

  return { created, useCase: new InviteMemberUseCase(workspaces, verificationTokens) }
}

describe('InviteMemberUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fails when the workspace does not exist', async () => {
    const { useCase } = buildFakes(undefined)

    const result = useCase.execute({ workspaceId: 'missing', email: 'new@example.com' })

    await expect(result).rejects.toBeInstanceOf(WorkspaceNotFoundException)
  })

  it('stores the invited email in lowercase', async () => {
    const { useCase, created } = buildFakes(WORKSPACE)

    await useCase.execute({ workspaceId: 'ws-1', email: 'New.Person@Example.COM' })

    expect(created[0]?.email).toBe('new.person@example.com')
  })

  it('persists an invitation token whose hash matches the returned raw token', async () => {
    const { useCase, created } = buildFakes(WORKSPACE)

    const result = await useCase.execute({ workspaceId: 'ws-1', email: 'new@example.com' })

    expect(created[0]?.type).toBe(VerificationTokenType.Invitation)
    expect(created[0]?.workspaceId).toBe('ws-1')
    expect(created[0]?.hashedToken).toBe(hashOpaqueToken(result.invitationToken))
  })

  it('defaults the invitation to a 7-day expiry', async () => {
    const { useCase } = buildFakes(WORKSPACE)

    const result = await useCase.execute({ workspaceId: 'ws-1', email: 'new@example.com' })

    expect(result.expiresAt).toEqual(new Date(NOW.getTime() + 7 * DAY_MS))
  })

  it('honors a custom expiry window', async () => {
    const { useCase } = buildFakes(WORKSPACE)

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      email: 'new@example.com',
      expiresInDays: 2,
    })

    expect(result.expiresAt).toEqual(new Date(NOW.getTime() + 2 * DAY_MS))
  })
})
