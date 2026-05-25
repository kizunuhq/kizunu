import { Injectable } from '@nestjs/common'

import { LeadJourneyRepository } from '../../persistence/lead-journey.repository'
import { JourneyEvent } from '../domain/journey-event'
import { transition } from '../domain/lead-journey-transition'
import { JourneyNotFoundException } from '../errors/journey.errors'

export const JourneyControlAction = {
  Pause: 'pause',
  Resume: 'resume',
  Stop: 'stop',
} as const
export type JourneyControlAction = (typeof JourneyControlAction)[keyof typeof JourneyControlAction]

const ACTION_TO_EVENT: Record<JourneyControlAction, JourneyEvent> = {
  [JourneyControlAction.Pause]: JourneyEvent.Pause,
  [JourneyControlAction.Resume]: JourneyEvent.Resume,
  [JourneyControlAction.Stop]: JourneyEvent.Stop,
}

export interface ControlJourneyInput {
  workspaceId: string
  journeyId: string
  action: JourneyControlAction
}

@Injectable()
export class ControlJourneyUseCase {
  constructor(private readonly journeys: LeadJourneyRepository) {}

  async execute(input: ControlJourneyInput): Promise<{ id: string; status: string }> {
    const journey = await this.journeys.findInWorkspace(input.journeyId, input.workspaceId)
    if (!journey) throw new JourneyNotFoundException(input.journeyId)
    const nextStatus = transition(journey.status, ACTION_TO_EVENT[input.action])
    // Resume re-runs immediately so the dispatcher picks the journey up on its next tick.
    const nextTouchAt = input.action === JourneyControlAction.Resume ? new Date() : null
    await this.journeys.updateStatus(journey.id, nextStatus, nextTouchAt)
    return { id: journey.id, status: nextStatus }
  }
}
