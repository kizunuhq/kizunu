import type { User } from '@kizunu/api/db/schemas/users'
import type { MemberConnectorIdentityRepository } from '@kizunu/api/modules/crm/persistence/member-connector-identity.repository'
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

function buildUseCase(
  user: User | undefined,
  memberships: MembershipWithWorkspace[],
  identities: Array<{ connectorAccountId: string; connectorId: string; externalId: string }> = [],
) {
  const users = { findById: async () => user } as unknown as UserRepository
  const membershipRepo = {
    listForUser: async () => memberships,
  } as unknown as MembershipRepository
  const identityRepo = {
    listForUser: async () => identities,
  } as unknown as MemberConnectorIdentityRepository
  return new GetMeUseCase(users, membershipRepo, identityRepo)
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
      connectorIdentities: [],
      activeWorkspaceId: 'ws-1',
    })
  })

  it('includes the user connector identities in the response', async () => {
    const useCase = buildUseCase(
      createUser(),
      [MEMBERSHIP],
      [{ connectorAccountId: 'acc-1', connectorId: 'pipedrive', externalId: '42' }],
    )

    const result = await useCase.execute('user-1', 'ws-1')

    expect(result.connectorIdentities).toEqual([
      { connectorAccountId: 'acc-1', connectorId: 'pipedrive', externalId: '42' },
    ])
  })

  it('passes through a null active workspace', async () => {
    const useCase = buildUseCase(createUser(), [])

    const result = await useCase.execute('user-1', null)

    expect(result.activeWorkspaceId).toBeNull()
    expect(result.memberships).toEqual([])
  })
})
