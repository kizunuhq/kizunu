import type { ChannelDecision } from '../../core/plugin/channel-decision'
import type { ChannelPlugin } from '../../core/plugin/channel-plugin'
import type { ChannelPluginManifest } from '../../core/plugin/channel-plugin-manifest'
import type { InboundMessage } from '../../core/plugin/inbound-message'
import type { SendPayload } from '../../core/plugin/send-payload'
import type { SendResult } from '../../core/plugin/send-result'
import type { ValidateInput } from '../../core/plugin/validate-input'
import { isWithinServiceWindow } from './customer-service-window'
import { metaCredentialsSchema } from './meta-credentials'
import { parseMetaInbound } from './meta-inbound'
import { type FetchFn, META_GRAPH_API_BASE, sendMetaMessage } from './meta-send'

/**
 * Meta Cloud API / WhatsApp channel plugin (via Coexistence, decision D6). Hides
 * Meta's peculiarities behind the frozen port: `validate` resolves freeform vs. HSM
 * template against the 24h customer-service window, `parseInbound` normalizes webhook
 * payloads, and `send` posts to the Graph API. Credentials are validated by the
 * manifest configSchema. `baseUrl`/`fetchFn` are injectable for tests.
 */
export class MetaWhatsappPlugin implements ChannelPlugin {
  readonly manifest: ChannelPluginManifest = {
    id: 'meta-whatsapp',
    name: 'WhatsApp (Meta Cloud API)',
    capabilities: ['freeform', 'template'],
    configSchema: metaCredentialsSchema,
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
}
