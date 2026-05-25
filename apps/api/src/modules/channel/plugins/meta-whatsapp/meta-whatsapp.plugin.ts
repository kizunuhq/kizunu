import {
  metaCredentialsClientSchema,
  metaCredentialsSchema,
  type MetaCoexistenceCredentials,
  type MetaCredentials,
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
 * Meta Cloud API / WhatsApp channel plugin. Built via `defineChannelPlugin`
 * with two schemas:
 *
 * - `configSchema = metaCredentialsSchema` — the stored shape, a discriminated
 *   union over `channelMode` (`cloud_api` | `coexistence`). Downstream methods
 *   (`send`, `parseInbound`, `directory`, `refreshCredentials`) receive this
 *   typed value from the registry.
 * - `inputSchema = metaCredentialsClientSchema` — the cloud_api operator-input
 *   shape (App ID/Secret + WABA + phone + System Token, no discriminator, no
 *   verifyToken). `onAccountCreated` receives this typed; it appends
 *   `channelMode: 'cloud_api'` + the server-generated `verifyToken` and
 *   returns the full stored shape.
 *
 * Coexistence onboarding (Embedded Signup) does NOT flow through
 * `onAccountCreated`. Its credentials are constructed server-side by the
 * connect endpoint, which then calls {@link finalizeMetaCoexConnection}
 * directly to run the per-WABA subscription and stamp the verifyToken.
 *
 * `baseUrl`/`fetchFn` are injectable for tests; `config` carries the app-wide
 * Meta credentials needed when refreshing Coex tokens.
 */
export function buildMetaWhatsappPlugin(
  options?: MetaWhatsappPluginOptions,
): ChannelPlugin<typeof metaCredentialsSchema, typeof metaCredentialsClientSchema> {
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
      const { verifyToken } = await subscribeMetaChannel({
        baseUrl,
        fetchFn,
        appUrl,
        channelAccountId,
        appId: credentials.appId,
        appSecret: credentials.appSecret,
        wabaId: credentials.wabaId,
        systemToken: credentials.systemToken,
      })
      return { channelMode: 'cloud_api', ...credentials, verifyToken }
    },
  })
}

/**
 * Coexistence-onboarding hook for `ConnectMetaCoexUseCase`. Runs the per-WABA
 * `subscribed_apps` override with the Coex subscribed_fields and stamps a
 * fresh verifyToken on the row before persistence. The app-level subscription
 * is handled by Meta during Embedded Signup; this only finalizes the
 * per-channel webhook wiring.
 */
export interface CoexConnectionInput {
  channelAccountId: string
  appUrl: string
  wabaId: string
  phoneNumberId: string
  accessToken: string
  refreshToken?: string
  accessTokenExpiresAt?: string
}

export async function finalizeMetaCoexConnection(
  input: CoexConnectionInput,
  options?: { baseUrl?: string; fetchFn?: FetchFn },
): Promise<MetaCoexistenceCredentials> {
  const baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
  const fetchFn = options?.fetchFn ?? globalThis.fetch
  const verifyToken = await randomVerifyToken()
  const callbackUrl = buildCallbackUrl(input.appUrl, input.channelAccountId)
  await subscribeWabaToMeta({
    baseUrl,
    fetchFn,
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

function buildCallbackUrl(appUrl: string, channelAccountId: string): string {
  const trimmed = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${trimmed}/webhooks/meta/${channelAccountId}`
}

async function randomVerifyToken(): Promise<string> {
  const { randomBytes } = await import('node:crypto')
  return randomBytes(VERIFY_TOKEN_BYTE_LENGTH).toString('hex')
}

// Re-export the stored type so external consumers (use-cases, services)
// don't have to reach into the contracts package for it.
export type { MetaCredentials }
