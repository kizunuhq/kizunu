import {
  metaCredentialsClientSchema,
  metaCredentialsSchema,
  type MetaCoexistenceCredentials,
  type MetaCredentials,
  type MetaCredentialsClientInput,
} from '@kizunu/api-contracts/channel'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'

import { ChannelCapability } from '../../core/plugin/channel-capability'
import type { ChannelPlugin } from '../../core/plugin/channel-plugin'
import { defineChannelPlugin } from '../../core/plugin/define-channel-plugin'
import { isWithinServiceWindow } from './customer-service-window'
import { exchangeForRefreshedToken } from './meta-coex-token'
import { listMetaPhoneNumbers, listMetaTemplates } from './meta-directory'
import { parseMetaInbound } from './meta-inbound'
import { type FetchFn, META_GRAPH_API_BASE, sendMetaMessage } from './meta-send'
import { subscribeMetaChannel, subscribeWabaToMeta } from './meta-subscribe'

const TEMPLATES_TTL_MS = 30_000

const COEX_SUBSCRIBED_FIELDS = 'messages,smb_message_echoes,smb_app_state_sync'
const VERIFY_TOKEN_BYTE_LENGTH = 32

/**
 * App-wide Meta credentials read from `meta.*` config; required only when
 * Coex is used. The cloud_api operator-paste path does not need them — the
 * operator's appId/appSecret travel on the row.
 */
export interface MetaWhatsappPluginConfig {
  appId: string
  appSecret: string
}

export interface MetaWhatsappPluginOptions {
  baseUrl?: string
  fetchFn?: FetchFn
  config?: Partial<MetaWhatsappPluginConfig>
}

/**
 * Meta Cloud API / WhatsApp channel plugin. Two onboarding modes are supported
 * via the `channelMode` discriminator on the credentials schema:
 *
 * - `cloud_api` — operator pastes WABA + phone + System Token + App ID/Secret;
 *   `onAccountCreated` runs both the app-level and per-WABA subscription calls.
 *
 * - `coexistence` — operator finishes Embedded Signup; the connect endpoint
 *   exchanges the OAuth code for a business token; this plugin's
 *   `onAccountCreated` only runs the per-WABA subscription (Meta handles
 *   app-level during signup), with Coex subscribed_fields.
 *   `refreshCredentials` rolls the token via long-lived exchange before expiry.
 *
 * `baseUrl`/`fetchFn` are injectable for tests; `config` carries the app-wide
 * Meta credentials needed in Coex paths. The plugin is built via
 * `defineChannelPlugin(...)` so every credential-touching method receives
 * already-parsed `MetaCredentials` from the registry seam.
 */
export function buildMetaWhatsappPlugin(
  options?: MetaWhatsappPluginOptions,
): ChannelPlugin<typeof metaCredentialsSchema> {
  const baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
  const fetchFn = options?.fetchFn ?? globalThis.fetch
  const config: MetaWhatsappPluginConfig = {
    appId: options?.config?.appId ?? '',
    appSecret: options?.config?.appSecret ?? '',
  }

  return defineChannelPlugin({
    manifest: {
      id: 'meta-whatsapp',
      name: 'WhatsApp (Meta Cloud API)',
      capabilities: [ChannelCapability.Freeform, ChannelCapability.Template],
      configSchema: metaCredentialsSchema,
      inputSchema: metaCredentialsClientSchema,
      directoryResources: [
        { name: 'templates', ttlMs: TEMPLATES_TTL_MS },
        { name: 'phoneNumbers' },
      ],
    },
    validate(input) {
      if (isWithinServiceWindow(input.now, input.lastInboundAt)) {
        return { action: 'send', mode: 'freeform' }
      }
      if (input.hasApprovedTemplate) {
        return { action: 'send', mode: 'template' }
      }
      return { action: 'error', reason: 'template_required' }
    },
    async parseInbound(raw) {
      return parseMetaInbound(raw)
    },
    async send(payload, credentials) {
      return sendMetaMessage({ payload, credentials, baseUrl, fetchFn })
    },
    async directory(input) {
      const ctx = {
        fetchFn,
        baseUrl,
        accountId: input.accountId,
        credentials: input.credentials,
      }
      if (input.resource === 'templates') return listMetaTemplates(ctx)
      if (input.resource === 'phoneNumbers') return listMetaPhoneNumbers(ctx)
      throw new ConnectorDirectoryUnsupportedException({
        connectorId: 'meta-whatsapp',
        resource: input.resource,
      })
    },
    async refreshCredentials({ credentials }) {
      if (credentials.channelMode !== 'coexistence') return credentials
      const refreshed = await exchangeForRefreshedToken({
        baseUrl,
        fetchFn,
        appId: config.appId,
        appSecret: config.appSecret,
        currentToken: credentials.accessToken,
      })
      return {
        ...credentials,
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      }
    },
    async onAccountCreated({ channelAccountId, appUrl, credentials }) {
      if (isCoexistenceInput(credentials)) {
        return onCoexAccountCreated({
          baseUrl,
          fetchFn,
          appUrl,
          channelAccountId,
          credentials,
        })
      }
      const clientCredentials = metaCredentialsClientSchema.parse(credentials)
      return onCloudApiAccountCreated({
        baseUrl,
        fetchFn,
        appUrl,
        channelAccountId,
        credentials: clientCredentials,
      })
    },
  })
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
  return (value as { channelMode: unknown }).channelMode === 'coexistence'
}

