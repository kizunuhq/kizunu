import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import type { NormalizedEvent } from '@kizunu/api/modules/crm/core/connector/normalized-event'
import { ResolveOwnerService } from '@kizunu/api/modules/crm/core/services/resolve-owner.service'
import { Injectable } from '@nestjs/common'

import { EntryTriggerRepository } from '../../persistence/entry-trigger.repository'
import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'
import { LeadRepository } from '../../persistence/lead.repository'
import { Clock } from '../clock'
import { LeadJourneyErrorReason } from '../domain/lead-journey-error-reason'
import { LeadJourneyStatus } from '../domain/lead-journey-status'

const MS_PER_MINUTE = 60 * 1000

export interface StartJourneyInput {
  workspaceId: string
  connectorAccountId: string
  connectorId: string
  credentials: unknown
  event: NormalizedEvent
}

interface JourneyDecision {
  ownerUserId: string | null
  errorReason: LeadJourneyErrorReason | null
}

@Injectable()
export class StartJourneyUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly triggers: EntryTriggerRepository,
    private readonly resolver: ResolveOwnerService,
    private readonly leads: LeadRepository,
    private readonly journeys: LeadJourneyRepository,
    private readonly cadences: CadenceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: StartJourneyInput): Promise<void> {
    if (!input.event.stageId) return
    const trigger = await this.triggers.findCadenceByStage(
      input.connectorAccountId,
      input.event.stageId,
    )
    if (!trigger) return

    const { leadId, decision } = await this.upsertLead(input)
    if (await this.journeys.hasNonTerminal(leadId, trigger.cadenceId)) return

    const delayMinutes = (await this.cadences.firstStepDelayMinutes(trigger.cadenceId)) ?? 0
    if (decision.errorReason) {
      await this.journeys.create({
        leadId,
        cadenceId: trigger.cadenceId,
        nextTouchAt: null,
        status: LeadJourneyStatus.ErrorState,
        errorReason: decision.errorReason,
      })
      return
    }
    const nextTouchAt = new Date(this.clock.now().getTime() + delayMinutes * MS_PER_MINUTE)
    await this.journeys.create({ leadId, cadenceId: trigger.cadenceId, nextTouchAt })
  }

  private async upsertLead(
    input: StartJourneyInput,
  ): Promise<{ leadId: string; decision: JourneyDecision }> {
    const connector = this.registry.get(input.connectorId)
    const lead = await connector.fetchLead(input.event.externalId, input.credentials)
    const decision = await this.resolveOwner(input, lead.ownerExternalId)
    const { id } = await this.leads.upsert({
      workspaceId: input.workspaceId,
      connectorAccountId: input.connectorAccountId,
      externalId: input.event.externalId,
      ownerExternalId: lead.ownerExternalId,
      ownerUserId: decision.ownerUserId,
      name: lead.name,
      phone: lead.phone ?? null,
    })
    return { leadId: id, decision }
  }

  private async resolveOwner(
    input: StartJourneyInput,
    ownerExternalId: string | null,
  ): Promise<JourneyDecision> {
    if (!ownerExternalId) {
      return { ownerUserId: null, errorReason: LeadJourneyErrorReason.OwnerNotMapped }
    }
    const result = await this.resolver.resolve({
      workspaceId: input.workspaceId,
      connectorAccountId: input.connectorAccountId,
      connectorId: input.connectorId,
      credentials: input.credentials,
      ownerExternalId,
    })
    if (result.userId === null) return { ownerUserId: null, errorReason: result.errorReason }
    return { ownerUserId: result.userId, errorReason: null }
  }
}
