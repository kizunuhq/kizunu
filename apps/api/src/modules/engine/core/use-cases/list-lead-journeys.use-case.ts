import { Injectable } from '@nestjs/common'

import {
  type LeadJourneySummary,
  LeadJourneyRepository,
} from '../../persistence/lead-journey.repository'
import type { LeadJourneyStatus } from '../domain/lead-journey-status'

@Injectable()
export class ListLeadJourneysUseCase {
  constructor(private readonly journeys: LeadJourneyRepository) {}

  async execute(workspaceId: string, status?: LeadJourneyStatus): Promise<LeadJourneySummary[]> {
    return await this.journeys.listByWorkspace(workspaceId, status)
  }
}
