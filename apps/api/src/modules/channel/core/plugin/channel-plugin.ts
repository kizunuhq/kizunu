import type { ChannelDecision } from './channel-decision'
import type { ChannelPluginManifest } from './channel-plugin-manifest'
import type { InboundMessage } from './inbound-message'
import type { SendPayload } from './send-payload'
import type { SendResult } from './send-result'
import type { ValidateInput } from './validate-input'

/**
 * The frozen channel plugin port (decision D2). Channels (Meta/WhatsApp, future
 * Telegram/email/SMS) implement this as in-monorepo modules; the engine depends on
 * this contract alone and never on a provider's specifics. `validate` is a pure,
 * synchronous decision; `send` and `parseInbound` touch the network. `credentials`
 * is opaque at the port — each plugin narrows it via its own `configSchema`.
 */
export interface ChannelPlugin {
  readonly manifest: ChannelPluginManifest
  send(payload: SendPayload, credentials: unknown): Promise<SendResult>
  parseInbound(raw: unknown, credentials: unknown): Promise<InboundMessage[]>
  validate(input: ValidateInput): ChannelDecision
}
