import { metaCoexistenceCredentialsSchema } from '@kizunu/api-contracts/channel'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'
import { ChannelCapability } from '@kizunu/api/modules/channel/core/plugin/channel-capability'
import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import {
  ChannelPluginConnectKind,
  OauthProvider,
} from '@kizunu/api/modules/channel/core/plugin/channel-plugin-connect'
import { defineChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/define-channel-plugin'
import { isWithinServiceWindow } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/customer-service-window'
import { exchangeForRefreshedToken } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-coex-token'
import {
  listMetaPhoneNumbers,
  listMetaTemplates,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-directory'
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
      id: 'meta-whatsapp-coex',
      name: 'WhatsApp (Coex / Embedded Signup)',
      capabilities: [ChannelCapability.Freeform, ChannelCapability.Template],
      configSchema: metaCoexistenceCredentialsSchema,
      directoryResources: [
        { name: 'templates', ttlMs: TEMPLATES_TTL_MS },
        { name: 'phoneNumbers' },
      ],
      connect: { kind: ChannelPluginConnectKind.Oauth, provider: OauthProvider.MetaCoex },
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
        connectorId: 'meta-whatsapp-coex',
        resource: input.resource,
      })
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
  })
}
