import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { CRMConnector } from '@kizunu/api/modules/crm/core/connector/crm-connector'
import type { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import type { NormalizedEvent } from '@kizunu/api/modules/crm/core/connector/normalized-event'
import { Clock } from '@kizunu/api/modules/engine/core/clock'
import { StartJourneyUseCase } from '@kizunu/api/modules/engine/core/use-cases/start-journey.use-case'
import type { EntryTriggerRepository } from '@kizunu/api/modules/engine/persistence/entry-trigger.repository'
import type { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import type { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import { describe, expect, it } from 'vite-plus/test'

const NOW = new Date('2026-05-22T12:00:00.000Z')

const event: NormalizedEvent = {
  type: 'lead.stage_entered',
  externalId: 'deal-99',
  ownerExternalId: 'user-42',
  occurredAt: NOW,
  idempotencyKey: 'key-1',
  stageId: 'stage-5',
  raw: {},
}

function buildUseCase(scenario: {
  cadenceId?: string
  hasNonTerminal?: boolean
  delayMinutes?: number
}) {
  const created: Array<{ leadId: string; cadenceId: string; nextTouchAt: Date }> = []
  const upserts: unknown[] = []

  const connector = {
    fetchLead: async () => ({
      externalId: 'deal-99',
      ownerExternalId: 'user-42',
      name: 'Acme',
      phone: '5511999',
      raw: {},
    }),
  } as unknown as CRMConnector
  const registry = { get: () => connector } as unknown as CrmConnectorRegistry
  const triggers = {
    findCadenceByStage: async () =>
      scenario.cadenceId ? { cadenceId: scenario.cadenceId } : undefined,
  } as unknown as EntryTriggerRepository
  const leads = {
    upsert: async (values: unknown) => {
      upserts.push(values)
      return { id: 'lead-1' }
    },
  } as unknown as LeadRepository
  const journeys = {
    hasNonTerminal: async () => scenario.hasNonTerminal ?? false,
    create: async (input: { leadId: string; cadenceId: string; nextTouchAt: Date }) => {
      created.push(input)
      return { id: 'journey-1' }
    },
  } as unknown as LeadJourneyRepository
  const cadences = {
    firstStepDelayMinutes: async () => scenario.delayMinutes,
  } as unknown as CadenceRepository
  const clock = { now: () => NOW } as Clock

  return {
    created,
    upserts,
    useCase: new StartJourneyUseCase(registry, triggers, leads, journeys, cadences, clock),
  }
}

const input = {
  workspaceId: 'ws-1',
  connectorAccountId: 'account-1',
  connectorId: 'pipedrive',
  credentials: { apiToken: 't' },
  event,
}

describe('StartJourneyUseCase', () => {
  it('does nothing when no entry trigger maps the stage', async () => {
    const { useCase, created, upserts } = buildUseCase({ cadenceId: undefined })

    await useCase.execute(input)

    expect(created).toHaveLength(0)
    expect(upserts).toHaveLength(0)
  })

  it('upserts the lead and starts a journey with nextTouchAt from the first step delay', async () => {
    const { useCase, created } = buildUseCase({ cadenceId: 'cadence-1', delayMinutes: 60 })

    await useCase.execute(input)

    expect(created).toEqual([
      {
        leadId: 'lead-1',
        cadenceId: 'cadence-1',
        nextTouchAt: new Date('2026-05-22T13:00:00.000Z'),
      },
    ])
  })

  it('does not start a second journey when a non-terminal one already exists', async () => {
    const { useCase, created } = buildUseCase({ cadenceId: 'cadence-1', hasNonTerminal: true })

    await useCase.execute(input)

    expect(created).toHaveLength(0)
  })

  it('does nothing when the event carries no stage', async () => {
    const { useCase, upserts } = buildUseCase({ cadenceId: 'cadence-1' })

    await useCase.execute({ ...input, event: { ...event, stageId: undefined } })

    expect(upserts).toHaveLength(0)
  })
})
