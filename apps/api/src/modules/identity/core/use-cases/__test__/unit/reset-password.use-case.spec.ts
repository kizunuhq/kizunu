import { InvalidResetTokenException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { ResetPasswordUseCase } from '@kizunu/api/modules/identity/core/use-cases/reset-password.use-case'
import type { SessionRepository } from '@kizunu/api/modules/identity/persistence/session.repository'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type {
  VerificationTokenRecord,
  VerificationTokenRepository,
} from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { describe, expect, it, vi } from 'vite-plus/test'

// `password.helper` wraps `Bun.password` (argon2id), unavailable in the node
// test runner and an external primitive, not business logic. Stub at the boundary.
vi.mock('@kizunu/api/modules/identity/core/crypto/password.helper', () => ({
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}))

interface Fakes {
  setHashCalls: Array<{ id: string; hash: string }>
  consumedIds: string[]
  revokedUserIds: string[]
  useCase: ResetPasswordUseCase
}

function buildFakes(record: VerificationTokenRecord | undefined): Fakes {
  const setHashCalls: Array<{ id: string; hash: string }> = []
  const consumedIds: string[] = []
  const revokedUserIds: string[] = []

  const users = {
    setPasswordHash: async (id: string, hash: string) => {
      setHashCalls.push({ id, hash })
    },
  } as unknown as UserRepository

  const sessions = {
    revokeAllForUser: async (userId: string) => {
      revokedUserIds.push(userId)
    },
  } as unknown as SessionRepository

  const verificationTokens = {
    findActiveByHashedToken: async () => record,
    markConsumed: async (id: string) => {
      consumedIds.push(id)
    },
  } as unknown as VerificationTokenRepository

  return {
    setHashCalls,
    consumedIds,
    revokedUserIds,
    useCase: new ResetPasswordUseCase(users, sessions, verificationTokens),
  }
}

function activeRecord(): VerificationTokenRecord {
  return {
    id: 'token-1',
    type: 'password_reset',
    userId: 'user-1',
    email: 'ada@example.com',
    workspaceId: null,
    hashedToken: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  }
}

describe('ResetPasswordUseCase', () => {
  it('rejects an unknown or expired token', async () => {
    const fakes = buildFakes(undefined)

    const result = fakes.useCase.execute({ token: 'bad', password: 'new-password' })

    await expect(result).rejects.toBeInstanceOf(InvalidResetTokenException)
    expect(fakes.setHashCalls).toHaveLength(0)
  })

  it('replaces the password hash on a valid token', async () => {
    const fakes = buildFakes(activeRecord())

    await fakes.useCase.execute({ token: 'good', password: 'new-password' })

    expect(fakes.setHashCalls).toEqual([{ id: 'user-1', hash: 'hashed:new-password' }])
  })

  it('consumes the token so it cannot be reused', async () => {
    const fakes = buildFakes(activeRecord())

    await fakes.useCase.execute({ token: 'good', password: 'new-password' })

    expect(fakes.consumedIds).toEqual(['token-1'])
  })

  it('revokes every session for the user so the reset logs them out everywhere', async () => {
    const fakes = buildFakes(activeRecord())

    await fakes.useCase.execute({ token: 'good', password: 'new-password' })

    expect(fakes.revokedUserIds).toEqual(['user-1'])
  })
})
