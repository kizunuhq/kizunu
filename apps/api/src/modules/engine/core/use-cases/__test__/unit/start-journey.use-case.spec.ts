import type { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import type { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import type { NormalizedEvent } from '@kizunu/api/modules/crm/core/connector/normalized-event'
import type {
  ResolveOwnerOutput,
  ResolveOwnerService,
} from '@kizunu/api/modules/crm/core/services/resolve-owner.service'
import { Clock } from '@kizunu/api/modules/engine/core/clock'
import { LeadJourneyErrorReason } from '@kizunu/api/modules/engine/core/domain/lead-journey-error-reason'
import { LeadJourneyStatus } from '@kizunu/api/modules/engine/core/domain/lead-journey-status'
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

interface BuildScenario {
  cadenceId?: string
  hasNonTerminal?: boolean
  delayMinutes?: number
  resolve?: ResolveOwnerOutput
  ownerExternalId?: string | null
}

function buildUseCase(scenario: BuildScenario) {
  const created: Array<Record<string, unknown>> = []
  const upserts: Record<string, unknown>[] = []

  const ownerExternalId =
    'ownerExternalId' in scenario ? (scenario.ownerExternalId ?? null) : 'user-42'
  const registry = {
    fetchLead: async () => ({
      externalId: 'deal-99',
      ownerExternalId,
      name: 'Acme',
      phone: '5511999',
      raw: {},
    }),
  } as unknown as CrmConnectorRegistry
  const triggers = {
    findCadenceByStage: async () =>
      scenario.cadenceId ? { cadenceId: scenario.cadenceId } : undefined,
  } as unknown as EntryTriggerRepository
  const resolver = {
    resolve: async () => scenario.resolve ?? { userId: 'user-1' },
  } as unknown as ResolveOwnerService
  const leads = {
    upsert: async (values: Record<string, unknown>) => {
      upserts.push(values)
      return { id: 'lead-1' }
    },
  } as unknown as LeadRepository
  const journeys = {
    hasNonTerminal: async () => scenario.hasNonTerminal ?? false,
    create: async (input: Record<string, unknown>) => {
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
    useCase: new StartJourneyUseCase(
      registry,
      triggers,
      resolver,
      leads,
      journeys,
      cadences,
      clock,
    ),
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

  it('upserts the lead with ownerUserId and starts a running journey on resolved owner', async () => {
    const { useCase, created, upserts } = buildUseCase({
      cadenceId: 'cadence-1',
      delayMinutes: 60,
      resolve: { userId: 'user-1' },
    })

    await useCase.execute(input)

    expect(upserts[0]).toMatchObject({ ownerUserId: 'user-1' })
    expect(created).toEqual([
      {
        leadId: 'lead-1',
        cadenceId: 'cadence-1',
        nextTouchAt: new Date('2026-05-22T13:00:00.000Z'),
      },
    ])
  })

  it('parks the journey in error_state owner_not_mapped when resolver returns no match', async () => {
    const { useCase, created, upserts } = buildUseCase({
      cadenceId: 'cadence-1',
      delayMinutes: 60,
      resolve: { userId: null, errorReason: LeadJourneyErrorReason.OwnerNotMapped },
    })

    await useCase.execute(input)

    expect(upserts[0]).toMatchObject({ ownerUserId: null })
    expect(created).toEqual([
      {
        leadId: 'lead-1',
        cadenceId: 'cadence-1',
        nextTouchAt: null,
        status: LeadJourneyStatus.ErrorState,
        errorReason: LeadJourneyErrorReason.OwnerNotMapped,
      },
    ])
  })

  it('parks the journey in error_state owner_lookup_failed when resolver errors', async () => {
    const { useCase, created } = buildUseCase({
      cadenceId: 'cadence-1',
      resolve: { userId: null, errorReason: LeadJourneyErrorReason.OwnerLookupFailed },
    })

    await useCase.execute(input)

    expect(created[0]).toMatchObject({
      status: LeadJourneyStatus.ErrorState,
      errorReason: LeadJourneyErrorReason.OwnerLookupFailed,
    })
  })

  it('parks the journey when the event carries no ownerExternalId (skips resolver)', async () => {
    const { useCase, created, upserts } = buildUseCase({
      cadenceId: 'cadence-1',
      delayMinutes: 60,
      ownerExternalId: null,
    })

    await useCase.execute(input)

    expect(upserts[0]).toMatchObject({ ownerExternalId: null, ownerUserId: null })
    expect(created[0]).toMatchObject({
      status: LeadJourneyStatus.ErrorState,
      errorReason: LeadJourneyErrorReason.OwnerNotMapped,
    })
  })

  it('does not start a second journey when a non-terminal one already exists', async () => {
    const { useCase, created } = buildUseCase({
      cadenceId: 'cadence-1',
      hasNonTerminal: true,
    })

    await useCase.execute(input)

    expect(created).toHaveLength(0)
  })

  it('does nothing when the event carries no stage', async () => {
    const { useCase, upserts } = buildUseCase({ cadenceId: 'cadence-1' })

    await useCase.execute({ ...input, event: { ...event, stageId: undefined } })

    expect(upserts).toHaveLength(0)
  })
})