interface OnCreateCloudApiInput {
  baseUrl: string
  fetchFn: FetchFn
  appUrl: string
  channelAccountId: string
  credentials: MetaCredentialsClientInput
}

async function onCloudApiAccountCreated(input: OnCreateCloudApiInput): Promise<MetaCredentials> {
  const { verifyToken } = await subscribeMetaChannel({
    baseUrl: input.baseUrl,
    fetchFn: input.fetchFn,
    appUrl: input.appUrl,
    channelAccountId: input.channelAccountId,
    appId: input.credentials.appId,
    appSecret: input.credentials.appSecret,
    wabaId: input.credentials.wabaId,
    systemToken: input.credentials.systemToken,
  })
  return { channelMode: 'cloud_api', ...input.credentials, verifyToken }
}

interface OnCreateCoexInput {
  baseUrl: string
  fetchFn: FetchFn
  appUrl: string
  channelAccountId: string
  credentials: CoexistenceOnCreateInput
}

/**
 * Coex onboarding skips the app-level subscription (Meta handles it during
 * Embedded Signup) and only runs the per-WABA `subscribed_apps` override with
 * the Coex subscribed_fields. The connect endpoint has already exchanged the
 * OAuth code for a business token; we just need to wire the verify token and
 * the per-channel callback URL.
 */
async function onCoexAccountCreated(input: OnCreateCoexInput): Promise<MetaCoexistenceCredentials> {
  const verifyToken = await randomVerifyToken()
  const callbackUrl = buildCallbackUrl(input.appUrl, input.channelAccountId)
  await subscribeWabaToMeta({
    baseUrl: input.baseUrl,
    fetchFn: input.fetchFn,
    wabaId: input.credentials.wabaId,
    systemToken: input.credentials.accessToken,
    callbackUrl,
    verifyToken,
    subscribedFields: COEX_SUBSCRIBED_FIELDS,
  })
  return {
    channelMode: 'coexistence',
    wabaId: input.credentials.wabaId,
    phoneNumberId: input.credentials.phoneNumberId,
    verifyToken,
    accessToken: input.credentials.accessToken,
    ...(input.credentials.refreshToken === undefined
      ? {}
      : { refreshToken: input.credentials.refreshToken }),
    ...(input.credentials.accessTokenExpiresAt === undefined
      ? {}
      : { accessTokenExpiresAt: input.credentials.accessTokenExpiresAt }),
  }
}

function buildCallbackUrl(appUrl: string, channelAccountId: string): string {
  const trimmed = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${trimmed}/webhooks/meta/${channelAccountId}`
}

async function randomVerifyToken(): Promise<string> {
  const { randomBytes } = await import('node:crypto')
  return randomBytes(VERIFY_TOKEN_BYTE_LENGTH).toString('hex')
}
