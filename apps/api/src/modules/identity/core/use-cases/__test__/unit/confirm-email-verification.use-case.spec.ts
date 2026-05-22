import { InvalidVerificationTokenException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { ConfirmEmailVerificationUseCase } from '@kizunu/api/modules/identity/core/use-cases/confirm-email-verification.use-case'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type {
  VerificationTokenRecord,
  VerificationTokenRepository,
} from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import { describe, expect, it } from 'vite-plus/test'

interface Fakes {
  verifiedUserIds: string[]
  consumedIds: string[]
  useCase: ConfirmEmailVerificationUseCase
}

function buildFakes(record: VerificationTokenRecord | undefined): Fakes {
  const verifiedUserIds: string[] = []
  const consumedIds: string[] = []

  const users = {
    markEmailVerified: async (id: string) => {
      verifiedUserIds.push(id)
    },
  } as unknown as UserRepository

  const verificationTokens = {
    findActiveByHashedToken: async () => record,
    markConsumed: async (id: string) => {
      consumedIds.push(id)
    },
  } as unknown as VerificationTokenRepository

  return {
    verifiedUserIds,
    consumedIds,
    useCase: new ConfirmEmailVerificationUseCase(users, verificationTokens),
  }
}

function activeRecord(): VerificationTokenRecord {
  return {
    id: 'token-1',
    type: 'email_verification',
    userId: 'user-1',
    email: 'ada@example.com',
    workspaceId: null,
    hashedToken: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  }
}

describe('ConfirmEmailVerificationUseCase', () => {
  it('rejects an unknown or expired token', async () => {
    const fakes = buildFakes(undefined)

    const result = fakes.useCase.execute('bad')

    await expect(result).rejects.toBeInstanceOf(InvalidVerificationTokenException)
    expect(fakes.verifiedUserIds).toHaveLength(0)
  })

  it('marks the user verified on a valid token', async () => {
    const fakes = buildFakes(activeRecord())

    await fakes.useCase.execute('good')

    expect(fakes.verifiedUserIds).toEqual(['user-1'])
  })

  it('consumes the token so it cannot be reused', async () => {
    const fakes = buildFakes(activeRecord())

    await fakes.useCase.execute('good')

    expect(fakes.consumedIds).toEqual(['token-1'])
  })
})
