import type { Workspace } from '@kizunu/api/db/schemas/workspaces'
import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import {
  AlreadyMemberException,
  InvitationEmailMismatchException,
  InvitationTokenInvalidException,
  WorkspaceNotFoundException,
} from '@kizunu/api/modules/workspace/core/errors/workspace.errors'
import { AcceptInvitationUseCase } from '@kizunu/api/modules/workspace/core/use-cases/accept-invitation.use-case'
import type {
  VerificationTokenRecord,
  VerificationTokenRepository,
} from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import type { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import type { WorkspaceRepository } from '@kizunu/api/modules/workspace/persistence/workspace.repository'
import { hashOpaqueToken } from '@kizunu/api/shared/crypto/opaque-token.helper'
import { describe, expect, it } from 'vite-plus/test'

const RAW_TOKEN = 'raw-invitation-token'
const CURRENT_USER = { id: 'user-1', email: 'invitee@example.com' }

const WORKSPACE: Workspace = {
  id: 'ws-1',
  name: 'Acme',
  slug: 'acme',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

function createTokenRecord(
  overrides: Partial<VerificationTokenRecord> = {},
): VerificationTokenRecord {
  return {
    id: 'token-1',
    type: VerificationTokenType.Invitation,
    userId: null,
    email: 'invitee@example.com',
    workspaceId: 'ws-1',
    hashedToken: hashOpaqueToken(RAW_TOKEN),
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    consumedAt: null,
    ...overrides,
  }
}

interface Existing {
  id: string
  status: 'active' | 'inactive'
}

function buildFakes(options: {
  record: VerificationTokenRecord | undefined
  existing?: Existing
  workspace?: Workspace | undefined
}) {
  const calls = {
    consumed: [] as string[],
    created: [] as Array<{ workspaceId: string; userId: string; role: string }>,
    reactivated: [] as string[],
  }

  const verificationTokens = {
    findActiveByHashedToken: async () => options.record,
    markConsumed: async (id: string) => {
      calls.consumed.push(id)
    },
  } as unknown as VerificationTokenRepository

  const members = {
    findExistingMembership: async () => options.existing,
    reactivate: async (id: string) => {
      calls.reactivated.push(id)
    },
    create: async (input: { workspaceId: string; userId: string; role: 'admin' | 'member' }) => {
      calls.created.push(input)
      return { id: 'membership-1' }
    },
  } as unknown as WorkspaceMemberRepository

  const workspaces = {
    findById: async () => ('workspace' in options ? options.workspace : WORKSPACE),
  } as unknown as WorkspaceRepository

  return { calls, useCase: new AcceptInvitationUseCase(verificationTokens, members, workspaces) }
}

const input = { token: RAW_TOKEN, currentUser: CURRENT_USER }

describe('AcceptInvitationUseCase', () => {
  describe('token validation', () => {
    it('rejects an unknown or expired invitation token', async () => {
      const { useCase } = buildFakes({ record: undefined })

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvitationTokenInvalidException)
    })

    it('rejects a token that carries no workspace', async () => {
      const { useCase } = buildFakes({ record: createTokenRecord({ workspaceId: null }) })

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvitationTokenInvalidException)
    })
  })

  describe('email matching', () => {
    it('rejects an invitation addressed to a different email', async () => {
      const { useCase } = buildFakes({
        record: createTokenRecord({ email: 'someone-else@example.com' }),
      })

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(InvitationEmailMismatchException)
    })

    it('accepts when the addressed email differs only in case', async () => {
      const { useCase } = buildFakes({
        record: createTokenRecord({ email: 'Invitee@Example.com' }),
      })

      const result = await useCase.execute(input)

      expect(result.workspaceId).toBe('ws-1')
    })

    it('accepts an open invitation with no addressed email', async () => {
      const { useCase, calls } = buildFakes({ record: createTokenRecord({ email: null }) })

      await useCase.execute(input)

      expect(calls.created).toHaveLength(1)
    })
  })

  describe('membership handling', () => {
    it('rejects when the user is already an active member', async () => {
      const { useCase } = buildFakes({
        record: createTokenRecord(),
        existing: { id: 'membership-1', status: 'active' },
      })

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(AlreadyMemberException)
    })

    it('reactivates an inactive membership instead of creating a new one', async () => {
      const { useCase, calls } = buildFakes({
        record: createTokenRecord(),
        existing: { id: 'membership-9', status: 'inactive' },
      })

      await useCase.execute(input)

      expect(calls.reactivated).toEqual(['membership-9'])
      expect(calls.created).toHaveLength(0)
    })

    it('creates a member-role membership when none exists', async () => {
      const { useCase, calls } = buildFakes({ record: createTokenRecord() })

      await useCase.execute(input)

      expect(calls.created).toEqual([{ workspaceId: 'ws-1', userId: 'user-1', role: 'member' }])
    })
  })

  describe('completion', () => {
    it('consumes the token after a successful accept', async () => {
      const { useCase, calls } = buildFakes({ record: createTokenRecord() })

      await useCase.execute(input)

      expect(calls.consumed).toEqual(['token-1'])
    })

    it('fails when the workspace no longer exists', async () => {
      const { useCase } = buildFakes({ record: createTokenRecord(), workspace: undefined })

      await expect(useCase.execute(input)).rejects.toBeInstanceOf(WorkspaceNotFoundException)
    })

    it('returns the joined workspace with the member role', async () => {
      const { useCase } = buildFakes({ record: createTokenRecord() })

      const result = await useCase.execute(input)

      expect(result).toEqual({
        workspaceId: 'ws-1',
        workspaceName: 'Acme',
        workspaceSlug: 'acme',
        role: 'member',
      })
    })
  })
})
