import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import type { DbTransaction } from '@kizunu/api/modules/engine/persistence/transaction'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'

const leadRepo = new LeadRepository({ db } as unknown as DrizzleService)
const journeyRepo = new LeadJourneyRepository({ db } as unknown as DrizzleService)

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

async function seedLead(seed: Seed, externalId: string, ownerExternalId: string): Promise<string> {
  const [row] = await db
    .insert(leads)
    .values({
      workspaceId: seed.workspaceId,
      connectorAccountId: seed.connectorAccountId,
      externalId,
      ownerExternalId,
      ownerUserId: null,
      name: 'A lead',
      phone: null,
    })
    .returning({ id: leads.id })
  return row!.id
}

async function seedJourney(
  seed: Seed,
  leadId: string,
  options: { status?: string; errorReason?: string | null } = {},
): Promise<string> {
  const [row] = await db
    .insert(leadJourneys)
    .values({
      leadId,
      cadenceId: seed.cadenceId,
      status: (options.status ?? 'error_state') as 'error_state',
      errorReason: options.errorReason ?? 'owner_not_mapped',
      nextTouchAt: null,
    })
    .returning({ id: leadJourneys.id })
  return row!.id
}

describe('LeadRepository.backfillOwnerUserId (integration)', () => {
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

  it('sets ownerUserId only on leads matching (account, externalOwner) with null ownerUserId', async () => {
    const seed = await seedScenario()
    const matchA = await seedLead(seed, 'deal-A', '12345')
    const matchB = await seedLead(seed, 'deal-B', '12345')
    await seedLead(seed, 'deal-C', '99999')

    const result = await db.transaction(async (tx) => {
      return await leadRepo.backfillOwnerUserId(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        ownerExternalId: '12345',
        ownerUserId: seed.userId,
      })
    })

    expect(result.leadIds.sort()).toEqual([matchA, matchB].sort())
    const aRow = await db.select().from(leads).where(eq(leads.id, matchA))
    expect(aRow[0]?.ownerUserId).toBe(seed.userId)
  })

  it('does not touch leads whose ownerUserId is already set', async () => {
    const seed = await seedScenario()
    const [other] = await db
      .insert(users)
      .values({ email: `other-${crypto.randomUUID()}@acme.com`, name: 'Other' })
      .returning({ id: users.id })
    const claimed = await seedLead(seed, 'deal-C', '12345')
    await db.update(leads).set({ ownerUserId: other!.id }).where(eq(leads.id, claimed))

    const result = await db.transaction(async (tx) => {
      return await leadRepo.backfillOwnerUserId(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        ownerExternalId: '12345',
        ownerUserId: seed.userId,
      })
    })

    expect(result.leadIds).toEqual([])
    const row = await db.select().from(leads).where(eq(leads.id, claimed))
    expect(row[0]?.ownerUserId).toBe(other!.id)
  })

  it('returns empty when no leads match', async () => {
    const seed = await seedScenario()

    const result = await db.transaction(async (tx) => {
      return await leadRepo.backfillOwnerUserId(tx as unknown as DbTransaction, {
        connectorAccountId: seed.connectorAccountId,
        ownerExternalId: 'nope',
        ownerUserId: seed.userId,
      })
    })

    expect(result.leadIds).toEqual([])
  })
})

describe('LeadJourneyRepository.resumeErrorStateByLeadsAndReason (integration)', () => {
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

  it('resumes matching journeys and clears their errorReason', async () => {
    const seed = await seedScenario()
    const leadId = await seedLead(seed, 'deal-A', '12345')
    const journeyId = await seedJourney(seed, leadId, {
      status: 'error_state',
      errorReason: 'owner_not_mapped',
    })
    const resumeAt = new Date('2026-06-01T10:00:00.000Z')

    const result = await db.transaction(async (tx) => {
      return await journeyRepo.resumeErrorStateByLeadsAndReason(tx as unknown as DbTransaction, {
        leadIds: [leadId],
        reason: 'owner_not_mapped',
        nextTouchAt: resumeAt,
      })
    })

    expect(result.updated).toBe(1)
    const row = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(row[0]?.status).toBe('running')
    expect(row[0]?.errorReason).toBeNull()
    expect(row[0]?.nextTouchAt?.toISOString()).toBe(resumeAt.toISOString())
  })

  it('does not touch journeys whose reason does not match', async () => {
    const seed = await seedScenario()
    const leadId = await seedLead(seed, 'deal-A', '12345')
    const journeyId = await seedJourney(seed, leadId, {
      status: 'error_state',
      errorReason: 'template_required',
    })

    const result = await db.transaction(async (tx) => {
      return await journeyRepo.resumeErrorStateByLeadsAndReason(tx as unknown as DbTransaction, {
        leadIds: [leadId],
        reason: 'owner_not_mapped',
        nextTouchAt: new Date(),
      })
    })

    expect(result.updated).toBe(0)
    const row = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(row[0]?.status).toBe('error_state')
    expect(row[0]?.errorReason).toBe('template_required')
  })

  it('does not touch journeys in a non-error status', async () => {
    const seed = await seedScenario()
    const leadId = await seedLead(seed, 'deal-A', '12345')
    const journeyId = await seedJourney(seed, leadId, { status: 'running', errorReason: null })

    const result = await db.transaction(async (tx) => {
      return await journeyRepo.resumeErrorStateByLeadsAndReason(tx as unknown as DbTransaction, {
        leadIds: [leadId],
        reason: 'owner_not_mapped',
        nextTouchAt: new Date(),
      })
    })

    expect(result.updated).toBe(0)
    const row = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(row[0]?.status).toBe('running')
  })

  it('is a no-op on an empty lead-id list', async () => {
    const seed = await seedScenario()
    await seedLead(seed, 'deal-A', '12345')

    const result = await db.transaction(async (tx) => {
      return await journeyRepo.resumeErrorStateByLeadsAndReason(tx as unknown as DbTransaction, {
        leadIds: [],
        reason: 'owner_not_mapped',
        nextTouchAt: new Date(),
      })
    })

    expect(result.updated).toBe(0)
  })
})
