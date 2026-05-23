import type { ChannelDecision } from '../../core/plugin/channel-decision'
import type { ChannelPlugin } from '../../core/plugin/channel-plugin'
import type { ChannelPluginManifest } from '../../core/plugin/channel-plugin-manifest'
import type { InboundMessage } from '../../core/plugin/inbound-message'
import type { OnAccountCreatedInput } from '../../core/plugin/on-account-created-input'
import type { SendPayload } from '../../core/plugin/send-payload'
import type { SendResult } from '../../core/plugin/send-result'
import type { ValidateInput } from '../../core/plugin/validate-input'
import { isWithinServiceWindow } from './customer-service-window'
import { metaCredentialsClientSchema, metaCredentialsSchema } from './meta-credentials'
import { parseMetaInbound } from './meta-inbound'
import { type FetchFn, META_GRAPH_API_BASE, sendMetaMessage } from './meta-send'
import { subscribeMetaChannel } from './meta-subscribe'

/**
 * Meta Cloud API / WhatsApp channel plugin (via Coexistence, decision D6). Hides
 * Meta's peculiarities behind the frozen port: `validate` resolves freeform vs. HSM
 * template against the 24h customer-service window, `parseInbound` normalizes webhook
 * payloads, and `send` posts to the Graph API. The manifest `configSchema` accepts
 * the operator's 5 fields; `onAccountCreated` runs Meta's two-step webhook
 * subscription (feature 029) and returns the 6-field credentials that get
 * persisted. `baseUrl`/`fetchFn` are injectable for tests.
 */
export class MetaWhatsappPlugin implements ChannelPlugin {
  readonly manifest: ChannelPluginManifest = {
    id: 'meta-whatsapp',
    name: 'WhatsApp (Meta Cloud API)',
    capabilities: ['freeform', 'template'],
    configSchema: metaCredentialsClientSchema,
    credentialFields: [
      { key: 'appId', label: 'Meta App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'Meta App Secret', type: 'secret', required: true },
      { key: 'wabaId', label: 'WABA ID', type: 'text', required: true },
      { key: 'phoneNumberId', label: 'Phone number ID', type: 'text', required: true },
      { key: 'systemToken', label: 'System token', type: 'secret', required: true },
      // Generated server-side during onAccountCreated, never operator-supplied.
      {
        key: 'verifyToken',
        label: 'Verify token',
        type: 'secret',
        required: true,
        serverGenerated: true,
      },
    ],
  }

  private readonly baseUrl: string
  private readonly fetchFn: FetchFn

  constructor(options?: { baseUrl?: string; fetchFn?: FetchFn }) {
    this.baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
    this.fetchFn = options?.fetchFn ?? globalThis.fetch
  }

  validate(input: ValidateInput): ChannelDecision {
    if (isWithinServiceWindow(input.now, input.lastInboundAt)) {
      return { action: 'send', mode: 'freeform' }
    }
    if (input.hasApprovedTemplate) {
      return { action: 'send', mode: 'template' }
    }
    return { action: 'error', reason: 'template_required' }
  }

  async parseInbound(raw: unknown): Promise<InboundMessage[]> {
    return parseMetaInbound(raw)
  }

  async send(payload: SendPayload, credentials: unknown): Promise<SendResult> {
    const parsed = metaCredentialsSchema.parse(credentials)
    return await sendMetaMessage({
      payload,
      credentials: parsed,
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
    })
  }

  async onAccountCreated(input: OnAccountCreatedInput): Promise<unknown> {
    const clientCredentials = metaCredentialsClientSchema.parse(input.credentials)
    const { verifyToken } = await subscribeMetaChannel({
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
      appUrl: input.appUrl,
      channelAccountId: input.channelAccountId,
      appId: clientCredentials.appId,
      appSecret: clientCredentials.appSecret,
      wabaId: clientCredentials.wabaId,
      systemToken: clientCredentials.systemToken,
    })
    return { ...clientCredentials, verifyToken }
  }
}
