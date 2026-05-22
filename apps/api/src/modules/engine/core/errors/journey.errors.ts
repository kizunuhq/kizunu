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
