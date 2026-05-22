import { DuplicateTemplateException } from '@kizunu/api/modules/cadence/core/errors/template.errors'
import { CreateTemplateUseCase } from '@kizunu/api/modules/cadence/core/use-cases/create-template.use-case'
import type { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import { describe, expect, it } from 'vite-plus/test'

const input = {
  workspaceId: 'ws-1',
  name: 'Follow-up 1',
  channelPluginId: 'meta-whatsapp',
  providerTemplateName: 'followup_1',
  language: 'en_US',
  variables: ['name'],
}

function buildUseCase(existing: { id: string } | undefined) {
  const createCalls: unknown[] = []
  const templates = {
    findByName: async () => existing,
    create: async (values: unknown) => {
      createCalls.push(values)
      return { id: 'template-1' }
    },
  } as unknown as TemplateRepository
  return { createCalls, useCase: new CreateTemplateUseCase(templates) }
}

describe('CreateTemplateUseCase', () => {
  it('rejects a name already used in the workspace', async () => {
    const { useCase, createCalls } = buildUseCase({ id: 'existing' })

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(DuplicateTemplateException)
    expect(createCalls).toHaveLength(0)
  })

  it('persists a template when the name is free', async () => {
    const { useCase, createCalls } = buildUseCase(undefined)

    const result = await useCase.execute(input)

    expect(result).toEqual({ id: 'template-1', name: 'Follow-up 1' })
    expect(createCalls).toHaveLength(1)
  })
})
