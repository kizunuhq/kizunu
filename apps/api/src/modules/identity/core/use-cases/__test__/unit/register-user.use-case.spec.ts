import type { Config } from '@kizunu/api/api.config'
import { RegistrationDisabledException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { RegisterUserUseCase } from '@kizunu/api/modules/identity/core/use-cases/register-user.use-case'
import type { RequestEmailVerificationUseCase } from '@kizunu/api/modules/identity/core/use-cases/request-email-verification.use-case'
import type { ConfigService } from '@kizunu/config-module/config.service'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { describe, expect, it } from 'vite-plus/test'

// The gate guards before any persistence: this `db` getter throws if touched,
// proving the use case rejects without creating a user, workspace, or session.
function buildUseCase(registrationDisabled: boolean): RegisterUserUseCase {
  const drizzle = {
    get db(): never {
      throw new Error('database accessed despite registration gate')
    },
  } as unknown as DrizzleService

  const config = {
    get: (key: string) => (key === 'auth.registrationDisabled' ? registrationDisabled : undefined),
  } as unknown as ConfigService<Config>

  // Verification fires only after a committed registration; the gate rejects
  // first, so a no-op stand-in is enough here.
  const requestEmailVerification = {
    execute: async () => {},
  } as unknown as RequestEmailVerificationUseCase

  return new RegisterUserUseCase(drizzle, config, requestEmailVerification)
}

const input = { email: 'bdr@example.com', password: 'follow-up-2026', name: 'BDR One' }

describe('RegisterUserUseCase registration gate', () => {
  it('rejects with the gate error and never touches the database when the gate is on', async () => {
    const useCase = buildUseCase(true)

    const result = useCase.execute(input)

    // Were the guard removed, the throwing `db` getter would surface a
    // "database accessed" error instead of this one, failing the test.
    await expect(result).rejects.toBeInstanceOf(RegistrationDisabledException)
  })
})
