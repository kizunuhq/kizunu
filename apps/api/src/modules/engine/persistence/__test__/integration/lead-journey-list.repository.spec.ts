import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const repository = new LeadJourneyRepository({ db } as unknown as DrizzleService)

async function seedJourney(name: string, status: 'running' | 'replied') {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const workspaceId = workspace!.id
  const [connector] = await db
    .insert(connectorAccounts)
    .values({ workspaceId, connectorId: 'pipedrive', name: 'CRM', credentials: {} })
    .returning({ id: connectorAccounts.id })
  const [cadence] = await db
    .insert(cadences)
    .values({ workspaceId, name: 'Follow-up' })
    .returning({ id: cadences.id })
  const [lead] = await db
    .insert(leads)
    .values({
      workspaceId,
      connectorAccountId: connector!.id,
      externalId: crypto.randomUUID(),
      ownerExternalId: null,
      name,
      phone: null,
    })
    .returning({ id: leads.id })
  await db.insert(leadJourneys).values({ leadId: lead!.id, cadenceId: cadence!.id, status })
  return workspaceId
}

describe('LeadJourneyRepository.listByWorkspace (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['lead_journeys', 'leads', 'cadences', 'connector_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('lists a workspace journeys with the lead name, optionally filtered by status', async () => {
    const workspaceId = await seedJourney('Running Deal', 'running')
    // a second journey in the same workspace requires reusing the workspace; seed inline
    const [connector] = await db
      .insert(connectorAccounts)
      .values({ workspaceId, connectorId: 'pipedrive', name: 'CRM2', credentials: {} })
      .returning({ id: connectorAccounts.id })
    const [cadence] = await db
      .insert(cadences)
      .values({ workspaceId, name: 'Follow-up 2' })
      .returning({ id: cadences.id })
    const [lead] = await db
      .insert(leads)
      .values({
        workspaceId,
        connectorAccountId: connector!.id,
        externalId: crypto.randomUUID(),
        ownerExternalId: null,
        name: 'Replied Deal',
        phone: null,
      })
      .returning({ id: leads.id })
    await db
      .insert(leadJourneys)
      .values({ leadId: lead!.id, cadenceId: cadence!.id, status: 'replied' })

    expect(await repository.listByWorkspace(workspaceId)).toHaveLength(2)
    const running = await repository.listByWorkspace(workspaceId, 'running')
    expect(running).toHaveLength(1)
    expect(running[0]?.leadName).toBe('Running Deal')
  })
})
