/**
 * A single inbound message a plugin extracts from a raw webhook payload.
 * `toExternalId` (e.g. Meta's phone_number_id) is what the inbound webhook layer
 * uses to route the message to the right ChannelAccount; the internal
 * channelAccountId is resolved downstream, not produced by the plugin.
 */
export interface InboundMessage {
  externalMessageId: string
  fromExternalId: string
  toExternalId: string
  body: string
  ts: Date
}
