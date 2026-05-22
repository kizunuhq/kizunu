import type { InboundMessage } from '../../core/plugin/inbound-message'

const MS_PER_SECOND = 1000

interface MetaTextMessage {
  id?: string
  from?: string
  timestamp?: string
  text?: { body?: string }
}

interface MetaChangeValue {
  metadata?: { phone_number_id?: string }
  messages?: MetaTextMessage[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toInbound(message: MetaTextMessage, toExternalId: string): InboundMessage | undefined {
  const body = message.text?.body
  if (!message.id || !message.from || !message.timestamp || body === undefined) return undefined
  return {
    externalMessageId: message.id,
    fromExternalId: message.from,
    toExternalId,
    body,
    ts: new Date(Number(message.timestamp) * MS_PER_SECOND),
  }
}

function collectFromValue(value: MetaChangeValue): InboundMessage[] {
  const phoneNumberId = value.metadata?.phone_number_id
  if (!phoneNumberId || !Array.isArray(value.messages)) return []
  return value.messages
    .map((message) => toInbound(message, phoneNumberId))
    .filter((message): message is InboundMessage => message !== undefined)
}

/**
 * Maps a Meta WhatsApp webhook payload to normalized inbound messages. Walks the
 * shape defensively and returns `[]` for status-only or malformed bodies — a
 * webhook handler must always be able to acknowledge with 200, so this never throws.
 */
export function parseMetaInbound(raw: unknown): InboundMessage[] {
  if (!isObject(raw) || !Array.isArray(raw.entry)) return []
  const messages: InboundMessage[] = []
  for (const entry of raw.entry) {
    if (!isObject(entry) || !Array.isArray(entry.changes)) continue
    for (const change of entry.changes) {
      if (!isObject(change) || !isObject(change.value)) continue
      messages.push(...collectFromValue(change.value as MetaChangeValue))
    }
  }
  return messages
}
