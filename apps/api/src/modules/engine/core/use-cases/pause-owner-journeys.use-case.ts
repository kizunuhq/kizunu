import { Injectable } from '@nestjs/common'

import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'

@Injectable()
export class PauseOwnerJourneysUseCase {
  constructor(private readonly journeys: LeadJourneyRepository) {}

  async execute(workspaceId: string, ownerUserId: string): Promise<void> {
    await this.journeys.pauseRunningForOwner(workspaceId, ownerUserId)
  }
}
