import { CreateCadenceUseCase } from '@kizunu/api/modules/cadence/core/use-cases/create-cadence.use-case'
import type { CadenceInput } from '@kizunu/api/modules/cadence/core/use-cases/create-cadence.use-case'
import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import { UnknownChannelPluginException } from '@kizunu/api/modules/channel/core/errors/channel.errors'
import type { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { describe, expect, it } from 'vite-plus/test'

const input: CadenceInput = {
  workspaceId: 'ws-1',
  name: 'Follow-up cadence',
  status: 'active',
  stopOnReply: true,
  steps: [
    {
      delayMinutes: 60,
      jitterMinutes: 0,
      channelStrategy: 'lead_owner',
      channelPluginId: 'meta-whatsapp',
      templateId: null,
    },
  ],
  onReply: [],
  onExhausted: [],
  onComplete: [],
}

function buildUseCase(hasPlugin: boolean) {
  const createCalls: unknown[] = []
  const registry = { has: () => hasPlugin } as unknown as ChannelPluginRegistry
  const templates = { findByIdInWorkspace: async () => undefined } as unknown as TemplateRepository
  const cadences = {
    createWithSteps: async (fields: unknown, steps: unknown) => {
      createCalls.push({ fields, steps })
      return { id: 'cadence-1' }
    },
  } as unknown as CadenceRepository
  return { createCalls, useCase: new CreateCadenceUseCase(registry, templates, cadences) }
}

describe('CreateCadenceUseCase', () => {
  it('persists a valid cadence and returns its id', async () => {
    const { useCase, createCalls } = buildUseCase(true)

    const result = await useCase.execute(input)

    expect(result).toEqual({ id: 'cadence-1', name: 'Follow-up cadence' })
    expect(createCalls).toHaveLength(1)
  })

  it('does not persist when a step references an unregistered plugin', async () => {
    const { useCase, createCalls } = buildUseCase(false)

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(UnknownChannelPluginException)
    expect(createCalls).toHaveLength(0)
  })
})
