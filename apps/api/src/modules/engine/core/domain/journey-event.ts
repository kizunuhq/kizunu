/**
 * Events that drive LeadJourney status transitions. The engine raises these from the
 * scheduler (exhaust/error), inbound handler (reply), and admin actions (pause/resume/
 * stop, owner_inactive/owner_reactivated).
 */
export const JourneyEvent = {
  Reply: 'reply',
  Exhaust: 'exhaust',
  Error: 'error',
  Pause: 'pause',
  Resume: 'resume',
  Stop: 'stop',
  OwnerInactive: 'owner_inactive',
  OwnerReactivated: 'owner_reactivated',
} as const

export type JourneyEvent = (typeof JourneyEvent)[keyof typeof JourneyEvent]
