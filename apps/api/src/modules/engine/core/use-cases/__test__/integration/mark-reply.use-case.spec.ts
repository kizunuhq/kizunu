import { buildCredentialsCipher } from '@kizunu/api/__test__/integration/credentials-cipher'
import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { CadenceActionExecutor } from '@kizunu/api/modules/engine/core/services/cadence-action-executor'
import { MarkReplyUseCase } from '@kizunu/api/modules/engine/core/use-cases/mark-reply.use-case'
import { AuditEventRepository } from '@kizunu/api/modules/engine/persistence/audit-event.repository'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

const service = { db } as unknown as DrizzleService
const moveStageCalls: Array<{ externalId: string; stageId: string }> = []

const fakeConnector = {
  manifest: {
    id: 'fake-crm',
    name: 'Fake CRM',
    capabilities: [],
    configSchema: z.object({}),
    credentialFields: { kind: 'flat' as const, fields: [] },
  },
  parseWebhook: () => [],
  fetchLead: async () => ({ externalId: '', ownerExternalId: null, name: '', raw: {} }),
  logActivity: async () => ({ externalActivityId: 'a' }),
  moveStage: async (externalId: string, stage: { stageId: string }) => {
    moveStageCalls.push({ externalId, stageId: stage.stageId })
  },
  markLost: async () => {},
  setField: async () => {},
} as unknown as CRMConnector

function buildUseCase() {
  const crmRegistry = new CrmConnectorRegistry([fakeConnector])
  return new MarkReplyUseCase(
    service,
    new LeadJourneyRepository(service),
    new CadenceRepository(service),
    new ConnectorAccountRepository(service, buildCredentialsCipher()),
    new CadenceActionExecutor(crmRegistry),
    new AuditEventRepository(service),
  )
}

async function seed(status: 'running' | 'replied') {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const workspaceId = workspace!.id
  const [connector] = await db
    .insert(connectorAccounts)
    .values({ workspaceId, connectorId: 'fake-crm', name: 'CRM', credentials: {} })
    .returning({ id: connectorAccounts.id })
  const [cadence] = await db
    .insert(cadences)
    .values({
      workspaceId,
      name: 'Follow-up',
      onReply: [{ type: 'move_stage', stageId: 'replied-stage' }],
    })
    .returning({ id: cadences.id })
  const [lead] = await db
    .insert(leads)
    .values({
      workspaceId,
      connectorAccountId: connector!.id,
      externalId: 'deal-99',
      ownerExternalId: null,
      name: 'Acme',
      phone: '5511',
    })
    .returning({ id: leads.id })
  const [journey] = await db
    .insert(leadJourneys)
    .values({ leadId: lead!.id, cadenceId: cadence!.id, status, currentStepOrder: 0 })
    .returning({ id: leadJourneys.id })
  return { workspaceId, journeyId: journey!.id }
}

describe('MarkReplyUseCase (integration)', () => {
  beforeEach(async () => {
    moveStageCalls.length = 0
    await truncateAll(['lead_journeys', 'leads', 'cadences', 'connector_accounts', 'workspaces'])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('marks a running journey replied and runs onReply', async () => {
    const { workspaceId, journeyId } = await seed('running')

    await buildUseCase().execute({ workspaceId, phone: '5511' })

    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.status).toBe('replied')
    expect(moveStageCalls).toEqual([{ externalId: 'deal-99', stageId: 'replied-stage' }])
  })

  it('ignores a reply for an already-terminal journey', async () => {
    const { workspaceId, journeyId } = await seed('replied')

    await buildUseCase().execute({ workspaceId, phone: '5511' })

    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.status).toBe('replied')
    expect(moveStageCalls).toHaveLength(0)
  })

  it('does nothing when no running journey matches the sender', async () => {
    const { workspaceId } = await seed('running')

    await buildUseCase().execute({ workspaceId, phone: '0000' })

    expect(moveStageCalls).toHaveLength(0)
  })
})
