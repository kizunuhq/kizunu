import type { InboundMessage } from '../../core/plugin/inbound-message'

const MS_PER_SECOND = 1000

interface MetaTextMessage {
  id?: string
  from?: string
  to?: string
  timestamp?: string
  text?: { body?: string }
}

interface MetaChangeValue {
  metadata?: { phone_number_id?: string }
  messages?: MetaTextMessage[]
  message_echoes?: MetaTextMessage[]
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

function collectMessages(value: MetaChangeValue): InboundMessage[] {
  const phoneNumberId = value.metadata?.phone_number_id
  if (!phoneNumberId || !Array.isArray(value.messages)) return []
  return value.messages
    .map((message) => toInbound(message, phoneNumberId))
    .filter((message): message is InboundMessage => message !== undefined)
}

/**
 * Coex `smb_message_echoes` payload (research §D.5): each echo carries `from`
 * (business owner — the merchant phone) and `to` (the customer). For
 * `MarkReplyUseCase` the routing key is the CUSTOMER phone (we want to pause
 * the cadence FOR THAT CUSTOMER), so swap them — `fromExternalId = echo.to`
 * (customer) and `toExternalId = echo.from` (business). Echoes are intentionally
 * not advancing any `lastInboundAt` semantic because they do not open the
 * 24-hour service window (section E.4).
 */
function collectEchoes(value: MetaChangeValue): InboundMessage[] {
  if (!Array.isArray(value.message_echoes)) return []
  return value.message_echoes
    .map((echo) => toEcho(echo))
    .filter((message): message is InboundMessage => message !== undefined)
}

function toEcho(echo: MetaTextMessage): InboundMessage | undefined {
  const body = echo.text?.body
  if (!echo.id || !echo.from || !echo.to || !echo.timestamp || body === undefined) {
    return undefined
  }
  return {
    externalMessageId: echo.id,
    fromExternalId: echo.to,
    toExternalId: echo.from,
    body,
    ts: new Date(Number(echo.timestamp) * MS_PER_SECOND),
  }
}

const FIELD_HANDLERS: Record<string, (value: MetaChangeValue) => InboundMessage[]> = {
  messages: collectMessages,
  smb_message_echoes: collectEchoes,
  // Other Coex fields (`smb_app_state_sync`, `history`, …) are intentionally
  // 200-ack-only: parsed payload exists but does not become an InboundMessage
  // until the inbox / contacts store lands.
}

/**
 * Maps a Meta WhatsApp webhook payload to normalized inbound messages. Walks the
 * shape defensively and returns `[]` for status-only or malformed bodies — a
 * webhook handler must always be able to acknowledge with 200, so this never throws.
 * Dispatches by `change.field` so Coex's `smb_message_echoes` route to MarkReply
 * the same way regular customer messages do.
 */
export function parseMetaInbound(raw: unknown): InboundMessage[] {
  if (!isObject(raw) || !Array.isArray(raw.entry)) return []
  const messages: InboundMessage[] = []
  for (const entry of raw.entry) {
    if (!isObject(entry) || !Array.isArray(entry.changes)) continue
    for (const change of entry.changes) {
      if (!isObject(change) || !isObject(change.value)) continue
      const field = typeof change.field === 'string' ? change.field : 'messages'
      const handler = FIELD_HANDLERS[field]
      if (handler) messages.push(...handler(change.value as MetaChangeValue))
    }
  }
  return messages
}
