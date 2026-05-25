import {
  metaCredentialsClientSchema,
  metaCredentialsSchema,
  MetaPluginId,
  type MetaCredentials,
} from '@kizunu/api-contracts/channel'
import { ChannelCapability } from '@kizunu/api/modules/channel/core/plugin/channel-capability'
import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import { defineChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/define-channel-plugin'

import { decideMetaAction } from './decide-meta-action'
import { dispatchMetaDirectory } from './dispatch-meta-directory'
import { exchangeForRefreshedToken } from './meta-coex-token'
import { parseMetaInbound } from './meta-inbound'
import { type FetchFn, META_GRAPH_API_BASE, sendMetaMessage } from './meta-send'
import { subscribeMetaChannel } from './meta-subscribe'

const TEMPLATES_TTL_MS = 30_000

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
 * Coex is registered as a separate plugin ({@link buildMetaWhatsappCoexPlugin})
 * — see `plugins/meta-whatsapp-coex/`.
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
    validate: decideMetaAction,
    async parseInbound(raw) {
      return parseMetaInbound(raw)
    },
    async send(payload, credentials) {
      return sendMetaMessage({ payload, credentials, baseUrl, fetchFn })
    },
    async directory(input) {
      return dispatchMetaDirectory(input, { baseUrl, fetchFn, connectorId: MetaPluginId.Cloud })
    },
    async refreshCredentials({ credentials }) {
      // Defensive: post-058 the coexistence variant routes to the meta-whatsapp-coex
      // plugin, but metaCredentialsSchema keeps both variants until a follow-up
      // narrows it to cloud_api-only.
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

// Re-export the stored type so external consumers (use-cases, services)
// don't have to reach into the contracts package for it.
export type { MetaCredentials }
