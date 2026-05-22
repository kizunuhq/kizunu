import type { Config } from '@kizunu/api/api.config'
import type { User } from '@kizunu/api/db/schemas/users'
import {
  OAuthEmailUnverifiedException,
  RegistrationDisabledException,
} from '@kizunu/api/modules/identity/core/errors/identity.errors'
import type { OAuthProfile } from '@kizunu/api/modules/identity/core/oauth/oauth-profile'
import type { SessionIssuer } from '@kizunu/api/modules/identity/core/services/session-issuer'
import type { UserProvisioningService } from '@kizunu/api/modules/identity/core/services/user-provisioning.service'
import { HandleOAuthCallbackUseCase } from '@kizunu/api/modules/identity/core/use-cases/handle-oauth-callback.use-case'
import type { IdentityRepository } from '@kizunu/api/modules/identity/persistence/identity.repository'
import type { MembershipRepository } from '@kizunu/api/modules/identity/persistence/membership.repository'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type { ConfigService } from '@kizunu/config-module/config.service'
import { describe, expect, it } from 'vite-plus/test'

interface IdentityCreate {
  userId: string
  provider: string
  providerAccountId: string
}

interface Options {
  identity?: { id: string; userId: string }
  userByEmail?: User
  registrationDisabled?: boolean
}

interface Fakes {
  identityCreates: IdentityCreate[]
  provisionCount: number
  issuedUserIds: string[]
  useCase: HandleOAuthCallbackUseCase
}

function buildFakes(options: Options = {}): Fakes {
  const identityCreates: IdentityCreate[] = []
  const issuedUserIds: string[] = []
  const counters = { provision: 0 }

  const identities = {
    findByProviderAccount: async () => options.identity,
    create: async (input: IdentityCreate) => {
      identityCreates.push(input)
      return { id: 'identity-1', ...input }
    },
  } as unknown as IdentityRepository

  const users = {
    findByEmail: async (email: string) =>
      options.userByEmail && options.userByEmail.email === email ? options.userByEmail : undefined,
  } as unknown as UserRepository

  const memberships = {
    listForUser: async () => [],
  } as unknown as MembershipRepository

  const provisioning = {
    provision: async (input: { email: string; name: string }) => {
      counters.provision += 1
      return {
        user: { id: 'new-user', email: input.email, name: input.name },
        workspace: { id: 'ws-1', name: 'Ada Workspace', slug: 'ada-1' },
      }
    },
  } as unknown as UserProvisioningService

  const sessionIssuer = {
    issue: async (input: { userId: string }) => {
      issuedUserIds.push(input.userId)
      return { sessionToken: 'session-token', expiresAt: new Date('2026-06-21T00:00:00.000Z') }
    },
  } as unknown as SessionIssuer

  const config = {
    get: (key: string) =>
      key === 'auth.registrationDisabled' ? (options.registrationDisabled ?? false) : undefined,
  } as unknown as ConfigService<Config>

  return {
    identityCreates,
    get provisionCount() {
      return counters.provision
    },
    issuedUserIds,
    useCase: new HandleOAuthCallbackUseCase(
      identities,
      users,
      memberships,
      provisioning,
      sessionIssuer,
      config,
    ),
  }
}

function profile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    providerAccountId: 'gh-1',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada',
    ...overrides,
  }
}

function existingUser(): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hashed',
    name: 'Ada',
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('HandleOAuthCallbackUseCase', () => {
  it('signs in the linked user without creating an identity when one already exists', async () => {
    const fakes = buildFakes({ identity: { id: 'identity-1', userId: 'user-1' } })

    await fakes.useCase.execute({ provider: 'github', profile: profile() })

    expect(fakes.issuedUserIds).toEqual(['user-1'])
    expect(fakes.identityCreates).toHaveLength(0)
  })

  it('rejects when the provider email is not verified', async () => {
    const fakes = buildFakes()

    const result = fakes.useCase.execute({
      provider: 'github',
      profile: profile({ emailVerified: false }),
    })

    await expect(result).rejects.toBeInstanceOf(OAuthEmailUnverifiedException)
  })

  it('links a verified email to an existing user and signs them in', async () => {
    const fakes = buildFakes({ userByEmail: existingUser() })

    await fakes.useCase.execute({ provider: 'github', profile: profile() })

    expect(fakes.identityCreates).toEqual([
      { userId: 'user-1', provider: 'github', providerAccountId: 'gh-1' },
    ])
    expect(fakes.issuedUserIds).toEqual(['user-1'])
  })

  it('provisions a new user when no identity and no email match exist', async () => {
    const fakes = buildFakes()

    await fakes.useCase.execute({ provider: 'github', profile: profile() })

    expect(fakes.provisionCount).toBe(1)
    expect(fakes.identityCreates).toHaveLength(1)
    expect(fakes.issuedUserIds).toEqual(['new-user'])
  })

  it('refuses to provision a new user when registration is disabled', async () => {
    const fakes = buildFakes({ registrationDisabled: true })

    const result = fakes.useCase.execute({ provider: 'github', profile: profile() })

    await expect(result).rejects.toBeInstanceOf(RegistrationDisabledException)
    expect(fakes.provisionCount).toBe(0)
  })
})
