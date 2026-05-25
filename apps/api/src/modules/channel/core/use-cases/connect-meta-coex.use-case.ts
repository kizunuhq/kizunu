import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import { MetaCoexNotConfiguredException } from '../../plugins/meta-whatsapp/meta-coex-not-configured.exception'
import {
  exchangeCodeForToken,
  type ExchangedToken,
} from '../../plugins/meta-whatsapp/meta-coex-token'
import { META_GRAPH_API_BASE, type FetchFn } from '../../plugins/meta-whatsapp/meta-send'
import { finalizeMetaCoexConnection } from '../../plugins/meta-whatsapp/meta-whatsapp.plugin'

const META_PLUGIN_ID = 'meta-whatsapp'

export interface ConnectMetaCoexInput {
  workspaceId: string
  code: string
  businessId: string
  wabaId: string
  phoneNumberId: string
  name: string
}

export interface ConnectMetaCoexOutput {
  id: string
  pluginId: 'meta-whatsapp'
  channelMode: 'coexistence'
  name: string
}

/**
 * Embedded Signup server endpoint. Exchanges the OAuth code for a business
 * token, then runs the Coex-specific finalization (per-WABA subscription +
 * verifyToken stamping) via {@link finalizeMetaCoexConnection}. The Cloud API
 * `onAccountCreated` hook is bypassed because Coex's input shape (OAuth
 * triplet + business identifiers) differs from the cloud_api operator input.
 *
 * Fails fast with `MetaCoexNotConfiguredException` when the operator has not
 * set the app-wide `META_APP_ID` / `META_APP_SECRET` env vars; the connect
 * popup itself depends on `META_COEX_CONFIG_ID` so the same check covers all
 * three.
 */
@Injectable()
export class ConnectMetaCoexUseCase {
  /** Defaulted; e2e overrides via `Object.defineProperty` to inject a fake. */
  baseUrl: string = META_GRAPH_API_BASE
  fetchFn: FetchFn = globalThis.fetch

  constructor(
    private readonly accounts: ChannelAccountRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: ConnectMetaCoexInput): Promise<ConnectMetaCoexOutput> {
    const meta = this.assertConfigured()
    const token = await this.exchange(meta, input.code)
    const channelAccountId = Bun.randomUUIDv7()
    const credentials = await finalizeMetaCoexConnection(
      {
        channelAccountId,
        appUrl: this.config.get('appUrl') ?? '',
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        accessToken: token.accessToken,
        ...(token.accessTokenExpiresAt === undefined
          ? {}
          : { accessTokenExpiresAt: token.accessTokenExpiresAt }),
      },
      { baseUrl: this.baseUrl, fetchFn: this.fetchFn },
    )
    await this.accounts.create({
      id: channelAccountId,
      workspaceId: input.workspaceId,
      pluginId: META_PLUGIN_ID,
      name: input.name,
      credentials,
    })
    return {
      id: channelAccountId,
      pluginId: 'meta-whatsapp',
      channelMode: 'coexistence',
      name: input.name,
    }
  }

  private assertConfigured(): { appId: string; appSecret: string; coexConfigId: string } {
    const appId = this.config.get('meta.appId') ?? ''
    const appSecret = this.config.get('meta.appSecret') ?? ''
    const coexConfigId = this.config.get('meta.coexConfigId') ?? ''
    if (!appId || !appSecret || !coexConfigId) {
      throw new MetaCoexNotConfiguredException()
    }
    return { appId, appSecret, coexConfigId }
  }

  private async exchange(
    meta: { appId: string; appSecret: string },
    code: string,
  ): Promise<ExchangedToken> {
    return await exchangeCodeForToken({
      baseUrl: this.baseUrl,
      fetchFn: this.fetchFn,
      appId: meta.appId,
      appSecret: meta.appSecret,
      code,
    })
  }
}
