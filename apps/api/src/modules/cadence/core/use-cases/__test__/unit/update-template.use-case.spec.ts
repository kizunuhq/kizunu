import {
  DuplicateTemplateException,
  TemplateNotFoundException,
} from '@kizunu/api/modules/cadence/core/errors/template.errors'
import { UpdateTemplateUseCase } from '@kizunu/api/modules/cadence/core/use-cases/update-template.use-case'
import type {
  TemplatePatch,
  TemplateRepository,
  TemplateRow,
} from '@kizunu/api/modules/cadence/persistence/template.repository'
import { describe, expect, it } from 'vite-plus/test'

const existing: TemplateRow = {
  id: 'template-1',
  name: 'Follow-up 1',
  channelPluginId: 'meta-whatsapp',
  providerTemplateName: 'followup_1',
  language: 'en_US',
  variables: [],
}

function buildUseCase(scenario: { found?: TemplateRow; byName?: { id: string } }) {
  const updates: Array<{ id: string; patch: TemplatePatch }> = []
  const templates = {
    findByIdInWorkspace: async () => scenario.found,
    findByName: async () => scenario.byName,
    update: async (id: string, patch: TemplatePatch) => {
      updates.push({ id, patch })
    },
  } as unknown as TemplateRepository
  return { updates, useCase: new UpdateTemplateUseCase(templates) }
}

describe('UpdateTemplateUseCase', () => {
  it('rejects when the template is not in the workspace', async () => {
    const { useCase, updates } = buildUseCase({ found: undefined })

    const result = useCase.execute({ workspaceId: 'ws-1', templateId: 'missing', patch: {} })

    await expect(result).rejects.toBeInstanceOf(TemplateNotFoundException)
    expect(updates).toHaveLength(0)
  })

  it('rejects a rename that clashes with another template', async () => {
    const { useCase, updates } = buildUseCase({ found: existing, byName: { id: 'other' } })

    const result = useCase.execute({
      workspaceId: 'ws-1',
      templateId: 'template-1',
      patch: { name: 'Taken' },
    })

    await expect(result).rejects.toBeInstanceOf(DuplicateTemplateException)
    expect(updates).toHaveLength(0)
  })

  it('applies the patch when the template exists and the name is free', async () => {
    const { useCase, updates } = buildUseCase({ found: existing, byName: undefined })

    await useCase.execute({
      workspaceId: 'ws-1',
      templateId: 'template-1',
      patch: { language: 'pt_BR' },
    })

    expect(updates).toEqual([{ id: 'template-1', patch: { language: 'pt_BR' } }])
  })
})
