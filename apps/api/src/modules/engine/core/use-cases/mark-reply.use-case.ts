import { CadenceRepository } from '@kizunu/api/modules/cadence/persistence/cadence.repository'
import { ConnectorAccountRepository } from '@kizunu/api/modules/crm/persistence/connector-account.repository'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'

import {
  type LockedJourney,
  LeadJourneyRepository,
} from '../../persistence/lead-journey.repository'
import { JourneyEvent } from '../domain/journey-event'
import { LeadJourneyStatus } from '../domain/lead-journey-status'
import { transition } from '../domain/lead-journey-transition'
import { CadenceActionExecutor } from '../services/cadence-action-executor'

export interface MarkReplyInput {
  workspaceId: string
  phone: string
}

@Injectable()
export class MarkReplyUseCase {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly journeys: LeadJourneyRepository,
    private readonly cadences: CadenceRepository,
    private readonly connectors: ConnectorAccountRepository,
    private readonly executor: CadenceActionExecutor,
  ) {}

  async execute(input: MarkReplyInput): Promise<void> {
    const target = await this.journeys.findRunningByLeadPhone(input.workspaceId, input.phone)
    if (!target) return

    // Take the row lock only for the state change (D1 race); the journey commits as
    // `replied`, so the dispatcher skips it. onReply runs after commit, off the lock.
    const replied = await this.drizzle.db.transaction(async (tx) => {
      const journey = await this.journeys.lockById(tx, target.id)
      if (!journey || journey.status !== LeadJourneyStatus.Running) return undefined
      await this.journeys.setStatus(tx, journey.id, transition(journey.status, JourneyEvent.Reply))
      return journey
    })
    if (replied) await this.runReplyActions(replied)
  }

  private async runReplyActions(journey: LockedJourney): Promise<void> {
    const cadence = await this.cadences.getWithSteps(journey.cadenceId, journey.workspaceId)
    const account = await this.connectors.findById(journey.connectorAccountId)
    if (!cadence || !account || cadence.onReply.length === 0) return
    await this.executor.execute(cadence.onReply, {
      connectorId: account.connectorId,
      credentials: account.credentials,
      externalId: journey.leadExternalId,
    })
  }
}
