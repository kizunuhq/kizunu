import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { EntryTriggerRepository } from '@kizunu/api/modules/engine/persistence/entry-trigger.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new EntryTriggerRepository({ db } as unknown as DrizzleService)

async function seed() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const workspaceId = workspace!.id
  const [connector] = await db
    .insert(connectorAccounts)
    .values({ workspaceId, connectorId: 'pipedrive', name: 'Acme', credentials: {} })
    .returning({ id: connectorAccounts.id })
  const [cadence] = await db
    .insert(cadences)
    .values({ workspaceId, name: 'Follow-up' })
    .returning({ id: cadences.id })
  return { workspaceId, connectorAccountId: connector!.id, cadenceId: cadence!.id }
}

describe('EntryTriggerRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['entry_triggers', 'cadences', 'connector_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('creates a trigger and resolves the cadence to start for a stage', async () => {
    const { workspaceId, connectorAccountId, cadenceId } = await seed()

    const { id } = await repository.create({
      workspaceId,
      connectorAccountId,
      pipelineId: null,
      stageId: 'stage-5',
      cadenceId,
    })

    expect(await repository.findByAccountAndStage(connectorAccountId, 'stage-5')).toEqual({ id })
    expect(await repository.findByAccountAndStage(connectorAccountId, 'stage-9')).toBeUndefined()
  })

  it('lists and deletes triggers for a workspace', async () => {
    const { workspaceId, connectorAccountId, cadenceId } = await seed()
    const { id } = await repository.create({
      workspaceId,
      connectorAccountId,
      pipelineId: 'pipeline-1',
      stageId: 'stage-5',
      cadenceId,
    })

    expect(await repository.listByWorkspace(workspaceId)).toHaveLength(1)

    await repository.delete(id)
    expect(await repository.listByWorkspace(workspaceId)).toHaveLength(0)
  })
})
