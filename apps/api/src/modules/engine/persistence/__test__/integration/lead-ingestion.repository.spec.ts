import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leads } from '@kizunu/api/db/schemas/leads'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const service = { db } as unknown as DrizzleService
const leadRepository = new LeadRepository(service)
const journeyRepository = new LeadJourneyRepository(service)

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

describe('Lead ingestion repositories (integration)', () => {
  beforeEach(async () => {
    await truncateAll(['lead_journeys', 'leads', 'cadences', 'connector_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('upserts a lead idempotently by connector account and external id', async () => {
    const { workspaceId, connectorAccountId } = await seed()
    const base = {
      workspaceId,
      connectorAccountId,
      externalId: 'deal-99',
      ownerExternalId: 'u-1',
      ownerUserId: null,
    }

    const first = await leadRepository.upsert({ ...base, name: 'Acme', phone: '111' })
    const second = await leadRepository.upsert({ ...base, name: 'Acme Renamed', phone: '222' })

    expect(second.id).toBe(first.id)
    const rows = await db
      .select({ name: leads.name, phone: leads.phone })
      .from(leads)
      .where(eq(leads.id, first.id))
    expect(rows[0]).toEqual({ name: 'Acme Renamed', phone: '222' })
  })

  it('reports a non-terminal journey only for the matching lead and cadence', async () => {
    const { workspaceId, connectorAccountId, cadenceId } = await seed()
    const { id: leadId } = await leadRepository.upsert({
      workspaceId,
      connectorAccountId,
      externalId: 'deal-99',
      ownerExternalId: null,
      ownerUserId: null,
      name: 'Acme',
      phone: null,
    })
    await journeyRepository.create({ leadId, cadenceId, nextTouchAt: new Date() })

    expect(await journeyRepository.hasNonTerminal(leadId, cadenceId)).toBe(true)
    expect(await journeyRepository.hasNonTerminal(leadId, crypto.randomUUID())).toBe(false)
  })
})
