import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import type { DirectoryInput } from '@kizunu/api/modules/_shared/directory/directory-input'
import type { ZodType, z } from 'zod'

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
 * Telegram/email/SMS) implement this as in-monorepo modules; the engine depends
 * on this contract alone and never on a provider's specifics. `validate` is a
 * pure, synchronous decision; `send` and `parseInbound` touch the network.
 *
 * `S` is the plugin's **stored credentials schema**. `send`, `parseInbound`,
 * `directory`, and `refreshCredentials` receive `z.infer<S>` — already parsed
 * by the registry seam against the manifest's `configSchema`. Plugin
 * implementations don't re-parse.
 *
 * `I` is the plugin's **operator-input credentials schema**, defaulting to `S`
 * when create-time input matches the stored shape. `onAccountCreated`
 * receives `z.infer<I>` (typed by the registry's `validateCredentials`) and
 * returns `z.infer<S>` — the registry validates the return against
 * `configSchema` before persistence so a buggy hook surfaces as 422.
 *
 * `refreshCredentials` is an OPTIONAL token-refresh hook called by
 * `OAuthRefreshService` when the plugin's stored `accessTokenExpiresAt` is
 * within the refresh window. Plugins whose provider uses static API tokens
 * (Pipedrive, Meta standalone Cloud API system token) leave this absent.
 */
export interface ChannelPlugin<S extends ZodType = ZodType, I extends ZodType = S> {
  readonly manifest: ChannelPluginManifest<S, I>
  send(payload: SendPayload, credentials: z.infer<S>): Promise<SendResult>
  parseInbound(raw: unknown, credentials: z.infer<S>): Promise<InboundMessage[]>
  validate(input: ValidateInput): ChannelDecision
  onAccountCreated?(input: OnAccountCreatedInput<z.infer<I>>): Promise<z.infer<S>>
  refreshCredentials?(input: RefreshCredentialsInput<z.infer<S>>): Promise<z.infer<S>>
  directory?(input: DirectoryInput<z.infer<S>>): Promise<DirectoryResult>
}
