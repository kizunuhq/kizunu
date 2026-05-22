import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const service = { db } as unknown as DrizzleService
const leadRepository = new LeadRepository(service)
const journeyRepository = new LeadJourneyRepository(service)

async function user() {
  const [row] = await db
    .insert(users)
    .values({ email: `u-${crypto.randomUUID()}@x.com`, passwordHash: 'x', name: 'U' })
    .returning({ id: users.id })
  return row!.id
}

async function seed() {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const workspaceId = workspace!.id
  const ownerId = await user()
  const newOwnerId = await user()
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
      externalId: 'deal-1',
      ownerExternalId: null,
      ownerUserId: ownerId,
      name: 'Acme',
      phone: null,
    })
    .returning({ id: leads.id })
  const [journey] = await db
    .insert(leadJourneys)
    .values({ leadId: lead!.id, cadenceId: cadence!.id, nextTouchAt: new Date() })
    .returning({ id: leadJourneys.id })
  return { workspaceId, ownerId, newOwnerId, leadId: lead!.id, journeyId: journey!.id }
}

async function status(journeyId: string) {
  const [row] = await db
    .select({ status: leadJourneys.status })
    .from(leadJourneys)
    .where(eq(leadJourneys.id, journeyId))
  return row?.status
}

describe('Lead reassignment repositories (integration)', () => {
  beforeEach(async () => {
    await truncateAll([
      'lead_journeys',
      'leads',
      'cadences',
      'connector_accounts',
      'workspaces',
      'users',
    ])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('parks an inactive owner running journeys, then reassignment resumes them', async () => {
    const { workspaceId, ownerId, newOwnerId, leadId, journeyId } = await seed()

    await journeyRepository.pauseRunningForOwner(workspaceId, ownerId)
    expect(await status(journeyId)).toBe('paused_owner_inactive')

    await leadRepository.reassign(workspaceId, ownerId, newOwnerId)
    await journeyRepository.resumePausedForOwner(workspaceId, newOwnerId, new Date())

    const [lead] = await db
      .select({ ownerUserId: leads.ownerUserId })
      .from(leads)
      .where(eq(leads.id, leadId))
    expect(lead?.ownerUserId).toBe(newOwnerId)
    expect(await status(journeyId)).toBe('running')
  })
})
