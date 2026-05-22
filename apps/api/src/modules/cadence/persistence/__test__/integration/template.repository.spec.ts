import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new TemplateRepository({ db } as unknown as DrizzleService)

async function seedWorkspace() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return workspace!.id
}

const baseTemplate = {
  name: 'Follow-up 1',
  channelPluginId: 'meta-whatsapp',
  providerTemplateName: 'followup_1',
  language: 'en_US',
  variables: ['name'],
}

describe('TemplateRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['templates', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('creates a template and reads it back with its variables', async () => {
    const workspaceId = await seedWorkspace()

    const { id } = await repository.create({ workspaceId, ...baseTemplate })
    const found = await repository.findByIdInWorkspace(id, workspaceId)

    expect(found).toEqual({ id, ...baseTemplate })
  })

  it('finds a template by name within the workspace', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({ workspaceId, ...baseTemplate })

    expect(await repository.findByName(workspaceId, 'Follow-up 1')).toEqual({ id })
    expect(await repository.findByName(workspaceId, 'Other')).toBeUndefined()
  })

  it('updates only the provided fields and deletes', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.create({ workspaceId, ...baseTemplate })

    await repository.update(id, { language: 'pt_BR' })
    expect((await repository.findByIdInWorkspace(id, workspaceId))?.language).toBe('pt_BR')
    expect((await repository.findByIdInWorkspace(id, workspaceId))?.name).toBe('Follow-up 1')

    await repository.delete(id)
    expect(await repository.findByIdInWorkspace(id, workspaceId)).toBeUndefined()
  })
})
