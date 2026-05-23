import type { ChannelDecision } from './channel-decision'
import type { ChannelPluginManifest } from './channel-plugin-manifest'
import type { InboundMessage } from './inbound-message'
import type { OnAccountCreatedInput } from './on-account-created-input'
import type { RefreshCredentialsInput } from './refresh-credentials-input'
import type { SendPayload } from './send-payload'
import type { SendResult } from './send-result'
import type { ValidateInput } from './validate-input'

/**
 * The frozen channel plugin port (decision D2). Channels (Meta/WhatsApp, future
 * Telegram/email/SMS) implement this as in-monorepo modules; the engine depends on
 * this contract alone and never on a provider's specifics. `validate` is a pure,
 * synchronous decision; `send` and `parseInbound` touch the network. `credentials`
 * is opaque at the port — each plugin narrows it via its own `configSchema`.
 *
 * `onAccountCreated` is an OPTIONAL post-validation hook for plugins whose
 * provider requires out-of-band setup (e.g. Meta's two-step webhook subscription
 * — feature 029). The use-case calls it after credential validation and before
 * persistence; the returned credentials replace the input on the row, so the
 * plugin can stamp in server-generated fields (per-channel verify tokens). The
 * hook may throw an `ApplicationException` to fail the create cleanly.
 *
 * `refreshCredentials` is an OPTIONAL token-refresh hook (feature 030) called
 * by `OAuthRefreshService` when the plugin's stored `accessTokenExpiresAt` is
 * within the refresh window. It returns the refreshed credentials kizunu
 * should persist. Plugins whose provider uses static API tokens
 * (Pipedrive, Meta standalone Cloud API system token) leave this absent.
 */
export interface ChannelPlugin {
  readonly manifest: ChannelPluginManifest
  send(payload: SendPayload, credentials: unknown): Promise<SendResult>
  parseInbound(raw: unknown, credentials: unknown): Promise<InboundMessage[]>
  validate(input: ValidateInput): ChannelDecision
  onAccountCreated?(input: OnAccountCreatedInput): Promise<unknown>
  refreshCredentials?(input: RefreshCredentialsInput): Promise<unknown>
}
