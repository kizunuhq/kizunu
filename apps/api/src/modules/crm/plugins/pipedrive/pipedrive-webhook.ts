import type { NormalizedEvent } from '../../core/connector/normalized-event'

const MS_PER_SECOND = 1000

interface PipedriveDeal {
  id?: number | string
  stage_id?: number | string
  user_id?: number | string
}

interface PipedriveMeta {
  action?: string
  object?: string
  timestamp?: number | string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDealUpdate(meta: PipedriveMeta | undefined): boolean {
  if (!meta) return true
  if (typeof meta.object === 'string' && meta.object !== 'deal') return false
  return true
}

function toOccurredAt(timestamp: number | string | undefined): Date {
  if (timestamp === undefined) return new Date()
  return new Date(Number(timestamp) * MS_PER_SECOND)
}

/**
 * Normalizes a Pipedrive `deal.updated` webhook into a `lead.stage_entered` event,
 * but only when the deal's `stage_id` actually changed. Returns `[]` for no-op
 * updates, non-deal objects, or malformed bodies — never throws.
 */
export function parsePipedriveWebhook(raw: unknown): NormalizedEvent[] {
  if (!isObject(raw) || !isObject(raw.current) || !isObject(raw.previous)) return []
  const meta = isObject(raw.meta) ? (raw.meta as PipedriveMeta) : undefined
  if (!isDealUpdate(meta)) return []

  const current = raw.current as PipedriveDeal
  const previous = raw.previous as PipedriveDeal
  if (current.stage_id == null || current.stage_id === previous.stage_id) return []

  const dealId = String(current.id ?? meta?.action ?? '')
  const event = meta?.action ?? 'updated'
  const timestamp = meta?.timestamp
  return [
    {
      type: 'lead.stage_entered',
      externalId: dealId,
      ownerExternalId: current.user_id == null ? null : String(current.user_id),
      occurredAt: toOccurredAt(timestamp),
      stageId: String(current.stage_id),
      idempotencyKey: `pipedrive:deal:${dealId}:event:${event}:${timestamp ?? ''}`,
      raw,
    },
  ]
}
