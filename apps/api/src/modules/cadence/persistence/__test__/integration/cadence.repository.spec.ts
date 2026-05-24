import type { CadenceStepInput } from '@kizunu/api-contracts/cadence'
import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import {
  type CadenceFields,
  CadenceRepository,
} from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new CadenceRepository({ db } as unknown as DrizzleService)

function step(channelPluginId: string): CadenceStepInput {
  return {
    delayMinutes: 60,
    jitterMinutes: 5,
    channelStrategy: 'lead_owner',
    channelPluginId,
    templateId: null,
  }
}

async function seedWorkspace() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  return workspace!.id
}

function fields(workspaceId: string): CadenceFields {
  return {
    workspaceId,
    name: 'Follow-up',
    status: 'active',
    stopOnReply: true,
    onReply: [{ type: 'mark_lost', reason: 'No reply' }],
    onExhausted: [],
    onComplete: [],
    sendingWindow: null,
  }
}

describe('CadenceRepository (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['cadence_steps', 'cadences', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('creates a cadence with ordered steps and reads it back', async () => {
    const workspaceId = await seedWorkspace()

    const { id } = await repository.createWithSteps(fields(workspaceId), [
      step('meta-whatsapp'),
      step('meta-whatsapp'),
    ])
    const cadence = await repository.getWithSteps(id, workspaceId)

    expect(cadence?.steps.map((s) => s.stepOrder)).toEqual([0, 1])
    expect(cadence?.onReply).toEqual([{ type: 'mark_lost', reason: 'No reply' }])
  })

  it('counts steps per cadence when listing', async () => {
    const workspaceId = await seedWorkspace()
    await repository.createWithSteps(fields(workspaceId), [
      step('meta-whatsapp'),
      step('meta-whatsapp'),
    ])

    const list = await repository.listByWorkspace(workspaceId)

    expect(list).toHaveLength(1)
    expect(list[0]?.stepCount).toBe(2)
  })

  it('replaces all steps on update without leaving orphans', async () => {
    const workspaceId = await seedWorkspace()
    const { id } = await repository.createWithSteps(fields(workspaceId), [
      step('meta-whatsapp'),
      step('meta-whatsapp'),
    ])

    await repository.updateWithSteps(
      id,
      {
        name: 'Renamed',
        status: 'inactive',
        stopOnReply: false,
        onReply: [],
        onExhausted: [],
        onComplete: [],
        sendingWindow: null,
      },
      [step('meta-whatsapp')],
    )

    const cadence = await repository.getWithSteps(id, workspaceId)
    expect(cadence?.name).toBe('Renamed')
    expect(cadence?.steps).toHaveLength(1)
  })
})
