import { Injectable } from '@nestjs/common'

import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'
import { LeadRepository } from '../../persistence/lead.repository'
import { Clock } from '../clock'

export interface ReassignLeadsInput {
  workspaceId: string
  fromUserId: string
  toUserId: string
}

@Injectable()
export class ReassignLeadsUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly journeys: LeadJourneyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ReassignLeadsInput): Promise<void> {
    await this.leads.reassign(input.workspaceId, input.fromUserId, input.toUserId)
    await this.journeys.resumePausedForOwner(input.workspaceId, input.toUserId, this.clock.now())
  }
}
