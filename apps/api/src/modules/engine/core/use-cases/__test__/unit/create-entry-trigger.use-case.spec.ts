import { CadenceNotFoundException } from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { ConnectorAccountNotFoundException } from '@kizunu/api/modules/crm/core/errors/crm.errors'
import type { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { DuplicateEntryTriggerException } from '@kizunu/api/modules/engine/core/errors/entry-trigger.errors'
import { CreateEntryTriggerUseCase } from '@kizunu/api/modules/engine/core/use-cases/create-entry-trigger.use-case'
import type { EntryTriggerRepository } from '@kizunu/api/modules/engine/persistence/entry-trigger.repository'
import { describe, expect, it } from 'vite-plus/test'

const input = {
  workspaceId: 'ws-1',
  connectorAccountId: 'connector-1',
  pipelineId: null,
  stageId: 'stage-5',
  cadenceId: 'cadence-1',
}

function buildUseCase(scenario: {
  connector?: { id: string }
  cadence?: { id: string }
  duplicate?: { id: string }
}) {
  const createCalls: unknown[] = []
  const connectors = {
    findByIdInWorkspace: async () => scenario.connector,
  } as unknown as ConnectorAccountRepository
  const cadences = {
    findByIdInWorkspace: async () => scenario.cadence,
  } as unknown as CadenceRepository
  const triggers = {
    findByAccountAndStage: async () => scenario.duplicate,
    create: async (values: unknown) => {
      createCalls.push(values)
      return { id: 'trigger-1' }
    },
  } as unknown as EntryTriggerRepository
  return { createCalls, useCase: new CreateEntryTriggerUseCase(connectors, cadences, triggers) }
}

describe('CreateEntryTriggerUseCase', () => {
  it('rejects when the connector account is not in the workspace', async () => {
    const { useCase, createCalls } = buildUseCase({ connector: undefined })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConnectorAccountNotFoundException)
    expect(createCalls).toHaveLength(0)
  })

  it('rejects when the cadence is not in the workspace', async () => {
    const { useCase, createCalls } = buildUseCase({
      connector: { id: 'connector-1' },
      cadence: undefined,
    })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(CadenceNotFoundException)
    expect(createCalls).toHaveLength(0)
  })

  it('rejects a duplicate mapping for the same account and stage', async () => {
    const { useCase, createCalls } = buildUseCase({
      connector: { id: 'connector-1' },
      cadence: { id: 'cadence-1' },
      duplicate: { id: 'existing' },
    })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(DuplicateEntryTriggerException)
    expect(createCalls).toHaveLength(0)
  })

  it('creates the trigger when references resolve and no duplicate exists', async () => {
    const { useCase, createCalls } = buildUseCase({
      connector: { id: 'connector-1' },
      cadence: { id: 'cadence-1' },
      duplicate: undefined,
    })

    const result = await useCase.execute(input)

    expect(result).toEqual({ id: 'trigger-1' })
    expect(createCalls).toHaveLength(1)
  })
})
