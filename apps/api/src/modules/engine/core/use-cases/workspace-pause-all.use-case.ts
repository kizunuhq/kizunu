import { Injectable } from '@nestjs/common'

import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'

@Injectable()
export class WorkspacePauseAllUseCase {
  constructor(private readonly journeys: LeadJourneyRepository) {}

  async execute(workspaceId: string): Promise<void> {
    await this.journeys.pauseAllRunningInWorkspace(workspaceId)
  }
}
