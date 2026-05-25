import { buildCredentialsCipher } from '@kizunu/api/__test__/integration/credentials-cipher'
import { closeDb, db, truncateAll } from '@kizunu/api/__test__/integration/db'
import { cadenceSteps } from '@kizunu/api/db/schemas/cadence-steps'
import { cadences } from '@kizunu/api/db/schemas/cadences'
import { channelAccesses } from '@kizunu/api/db/schemas/channel-accesses'
import { channelAccounts } from '@kizunu/api/db/schemas/channel-accounts'
import { connectorAccounts } from '@kizunu/api/db/schemas/connector-accounts'
import { leadJourneys } from '@kizunu/api/db/schemas/lead-journeys'
import { leads } from '@kizunu/api/db/schemas/leads'
import { templates } from '@kizunu/api/db/schemas/templates'
import { touchAttempts } from '@kizunu/api/db/schemas/touch-attempts'
import { users } from '@kizunu/api/db/schemas/users'
import { workspaces } from '@kizunu/api/db/schemas/workspaces'
import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { TemplateRepository } from '@kizunu/api/modules/cadence/persistence/template.repository'
import { FakeChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/__test__/fake-channel-plugin'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { ChannelAccessRepository } from '@kizunu/api/modules/channel/persistence/channel-access.repository'
import { ChannelAccountRepository } from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import type { Clock } from '@kizunu/api/modules/engine/core/clock'
import type { Jitter } from '@kizunu/api/modules/engine/core/domain/jitter'
import { CadenceActionExecutor } from '@kizunu/api/modules/engine/core/services/cadence-action-executor'
import { JourneyDispatcher } from '@kizunu/api/modules/engine/core/services/journey-dispatcher'
import { TemplateVariableResolver } from '@kizunu/api/modules/engine/core/services/template-variable-resolver'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { TouchAttemptRepository } from '@kizunu/api/modules/engine/persistence/touch-attempt.repository'
import type { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

const NOW = new Date('2026-05-22T12:00:00.000Z')
const PAST = new Date('2026-05-22T11:00:00.000Z')

const service = { db } as unknown as DrizzleService
const cipher = buildCredentialsCipher()
const markLostCalls: string[] = []

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
  logActivity: async () => ({ externalActivityId: 'activity-1' }),
  moveStage: async () => {},
  markLost: async (externalId: string) => {
    markLostCalls.push(externalId)
  },
  setField: async () => {},
} as unknown as CRMConnector

function buildDispatcher() {
  const crmRegistry = new CrmConnectorRegistry([fakeConnector])
  return new JourneyDispatcher(
    service,
    new LeadJourneyRepository(service),
    new TouchAttemptRepository(),
    new CadenceRepository(service),
    new TemplateRepository(service),
    new ChannelAccessRepository(service),
    new ChannelAccountRepository(service, cipher),
    new ChannelPluginRegistry([new FakeChannelPlugin()]),
    new ConnectorAccountRepository(service, cipher),
    crmRegistry,
    new CadenceActionExecutor(crmRegistry),
    new TemplateVariableResolver(),
    { apply: (delayMinutes: number) => delayMinutes } as Jitter,
    { now: () => NOW } as Clock,
  )
}

async function seed(options: { ownerUserId: boolean; steps: number; currentStepOrder: number }) {
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Acme', slug: `acme-${crypto.randomUUID()}` })
    .returning({ id: workspaces.id })
  const workspaceId = workspace!.id
  const [user] = await db
    .insert(users)
    .values({ email: `bdr-${crypto.randomUUID()}@x.com`, passwordHash: 'x', name: 'BDR' })
    .returning({ id: users.id })
  const [account] = await db
    .insert(channelAccounts)
    .values({
      workspaceId,
      pluginId: 'fake',
      name: 'WA',
      credentials: { apiKey: 'k', sender: 's' },
    })
    .returning({ id: channelAccounts.id })
  await db
    .insert(channelAccesses)
    .values({ channelAccountId: account!.id, userId: user!.id, isPrimary: true })
  const [connector] = await db
    .insert(connectorAccounts)
    .values({ workspaceId, connectorId: 'fake-crm', name: 'CRM', credentials: {} })
    .returning({ id: connectorAccounts.id })
  const [template] = await db
    .insert(templates)
    .values({
      workspaceId,
      name: 'T1',
      channelPluginId: 'fake',
      providerTemplateName: 'hsm_1',
      language: 'en',
    })
    .returning({ id: templates.id })
  const [cadence] = await db
    .insert(cadences)
    .values({
      workspaceId,
      name: 'Follow-up',
      onExhausted: [{ type: 'mark_lost', reason: 'No reply' }],
    })
    .returning({ id: cadences.id })
  for (let order = 0; order < options.steps; order++) {
    await db.insert(cadenceSteps).values({
      cadenceId: cadence!.id,
      stepOrder: order,
      delayMinutes: 60,
      channelPluginId: 'fake',
      templateId: template!.id,
    })
  }
  const [lead] = await db
    .insert(leads)
    .values({
      workspaceId,
      connectorAccountId: connector!.id,
      externalId: 'deal-99',
      ownerExternalId: 'owner-1',
      ownerUserId: options.ownerUserId ? user!.id : null,
      name: 'Acme Deal',
      phone: '5511',
    })
    .returning({ id: leads.id })
  const [journey] = await db
    .insert(leadJourneys)
    .values({
      leadId: lead!.id,
      cadenceId: cadence!.id,
      currentStepOrder: options.currentStepOrder,
      nextTouchAt: PAST,
    })
    .returning({ id: leadJourneys.id })
  return { journeyId: journey!.id }
}

describe('JourneyDispatcher (integration)', () => {
  beforeEach(async () => {
    markLostCalls.length = 0
    await truncateAll([
      'touch_attempts',
      'lead_journeys',
      'leads',
      'cadence_steps',
      'cadences',
      'templates',
      'channel_accesses',
      'channel_accounts',
      'connector_accounts',
      'users',
      'workspaces',
    ])
  })

  afterAll(async () => {
    await closeDb()
  })

  it('dispatches the next step, records the touch, and advances the journey', async () => {
    const { journeyId } = await seed({ ownerUserId: true, steps: 2, currentStepOrder: -1 })

    await buildDispatcher().dispatchDue(NOW)

    const attempts = await db
      .select()
      .from(touchAttempts)
      .where(eq(touchAttempts.leadJourneyId, journeyId))
    expect(attempts).toHaveLength(1)
    expect(attempts[0]?.status).toBe('sent')
    expect(attempts[0]?.externalMessageId).toBe('fake-message')
    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.currentStepOrder).toBe(0)
    expect(journey?.status).toBe('running')
  })

  it('moves to error_state when the lead owner has no primary channel', async () => {
    const { journeyId } = await seed({ ownerUserId: false, steps: 2, currentStepOrder: -1 })

    await buildDispatcher().dispatchDue(NOW)

    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.status).toBe('error_state')
    const attempts = await db
      .select()
      .from(touchAttempts)
      .where(eq(touchAttempts.leadJourneyId, journeyId))
    expect(attempts).toHaveLength(0)
  })

  it('exhausts after the last step and runs onExhausted', async () => {
    const { journeyId } = await seed({ ownerUserId: true, steps: 1, currentStepOrder: 0 })

    await buildDispatcher().dispatchDue(NOW)

    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.status).toBe('exhausted')
    expect(markLostCalls).toEqual(['deal-99'])
  })

  it('does not re-send a step that already has a touch attempt', async () => {
    const { journeyId } = await seed({ ownerUserId: true, steps: 2, currentStepOrder: -1 })
    await db
      .insert(touchAttempts)
      .values({ leadJourneyId: journeyId, stepOrder: 0, status: 'sent' })

    await buildDispatcher().dispatchDue(NOW)

    const [journey] = await db.select().from(leadJourneys).where(eq(leadJourneys.id, journeyId))
    expect(journey?.currentStepOrder).toBe(-1)
  })
})
