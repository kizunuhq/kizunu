import { ApplicationException } from '@kizunu/nestjs-shared/lib/exceptions/application.exception'

import type { JourneyEvent } from '../domain/journey-event'
import type { LeadJourneyStatus } from '../domain/lead-journey-status'

export class InvalidJourneyTransitionException extends ApplicationException {
  constructor(from: LeadJourneyStatus, event: JourneyEvent) {
    super('journey.invalid-transition', 'That journey transition is not allowed.', 422, {
      from,
      event,
    })
  }
}

export class JourneyNotFoundException extends ApplicationException {
  constructor(journeyId: string) {
    super('journey.not-found', 'No journey found for that id in this workspace.', 404, {
      journeyId,
    })
  }
}
