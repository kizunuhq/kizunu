/**
 * The execution status of a LeadJourney (decision D1). The domain owns this
 * vocabulary; the `lead_journeys` pgEnum (added with the ingestion slice) conforms
 * to it via a compile-time `Assert<Equal<...>>` guard.
 */
export const LeadJourneyStatus = {
  Running: 'running',
  Paused: 'paused',
  Replied: 'replied',
  Exhausted: 'exhausted',
  Stopped: 'stopped',
  ErrorState: 'error_state',
  PausedOwnerInactive: 'paused_owner_inactive',
} as const

export type LeadJourneyStatus = (typeof LeadJourneyStatus)[keyof typeof LeadJourneyStatus]
