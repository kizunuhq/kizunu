import { TemplateNotFoundException } from '@kizunu/api/modules/cadence/core/errors/template.errors'
import { DeleteTemplateUseCase } from '@kizunu/api/modules/cadence/core/use-cases/delete-template.use-case'
import type {
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

function buildUseCase(found: TemplateRow | undefined) {
  const deletes: string[] = []
  const templates = {
    findByIdInWorkspace: async () => found,
    delete: async (id: string) => {
      deletes.push(id)
    },
  } as unknown as TemplateRepository
  return { deletes, useCase: new DeleteTemplateUseCase(templates) }
}

describe('DeleteTemplateUseCase', () => {
  it('rejects when the template is not in the workspace', async () => {
    const { useCase, deletes } = buildUseCase(undefined)

    const result = useCase.execute({ workspaceId: 'ws-1', templateId: 'missing' })

    await expect(result).rejects.toBeInstanceOf(TemplateNotFoundException)
    expect(deletes).toHaveLength(0)
  })

  it('deletes an existing template', async () => {
    const { useCase, deletes } = buildUseCase(existing)

    await useCase.execute({ workspaceId: 'ws-1', templateId: 'template-1' })

    expect(deletes).toEqual(['template-1'])
  })
})
