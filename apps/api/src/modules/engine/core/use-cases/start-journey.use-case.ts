import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { CrmConnectorRegistry } from '@kizunu/api/modules/crm/core/connector/crm-connector-registry'
import type { NormalizedEvent } from '@kizunu/api/modules/crm/core/connector/normalized-event'
import { Injectable } from '@nestjs/common'

import { EntryTriggerRepository } from '../../persistence/entry-trigger.repository'
import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'
import { LeadRepository } from '../../persistence/lead.repository'
import { Clock } from '../clock'

const MS_PER_MINUTE = 60 * 1000

export interface StartJourneyInput {
  workspaceId: string
  connectorAccountId: string
  connectorId: string
  credentials: unknown
  event: NormalizedEvent
}

@Injectable()
export class StartJourneyUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly triggers: EntryTriggerRepository,
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

    const leadId = await this.upsertLead(input)
    if (await this.journeys.hasNonTerminal(leadId, trigger.cadenceId)) return

    const delayMinutes = (await this.cadences.firstStepDelayMinutes(trigger.cadenceId)) ?? 0
    const nextTouchAt = new Date(this.clock.now().getTime() + delayMinutes * MS_PER_MINUTE)
    await this.journeys.create({ leadId, cadenceId: trigger.cadenceId, nextTouchAt })
  }

  private async upsertLead(input: StartJourneyInput): Promise<string> {
    const connector = this.registry.get(input.connectorId)
    const lead = await connector.fetchLead(input.event.externalId, input.credentials)
    const { id } = await this.leads.upsert({
      workspaceId: input.workspaceId,
      connectorAccountId: input.connectorAccountId,
      externalId: input.event.externalId,
      ownerExternalId: lead.ownerExternalId,
      name: lead.name,
      phone: lead.phone ?? null,
    })
    return id
  }
}
