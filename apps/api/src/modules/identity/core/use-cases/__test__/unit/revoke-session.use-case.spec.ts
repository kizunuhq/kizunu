import { SessionNotFoundException } from '@kizunu/api/modules/identity/core/errors/identity.errors'
import { RevokeSessionUseCase } from '@kizunu/api/modules/identity/core/use-cases/revoke-session.use-case'
import type { SessionRepository } from '@kizunu/api/modules/identity/persistence/session.repository'
import { describe, expect, it } from 'vite-plus/test'

function buildUseCase(affected: number): RevokeSessionUseCase {
  const sessions = {
    revokeForUser: async () => affected,
  } as unknown as SessionRepository

  return new RevokeSessionUseCase(sessions)
}

describe('RevokeSessionUseCase', () => {
  it('reports not found when the session is not the user own (zero rows affected)', async () => {
    const useCase = buildUseCase(0)

    const result = useCase.execute('user-1', 'session-x')

    await expect(result).rejects.toBeInstanceOf(SessionNotFoundException)
  })

  it('resolves when the user own session is revoked', async () => {
    const useCase = buildUseCase(1)

    await expect(useCase.execute('user-1', 'session-1')).resolves.toBeUndefined()
  })
})
