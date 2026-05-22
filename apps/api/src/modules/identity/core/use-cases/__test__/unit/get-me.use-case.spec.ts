import type { User } from '@kizunu/api/db/schemas/users'
import { SessionExpiredException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { GetMeUseCase } from '@kizunu/api/modules/identity/core/use-cases/get-me.use-case'
import type {
  MembershipRepository,
  MembershipWithWorkspace,
} from '@kizunu/api/modules/identity/persistence/membership.repository'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import { describe, expect, it } from 'vite-plus/test'

const VERIFIED_AT = new Date('2026-01-01T00:00:00.000Z')

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hash',
    name: 'Ada Lovelace',
    emailVerifiedAt: VERIFIED_AT,
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: VERIFIED_AT,
    updatedAt: VERIFIED_AT,
    ...overrides,
  }
}

const MEMBERSHIP: MembershipWithWorkspace = {
  workspaceId: 'ws-1',
  workspaceName: 'Acme',
  workspaceSlug: 'acme',
  role: 'admin',
  status: 'active',
}

function buildUseCase(user: User | undefined, memberships: MembershipWithWorkspace[]) {
  const users = { findById: async () => user } as unknown as UserRepository
  const membershipRepo = {
    listForUser: async () => memberships,
  } as unknown as MembershipRepository
  return new GetMeUseCase(users, membershipRepo)
}

describe('GetMeUseCase', () => {
  it('treats a missing user as an expired session', async () => {
    const useCase = buildUseCase(undefined, [])

    const result = useCase.execute('user-1', null)

    await expect(result).rejects.toBeInstanceOf(SessionExpiredException)
  })

  it('returns the user profile, memberships, and active workspace', async () => {
    const useCase = buildUseCase(createUser(), [MEMBERSHIP])

    const result = await useCase.execute('user-1', 'ws-1')

    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        emailVerifiedAt: VERIFIED_AT,
      },
      memberships: [MEMBERSHIP],
      activeWorkspaceId: 'ws-1',
    })
  })

  it('passes through a null active workspace', async () => {
    const useCase = buildUseCase(createUser(), [])

    const result = await useCase.execute('user-1', null)

    expect(result.activeWorkspaceId).toBeNull()
    expect(result.memberships).toEqual([])
  })
})
