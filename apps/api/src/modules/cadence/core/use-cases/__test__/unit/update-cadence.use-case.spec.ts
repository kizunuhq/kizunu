import { CadenceNotFoundException } from '@kizunu/api/modules/cadence/core/errors/cadence.errors'
import { UpdateCadenceUseCase } from '@kizunu/api/modules/cadence/core/use-cases/update-cadence.use-case'
import type { UpdateCadenceInput } from '@kizunu/api/modules/cadence/core/use-cases/update-cadence.use-case'
import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import type { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { describe, expect, it } from 'vite-plus/test'

const input: UpdateCadenceInput = {
  workspaceId: 'ws-1',
  cadenceId: 'cadence-1',
  name: 'Renamed',
  status: 'active',
  stopOnReply: true,
  steps: [
    {
      delayMinutes: 30,
      jitterMinutes: 0,
      channelStrategy: 'lead_owner',
      channelPluginId: 'meta-whatsapp',
      templateId: null,
    },
  ],
  onReply: [],
  onExhausted: [],
  onComplete: [],
  sendingWindow: null,
}

function buildUseCase(found: { id: string } | undefined) {
  const updateCalls: unknown[] = []
  const registry = { has: () => true } as unknown as ChannelPluginRegistry
  const templates = { findByIdInWorkspace: async () => undefined } as unknown as TemplateRepository
  const cadences = {
    findByIdInWorkspace: async () => found,
    updateWithSteps: async (id: string) => {
      updateCalls.push(id)
    },
  } as unknown as CadenceRepository
  return { updateCalls, useCase: new UpdateCadenceUseCase(registry, templates, cadences) }
}

describe('UpdateCadenceUseCase', () => {
  it('rejects when the cadence is not in the workspace', async () => {
    const { useCase, updateCalls } = buildUseCase(undefined)

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(CadenceNotFoundException)
    expect(updateCalls).toHaveLength(0)
  })

  it('replaces the cadence when it exists and validates', async () => {
    const { useCase, updateCalls } = buildUseCase({ id: 'cadence-1' })

    await useCase.execute(input)

    expect(updateCalls).toEqual(['cadence-1'])
  })
})
