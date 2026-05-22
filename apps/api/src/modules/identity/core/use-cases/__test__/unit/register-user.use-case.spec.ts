import type { Config } from '@kizunu/api/api.config'
import { RegistrationDisabledException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import type { SessionIssuer } from '@kizunu/api/modules/identity/core/services/session-issuer'
import type { UserProvisioningService } from '@kizunu/api/modules/identity/core/services/user-provisioning.service'
import { RegisterUserUseCase } from '@kizunu/api/modules/identity/core/use-cases/register-user.use-case'
import type { RequestEmailVerificationUseCase } from '@kizunu/api/modules/identity/core/use-cases/request-email-verification.use-case'
import type { UserRepository } from '@kizunu/api/modules/identity/persistence/user.repository'
import type { ConfigService } from '@kizunu/config-module/config.service'
import { describe, expect, it } from 'vite-plus/test'

// The gate guards before any work: these collaborators throw if touched, proving
// the use case rejects without looking up, provisioning, or signing in a user.
function buildUseCase(registrationDisabled: boolean): RegisterUserUseCase {
  const users = {
    findByEmail: async () => {
      throw new Error('user lookup despite registration gate')
    },
  } as unknown as UserRepository

  const config = {
    get: (key: string) => (key === 'auth.registrationDisabled' ? registrationDisabled : undefined),
  } as unknown as ConfigService<Config>

  const provisioning = {
    provision: async () => {
      throw new Error('provisioning despite registration gate')
    },
  } as unknown as UserProvisioningService

  const sessionIssuer = {
    issue: async () => {
      throw new Error('session issued despite registration gate')
    },
  } as unknown as SessionIssuer

  const requestEmailVerification = {
    execute: async () => {},
  } as unknown as RequestEmailVerificationUseCase

  return new RegisterUserUseCase(
    users,
    config,
    provisioning,
    sessionIssuer,
    requestEmailVerification,
  )
}

const input = { email: 'bdr@example.com', password: 'follow-up-2026', name: 'BDR One' }

describe('RegisterUserUseCase registration gate', () => {
  it('rejects with the gate error and does no work when the gate is on', async () => {
    const useCase = buildUseCase(true)

    const result = useCase.execute(input)

    // Were the guard removed, a collaborator would throw its own error instead.
    await expect(result).rejects.toBeInstanceOf(RegistrationDisabledException)
  })
})
