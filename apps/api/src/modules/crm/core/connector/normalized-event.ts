import type { CrmEventType } from './crm-event-type'

/**
 * A CRM webhook event normalized to the internal vocabulary. `idempotencyKey`
 * deduplicates redeliveries; `stageId` is the stage just entered (for
 * `lead.stage_entered`); `raw` keeps the original payload for debugging.
 */
export interface NormalizedEvent {
  type: CrmEventType
  externalId: string
  ownerExternalId: string | null
  occurredAt: Date
  idempotencyKey: string
  stageId?: string
  raw: unknown
}
