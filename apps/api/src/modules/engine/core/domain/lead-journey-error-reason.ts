/**
 * The why-of-error_state vocabulary the engine itself emits. The `lead_journeys`
 * `error_reason` column is a free `varchar(80)` so plugins outside the engine may
 * emit reasons not listed here; this const object is the engine's own source of
 * truth, used at the call sites the engine controls (dispatcher, ingestion).
 */
export const LeadJourneyErrorReason = {
  NoChannel: 'no_channel',
  TemplateRequired: 'template_required',
  OwnerNotMapped: 'owner_not_mapped',
  OwnerLookupFailed: 'owner_lookup_failed',
} as const

export type LeadJourneyErrorReason =
  (typeof LeadJourneyErrorReason)[keyof typeof LeadJourneyErrorReason]
