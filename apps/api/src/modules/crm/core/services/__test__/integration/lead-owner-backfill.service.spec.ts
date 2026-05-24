import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { LeadOwnerBackfillService } from '@kizunu/api/modules/crm/core/services/lead-owner-backfill.service'
import { Clock } from '@kizunu/api/modules/engine/core/clock'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import type { DbTransaction } from '@kizunu/api/modules/engine/persistence/transaction'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const leadRepo = new LeadRepository({ db } as unknown as DrizzleService)
const journeyRepo = new LeadJourneyRepository({ db } as unknown as DrizzleService)
const clock = new Clock()
const service = new LeadOwnerBackfillService(leadRepo, journeyRepo, clock)

interface Seed {
  workspaceId: string
  userId: string
  cadenceId: string
  connectorAccountId: string
}

async function seedScenario(): Promise<Seed> {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const [user] = await db
    .insert(users)
    .values({ email: `bdr-${crypto.randomUUID()}@acme.com`, name: 'BDR' })
    .returning({ id: users.id })
  const [cadence] = await db
    .insert(cadences)
    .values({ workspaceId: workspace!.id, name: 'FUP', stopOnReply: true })
    .returning({ id: cadences.id })
  const [account] = await db
    .insert(connectorAccounts)
    .values({
      workspaceId: workspace!.id,
      connectorId: 'pipedrive',
      name: 'Acme Pipedrive',
      credentials: { apiToken: 'tok', companyDomain: 'acme' },
    })
    .returning({ id: connectorAccounts.id })
  return {
    workspaceId: workspace!.id,
    userId: user!.id,
    cadenceId: cadence!.id,
    connectorAccountId: account!.id,
  }
}

async function seedLeadAndJourney(
  seed: Seed,
  externalId: string,
  ownerExternalId: string,
  journeyStatus: 'error_state' | 'running',
  errorReason: string | null,
): Promise<{ leadId: string; journeyId: string }> {
  const [lead] = await db
    .insert(leads)
    .values({
      workspaceId: seed.workspaceId,
      connectorAccountId: seed.connectorAccountId,
      externalId,
      ownerExternalId,
      ownerUserId: null,
      name: 'Lead',
      phone: null,
    })
    .returning({ id: leads.id })
  const [journey] = await db
    .insert(leadJourneys)
    .values({
      leadId: lead!.id,
      cadenceId: seed.cadenceId,
      status: journeyStatus,
      errorReason,
      nextTouchAt: null,
    })
    .returning({ id: leadJourneys.id })
  return { leadId: lead!.id, journeyId: journey!.id }
}

describe('LeadOwnerBackfillService.backfillFor (integration)', () => {
  beforeEach(async () => {
    await truncateAll([
      'lead_journeys',
      'leads',
      'cadences',
      'connector_accounts',
      'users',
      'workspaces',
    ])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('backfills matching leads AND resumes their parked journeys in one pass', async () => {
    const seed = await seedScenario()
    const { leadId, journeyId } = await seedLeadAndJourney(
      seed,
      'deal-A',
      '12345',
      'error_state',
      'owner_not_mapped',
    )

    const result = await db.transaction(async (tx) => {
      return await service.backfillFor(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        externalId: '12345',
        userId: seed.userId,
      })
    })

    expect(result).toEqual({ leadsUpdated: 1, journeysResumed: 1 })
    const leadRow = await db.select().from(leads).where(eq(leads.id, leadId))
    expect(leadRow[0]?.ownerUserId).toBe(seed.userId)
    const journeyRow = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journeyRow[0]?.status).toBe('running')
    expect(journeyRow[0]?.errorReason).toBeNull()
    expect(journeyRow[0]?.nextTouchAt).not.toBeNull()
  })

  it('backfills the lead but does not resume a journey whose error reason differs', async () => {
    const seed = await seedScenario()
    const { leadId, journeyId } = await seedLeadAndJourney(
      seed,
      'deal-A',
      '12345',
      'error_state',
      'template_required',
    )

    const result = await db.transaction(async (tx) => {
      return await service.backfillFor(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        externalId: '12345',
        userId: seed.userId,
      })
    })

    expect(result).toEqual({ leadsUpdated: 1, journeysResumed: 0 })
    const leadRow = await db.select().from(leads).where(eq(leads.id, leadId))
    expect(leadRow[0]?.ownerUserId).toBe(seed.userId)
    const journeyRow = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journeyRow[0]?.status).toBe('error_state')
    expect(journeyRow[0]?.errorReason).toBe('template_required')
  })

  it('returns zero/zero when no leads match the (account, externalId) pair', async () => {
    const seed = await seedScenario()

    const result = await db.transaction(async (tx) => {
      return await service.backfillFor(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        externalId: 'nope',
        userId: seed.userId,
      })
    })

    expect(result).toEqual({ leadsUpdated: 0, journeysResumed: 0 })
  })

  it('reports separate counts for leads vs. journeys when fewer journeys exist', async () => {
    const seed = await seedScenario()
    await seedLeadAndJourney(seed, 'deal-A', '12345', 'error_state', 'owner_not_mapped')
    const noJourneyLead = await db
      .insert(leads)
      .values({
        workspaceId: seed.workspaceId,
        connectorAccountId: seed.connectorAccountId,
        externalId: 'deal-B',
        ownerExternalId: '12345',
        ownerUserId: null,
        name: 'No-Journey Lead',
        phone: null,
      })
      .returning({ id: leads.id })

    const result = await db.transaction(async (tx) => {
      return await service.backfillFor(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        externalId: '12345',
        userId: seed.userId,
      })
    })

    expect(result).toEqual({ leadsUpdated: 2, journeysResumed: 1 })
    const leadRow = await db.select().from(leads).where(eq(leads.id, noJourneyLead[0]!.id))
    expect(leadRow[0]?.ownerUserId).toBe(seed.userId)
  })
})
