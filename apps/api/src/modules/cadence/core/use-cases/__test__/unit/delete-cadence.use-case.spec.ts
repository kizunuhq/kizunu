import { CadenceNotFoundException } from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import { DeleteCadenceUseCase } from '@kizunu/api/modules/cadence/core/use-cases/delete-cadence.use-case'
import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { describe, expect, it } from 'vite-plus/test'

function buildUseCase(found: { id: string } | undefined) {
  const deletes: string[] = []
  const cadences = {
    findByIdInWorkspace: async () => found,
    delete: async (id: string) => {
      deletes.push(id)
    },
  } as unknown as CadenceRepository
  return { deletes, useCase: new DeleteCadenceUseCase(cadences) }
}

describe('DeleteCadenceUseCase', () => {
  it('rejects when the cadence is not in the workspace', async () => {
    const { useCase, deletes } = buildUseCase(undefined)

    await expect(useCase.execute('missing', 'ws-1')).rejects.toBeInstanceOf(
      CadenceNotFoundException,
    )
    expect(deletes).toHaveLength(0)
  })

  it('deletes an existing cadence', async () => {
    const { useCase, deletes } = buildUseCase({ id: 'cadence-1' })

    await useCase.execute('cadence-1', 'ws-1')

    expect(deletes).toEqual(['cadence-1'])
  })
})
