import { CadenceNotFoundException } from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import { GetCadenceUseCase } from '@kizunu/api/modules/cadence/core/use-cases/get-cadence.use-case'
import type {
  CadenceRepository,
  CadenceWithSteps,
} from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { describe, expect, it } from 'vite-plus/test'

const cadence: CadenceWithSteps = {
  id: 'cadence-1',
  name: 'Follow-up',
  status: 'active',
  stopOnReply: true,
  onReply: [],
  onExhausted: [],
  onComplete: [],
  sendingWindow: null,
  steps: [],
}

function buildUseCase(found: CadenceWithSteps | undefined) {
  const cadences = { getWithSteps: async () => found } as unknown as CadenceRepository
  return new GetCadenceUseCase(cadences)
}

describe('GetCadenceUseCase', () => {
  it('rejects when the cadence is not in the workspace', async () => {
    const useCase = buildUseCase(undefined)

    await expect(useCase.execute('missing', 'ws-1')).rejects.toBeInstanceOf(
      CadenceNotFoundException,
    )
  })

  it('returns the cadence with its steps', async () => {
    const useCase = buildUseCase(cadence)

    expect(await useCase.execute('cadence-1', 'ws-1')).toBe(cadence)
  })
})
