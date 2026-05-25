import { metaCoexistenceCredentialsSchema, MetaPluginId } from '@kizunu/api-contracts/channel'
import { ChannelCapability } from '@kizunu/api/modules/channel/core/plugin/channel-capability'
import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import {
  ChannelPluginConnectKind,
  OauthProvider,
} from '@kizunu/api/modules/channel/core/plugin/channel-plugin-connect'
import { defineChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/define-channel-plugin'
import { decideMetaAction } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/decide-meta-action'
import { dispatchMetaDirectory } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/dispatch-meta-directory'
import { exchangeForRefreshedToken } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-coex-token'
import { runMetaHealth } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-health'
import { parseMetaInbound } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-inbound'
import {
  type FetchFn,
  META_GRAPH_API_BASE,
  sendMetaMessage,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-send'

const TEMPLATES_TTL_MS = 30_000

export interface MetaWhatsappCoexPluginOptions {
  baseUrl?: string
  fetchFn?: FetchFn
  config?: { appId: string; appSecret: string }
}

export function buildMetaWhatsappCoexPlugin(
  options?: MetaWhatsappCoexPluginOptions,
): ChannelPlugin<typeof metaCoexistenceCredentialsSchema> {
  const baseUrl = options?.baseUrl ?? META_GRAPH_API_BASE
  const fetchFn = options?.fetchFn ?? globalThis.fetch
  const appId = options?.config?.appId ?? ''
  const appSecret = options?.config?.appSecret ?? ''

  return defineChannelPlugin({
    manifest: {
      id: MetaPluginId.Coex,
      name: 'WhatsApp (Coex / Embedded Signup)',
      capabilities: [ChannelCapability.Freeform, ChannelCapability.Template],
      configSchema: metaCoexistenceCredentialsSchema,
      directoryResources: [
        { name: 'templates', ttlMs: TEMPLATES_TTL_MS },
        { name: 'phoneNumbers' },
      ],
      connect: { kind: ChannelPluginConnectKind.Oauth, provider: OauthProvider.MetaCoex },
    },
    validate: decideMetaAction,
    async parseInbound(raw) {
      return parseMetaInbound(raw)
    },
    async send(payload, credentials) {
      return sendMetaMessage({ payload, credentials, baseUrl, fetchFn })
    },
    async directory(input) {
      return dispatchMetaDirectory(input, { baseUrl, fetchFn, connectorId: MetaPluginId.Coex })
    },
    async refreshCredentials({ credentials }) {
      const refreshed = await exchangeForRefreshedToken({
        baseUrl,
        fetchFn,
        appId,
        appSecret,
        currentToken: credentials.accessToken,
      })
      return {
        ...credentials,
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      }
    },
    async checkHealth({ credentials }) {
      return runMetaHealth({ fetchFn, baseUrl }, credentials)
    },
  })
}
