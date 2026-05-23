import type { ChannelDecision } from '../../core/plugin/channel-decision'
import type { ChannelPlugin } from '../../core/plugin/channel-plugin'
import type { ChannelPluginManifest } from '../../core/plugin/channel-plugin-manifest'
import type { InboundMessage } from '../../core/plugin/inbound-message'
import type { OnAccountCreatedInput } from '../../core/plugin/on-account-created-input'
import type { RefreshCredentialsInput } from '../../core/plugin/refresh-credentials-input'
import type { SendPayload } from '../../core/plugin/send-payload'
import type { SendResult } from '../../core/plugin/send-result'
import type { ValidateInput } from '../../core/plugin/validate-input'
import { isWithinServiceWindow } from './customer-service-window'
import { exchangeForRefreshedToken } from './meta-coex-token'
import {
  metaCredentialsClientSchema,
  metaCredentialsSchema,
  type MetaCoexistenceCredentials,
  type MetaCredentials,
} from './meta-credentials'
import { parseMetaInbound } from './meta-inbound'
import { type FetchFn, META_GRAPH_API_BASE, sendMetaMessage } from './meta-send'
import { subscribeMetaChannel, subscribeWabaToMeta } from './meta-subscribe'

const COEX_SUBSCRIBED_FIELDS = 'messages,smb_message_echoes,smb_app_state_sync'
const VERIFY_TOKEN_BYTE_LENGTH = 32

/**
 * App-wide Meta credentials read from `meta.*` config; required only when
 * Coex is used (feature 031). Cloud_api operator-paste path does not need
 * them — the operator's appId/appSecret travel on the row.
 */
export interface MetaWhatsappPluginConfig {
  appId: string
  appSecret: string
}

/**
 * Meta Cloud API / WhatsApp channel plugin. Two onboarding modes are supported
 * via the `channelMode` discriminator on the credentials schema:
 *
 * - `cloud_api` (feature 029) — operator pastes WABA + phone + System Token +
 *   App ID/Secret; `onAccountCreated` runs both the app-level and per-WABA
 *   subscription calls.
 *
 * - `coexistence` (feature 031) — operator finishes Embedded Signup; the
 *   connect endpoint exchanges the OAuth code for a business token; this
 *   plugin's `onAccountCreated` only runs the per-WABA subscription
 *   (Meta handles app-level during signup), with Coex subscribed_fields.
 *   `refreshCredentials` rolls the token via long-lived exchange before
 *   expiry.
 *
 * `baseUrl`/`fetchFn` are injectable for tests; `config` carries the app-wide
 * Meta credentials needed in Coex paths.
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
      // The web form filters serverGenerated entries via userInputFields().
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
  private readonly config: MetaWhatsappPluginConfig

  constructor(options?: {
    baseUrl?: string
    fetchFn?: FetchFn
    config?: Partial<MetaWhatsappPluginConfig>
  }) {
    this.baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
    this.fetchFn = options?.fetchFn ?? globalThis.fetch
    this.config = {
      appId: options?.config?.appId ?? '',
      appSecret: options?.config?.appSecret ?? '',
    }
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
    if (isCoexistenceInput(input.credentials)) {
      return await this.onCoexAccountCreated(
        input.appUrl,
        input.channelAccountId,
        input.credentials,
      )
    }
    return await this.onCloudApiAccountCreated(
      input.appUrl,
      input.channelAccountId,
      input.credentials,
    )
  }

  async refreshCredentials(input: RefreshCredentialsInput): Promise<unknown> {
    const parsed = metaCredentialsSchema.parse(input.credentials)
    if (parsed.channelMode !== 'coexistence') return parsed
    const refreshed = await exchangeForRefreshedToken({
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      currentToken: parsed.accessToken,
    })
    return {
      ...parsed,
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
    }
  }

  private async onCloudApiAccountCreated(
    appUrl: string,
    channelAccountId: string,
    rawCredentials: unknown,
  ): Promise<MetaCredentials> {
    const clientCredentials = metaCredentialsClientSchema.parse(rawCredentials)
    const { verifyToken } = await subscribeMetaChannel({
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
      appUrl,
      channelAccountId,
      appId: clientCredentials.appId,
      appSecret: clientCredentials.appSecret,
      wabaId: clientCredentials.wabaId,
      systemToken: clientCredentials.systemToken,
    })
    return { channelMode: 'cloud_api', ...clientCredentials, verifyToken }
  }

  /**
   * Coex onboarding skips the app-level subscription (Meta handles it during
   * Embedded Signup) and only runs the per-WABA `subscribed_apps` override
   * with the Coex subscribed_fields. The connect endpoint has already
   * exchanged the OAuth code for a business token; we just need to wire the
   * verify token and the per-channel callback URL.
   */
  private async onCoexAccountCreated(
    appUrl: string,
    channelAccountId: string,
    input: CoexistenceOnCreateInput,
  ): Promise<MetaCoexistenceCredentials> {
    const verifyToken = await randomVerifyToken()
    const callbackUrl = buildCallbackUrl(appUrl, channelAccountId)
    await subscribeWabaToMeta({
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
      wabaId: input.wabaId,
      systemToken: input.accessToken,
      callbackUrl,
      verifyToken,
      subscribedFields: COEX_SUBSCRIBED_FIELDS,
    })
    return {
      channelMode: 'coexistence',
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      verifyToken,
      accessToken: input.accessToken,
      ...(input.refreshToken === undefined ? {} : { refreshToken: input.refreshToken }),
      ...(input.accessTokenExpiresAt === undefined
        ? {}
        : { accessTokenExpiresAt: input.accessTokenExpiresAt }),
    }
  }
}

interface CoexistenceOnCreateInput {
  channelMode: 'coexistence'
  wabaId: string
  phoneNumberId: string
  accessToken: string
  refreshToken?: string
  accessTokenExpiresAt?: string
}

function isCoexistenceInput(value: unknown): value is CoexistenceOnCreateInput {
  if (!value || typeof value !== 'object' || !('channelMode' in value)) return false
  return value.channelMode === 'coexistence'
}

function buildCallbackUrl(appUrl: string, channelAccountId: string): string {
  const trimmed = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${trimmed}/webhooks/meta/${channelAccountId}`
}

async function randomVerifyToken(): Promise<string> {
  const { randomBytes } = await import('node:crypto')
  return randomBytes(VERIFY_TOKEN_BYTE_LENGTH).toString('hex')
}
