import { InvalidJourneyTransitionException } from '../errors/journey.errors'
import { JourneyEvent } from './journey-event'
import { LeadJourneyStatus } from './lead-journey-status'

interface TransitionRule {
  from: LeadJourneyStatus[]
  to: LeadJourneyStatus
}

const { Running, Paused, Replied, Exhausted, Stopped, ErrorState, PausedOwnerInactive } =
  LeadJourneyStatus

/**
 * The LeadJourney state machine (decision D1) as a transition table — a `Record`,
 * not a switch. A reply always stops the cadence; exhaustion/error only apply to a
 * running journey. Any event from a status not in its `from` list is illegal.
 */
const transitions: Record<JourneyEvent, TransitionRule> = {
  [JourneyEvent.Reply]: { from: [Running, Paused, PausedOwnerInactive], to: Replied },
  [JourneyEvent.Exhaust]: { from: [Running], to: Exhausted },
  [JourneyEvent.Error]: { from: [Running], to: ErrorState },
  [JourneyEvent.Pause]: { from: [Running], to: Paused },
  [JourneyEvent.Resume]: { from: [Paused], to: Running },
  [JourneyEvent.Stop]: { from: [Running, Paused, PausedOwnerInactive], to: Stopped },
  [JourneyEvent.OwnerInactive]: { from: [Running], to: PausedOwnerInactive },
  [JourneyEvent.OwnerReactivated]: { from: [PausedOwnerInactive], to: Running },
}

/**
 * Applies an event to a journey status, returning the next status or throwing
 * `InvalidJourneyTransitionException` if the transition is not allowed. Pure.
 */
export function transition(current: LeadJourneyStatus, event: JourneyEvent): LeadJourneyStatus {
  const rule = transitions[event]
  if (!rule.from.includes(current)) throw new InvalidJourneyTransitionException(current, event)
  return rule.to
}
