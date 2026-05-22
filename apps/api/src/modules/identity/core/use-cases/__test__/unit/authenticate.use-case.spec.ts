import type { User } from '@kizunu/api/db/schemas/users'
import {
  AccountLockedException,
  InvalidCredentialsException,
} from '@kizunu/api/modules/identity/core/errors/identity.errors'
import type {
  IssueSessionInput,
  SessionIssuer,
} from '@kizunu/api/modules/identity/core/services/session-issuer'
import { AuthenticateUseCase } from '@kizunu/api/modules/identity/core/use-cases/authenticate.use-case'
import type { MembershipRepository } from '@kizunu/api/modules/identity/persistence/membership.repository'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

// `password.helper` wraps `Bun.password` (argon2id), which is unavailable in the
// node-based test runner and is an external primitive, not business logic. We
// stub it at the boundary so a stored hash of `hashed:<plain>` verifies only
// against its matching plaintext.
vi.mock('@kizunu/api/modules/identity/core/crypto/password.helper', () => ({
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}))

const NOW = new Date('2026-05-22T12:00:00.000Z')
const ISSUED_EXPIRES = new Date('2026-06-21T12:00:00.000Z')
const LOCK_DURATION_MS = 15 * 60 * 1000

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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

interface Fakes {
  user: User | undefined
  issuedFor: IssueSessionInput[]
  lockCalls: Array<{ id: string; until: Date }>
  resetCalls: string[]
  users: UserRepository
  memberships: MembershipRepository
  sessionIssuer: SessionIssuer
}

function buildFakes(user: User | undefined, activeWorkspaceId: string | null): Fakes {
  const state: Pick<Fakes, 'user' | 'issuedFor' | 'lockCalls' | 'resetCalls'> = {
    user,
    issuedFor: [],
    lockCalls: [],
    resetCalls: [],
  }

  const users = {
    findByEmail: async (email: string) =>
      state.user && state.user.email === email ? state.user : undefined,
    incrementFailedAttempts: async (id: string) => {
      if (state.user && state.user.id === id) state.user.failedAttempts += 1
      return state.user?.failedAttempts ?? 0
    },
    lockUntil: async (id: string, until: Date) => {
      state.lockCalls.push({ id, until })
    },
    resetFailedAttemptsAndTouchLastLogin: async (id: string) => {
      state.resetCalls.push(id)
    },
  } as unknown as UserRepository

  const memberships = {
    listForUser: async () =>
      activeWorkspaceId
        ? [
            {
              workspaceId: 'other-ws',
              workspaceName: 'Other',
              workspaceSlug: 'other',
              role: 'member' as const,
              status: 'inactive' as const,
            },
            {
              workspaceId: activeWorkspaceId,
              workspaceName: 'Active',
              workspaceSlug: 'active',
              role: 'admin' as const,
              status: 'active' as const,
            },
          ]
        : [],
  } as unknown as MembershipRepository

  const sessionIssuer = {
    issue: async (input: IssueSessionInput) => {
      state.issuedFor.push(input)
      return { sessionToken: 'session-token', expiresAt: ISSUED_EXPIRES }
    },
  } as unknown as SessionIssuer

  return { ...state, users, memberships, sessionIssuer }
}

function createUseCase(fakes: Fakes): AuthenticateUseCase {
  return new AuthenticateUseCase(fakes.users, fakes.memberships, fakes.sessionIssuer)
}

describe('AuthenticateUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('credential validation', () => {
    it('rejects an unknown email with a generic invalid-credentials error', async () => {
      const fakes = buildFakes(undefined, null)

      const result = createUseCase(fakes).execute({ email: 'ghost@example.com', password: 'x' })

      await expect(result).rejects.toBeInstanceOf(InvalidCredentialsException)
    })

    it('rejects a wrong password with a generic invalid-credentials error', async () => {
      const fakes = buildFakes(createUser(), null)

      const result = createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'wrong',
      })

      await expect(result).rejects.toBeInstanceOf(InvalidCredentialsException)
    })

    it('rejects an OAuth-only account (null password hash) on password login', async () => {
      const fakes = buildFakes(createUser({ passwordHash: null }), null)

      const result = createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      await expect(result).rejects.toBeInstanceOf(InvalidCredentialsException)
      expect(fakes.issuedFor).toHaveLength(0)
    })

    it('does not issue a session when authentication fails', async () => {
      const fakes = buildFakes(createUser(), null)

      await createUseCase(fakes)
        .execute({ email: 'ada@example.com', password: 'wrong' })
        .catch(() => undefined)

      expect(fakes.issuedFor).toHaveLength(0)
    })
  })

  describe('account locking', () => {
    it('increments the failed-attempt counter on a wrong password', async () => {
      const user = createUser({ failedAttempts: 1 })
      const fakes = buildFakes(user, null)

      await createUseCase(fakes)
        .execute({ email: 'ada@example.com', password: 'wrong' })
        .catch(() => undefined)

      expect(user.failedAttempts).toBe(2)
    })

    it('locks the account for 15 minutes on the 5th consecutive failed attempt', async () => {
      const fakes = buildFakes(createUser({ failedAttempts: 4 }), null)

      await createUseCase(fakes)
        .execute({ email: 'ada@example.com', password: 'wrong' })
        .catch(() => undefined)

      expect(fakes.lockCalls).toHaveLength(1)
      expect(fakes.lockCalls[0]?.until).toEqual(new Date(NOW.getTime() + LOCK_DURATION_MS))
    })

    it('does not lock the account before the 5th failed attempt', async () => {
      const fakes = buildFakes(createUser({ failedAttempts: 3 }), null)

      await createUseCase(fakes)
        .execute({ email: 'ada@example.com', password: 'wrong' })
        .catch(() => undefined)

      expect(fakes.lockCalls).toHaveLength(0)
    })

    it('rejects a locked account even when the password is correct', async () => {
      const lockedUntil = new Date(NOW.getTime() + LOCK_DURATION_MS)
      const fakes = buildFakes(createUser({ lockedUntil }), null)

      const result = createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      await expect(result).rejects.toBeInstanceOf(AccountLockedException)
    })

    it('allows login once the lock has expired', async () => {
      const lockedUntil = new Date(NOW.getTime() - 1000)
      const fakes = buildFakes(createUser({ lockedUntil }), null)

      const result = await createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      expect(result.sessionToken).toBe('session-token')
    })
  })

  describe('successful authentication', () => {
    it('resets the failed-attempt counter and touches last login', async () => {
      const fakes = buildFakes(createUser({ failedAttempts: 3 }), null)

      await createUseCase(fakes).execute({ email: 'ada@example.com', password: 'correct' })

      expect(fakes.resetCalls).toEqual(['user-1'])
    })

    it('selects the active membership as the active workspace', async () => {
      const fakes = buildFakes(createUser(), 'ws-active')

      const result = await createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      expect(result.activeWorkspaceId).toBe('ws-active')
    })

    it('returns a null active workspace when there is no active membership', async () => {
      const fakes = buildFakes(createUser(), null)

      const result = await createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      expect(result.activeWorkspaceId).toBeNull()
    })

    it('issues a session for the resolved active workspace', async () => {
      const fakes = buildFakes(createUser(), 'ws-active')

      const result = await createUseCase(fakes).execute({
        email: 'ada@example.com',
        password: 'correct',
      })

      expect(result.user).toEqual({ id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' })
      expect(result.expiresAt).toEqual(ISSUED_EXPIRES)
      expect(fakes.issuedFor).toHaveLength(1)
      expect(fakes.issuedFor[0]?.activeWorkspaceId).toBe('ws-active')
    })
  })
})
