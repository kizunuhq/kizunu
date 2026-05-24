import { Clock } from '@kizunu/api/modules/engine/core/clock'
import { LeadJourneyErrorReason } from '@kizunu/api/modules/engine/core/domain/lead-journey-error-reason'
import { LeadJourneyRepository } from '@kizunu/api/modules/engine/persistence/lead-journey.repository'
import { LeadRepository } from '@kizunu/api/modules/engine/persistence/lead.repository'
import type { DbTransaction } from '@kizunu/api/modules/engine/persistence/transaction'
import { Injectable } from '@nestjs/common'

export interface LeadOwnerBackfillInput {
  connectorAccountId: string
  externalId: string
  userId: string
}

export interface LeadOwnerBackfillResult {
  leadsUpdated: number
  journeysResumed: number
}

@Injectable()
export class LeadOwnerBackfillService {
  constructor(
    private readonly leads: LeadRepository,
    private readonly journeys: LeadJourneyRepository,
    private readonly clock: Clock,
  ) {}

  async backfillFor(
    tx: DbTransaction,
    input: LeadOwnerBackfillInput,
  ): Promise<LeadOwnerBackfillResult> {
    const { leadIds } = await this.leads.backfillOwnerUserId(tx, {
      connectorAccountId: input.connectorAccountId,
      ownerExternalId: input.externalId,
      ownerUserId: input.userId,
    })
    if (leadIds.length === 0) return { leadsUpdated: 0, journeysResumed: 0 }
    const { updated } = await this.journeys.resumeErrorStateByLeadsAndReason(tx, {
      leadIds,
      reason: LeadJourneyErrorReason.OwnerNotMapped,
      nextTouchAt: this.clock.now(),
    })
    return { leadsUpdated: leadIds.length, journeysResumed: updated }
  }
}
