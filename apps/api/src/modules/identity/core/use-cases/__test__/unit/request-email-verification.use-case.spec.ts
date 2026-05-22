import type { Config } from '@kizunu/api/api.config'
import type { User } from '@kizunu/api/db/schemas/users'
import type { EmailMessage } from '@kizunu/api/modules/identity/core/mail/email-message'
import type { MailSender } from '@kizunu/api/modules/identity/core/mail/mail-sender'
import { RequestEmailVerificationUseCase } from '@kizunu/api/modules/identity/core/use-cases/request-email-verification.use-case'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import { VerificationTokenType } from '@kizunu/api/modules/workspace/core/domain/verification-token'
import type { VerificationTokenRepository } from '@kizunu/api/modules/workspace/persistence/verification-token.repository'
import type { ConfigService } from '@kizunu/config-module/config.service'
import { describe, expect, it } from 'vite-plus/test'

const APP_URL = 'https://app.kizunu.test'

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hashed:correct',
    name: 'Ada Lovelace',
    emailVerifiedAt: null,
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

interface CreatedToken {
  type: VerificationTokenType
  userId?: string | null
  email?: string | null
  hashedToken: string
  expiresAt: Date
}

interface Fakes {
  createdTokens: CreatedToken[]
  sentMail: EmailMessage[]
  useCase: RequestEmailVerificationUseCase
}

function buildFakes(user: User | undefined): Fakes {
  const createdTokens: CreatedToken[] = []
  const sentMail: EmailMessage[] = []

  const users = {
    findById: async (id: string) => (user && user.id === id ? user : undefined),
  } as unknown as UserRepository

  const verificationTokens = {
    create: async (input: CreatedToken) => {
      createdTokens.push(input)
      return { id: 'token-1' }
    },
  } as unknown as VerificationTokenRepository

  const mail = {
    send: async (message: EmailMessage) => {
      sentMail.push(message)
    },
  } as unknown as MailSender

  const config = {
    get: (key: string) => (key === 'appUrl' ? APP_URL : undefined),
  } as unknown as ConfigService<Config>

  return {
    createdTokens,
    sentMail,
    useCase: new RequestEmailVerificationUseCase(users, verificationTokens, mail, config),
  }
}

describe('RequestEmailVerificationUseCase', () => {
  it('mints an email-verification token for an unverified user', async () => {
    const fakes = buildFakes(createUser())

    await fakes.useCase.execute('user-1')

    expect(fakes.createdTokens).toHaveLength(1)
    expect(fakes.createdTokens[0]?.type).toBe(VerificationTokenType.EmailVerification)
    expect(fakes.createdTokens[0]?.userId).toBe('user-1')
  })

  it('emails the verify link out-of-band for an unverified user', async () => {
    const fakes = buildFakes(createUser())

    await fakes.useCase.execute('user-1')

    expect(fakes.sentMail).toHaveLength(1)
    expect(fakes.sentMail[0]?.to).toBe('ada@example.com')
    expect(fakes.sentMail[0]?.body).toContain(`${APP_URL}/verify-email?token=`)
  })

  it('is a no-op when the user is already verified', async () => {
    const fakes = buildFakes(createUser({ emailVerifiedAt: new Date() }))

    await fakes.useCase.execute('user-1')

    expect(fakes.createdTokens).toHaveLength(0)
    expect(fakes.sentMail).toHaveLength(0)
  })

  it('is a no-op when the user does not exist', async () => {
    const fakes = buildFakes(undefined)

    await fakes.useCase.execute('ghost')

    expect(fakes.createdTokens).toHaveLength(0)
    expect(fakes.sentMail).toHaveLength(0)
  })
})
