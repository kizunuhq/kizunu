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
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

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
 * Embedded Signup server endpoint. Exchanges the OAuth code for
 * a business token, then runs the same pre-mint + onAccountCreated + persist
 * flow as `CreateChannelAccountUseCase` — only the credentials shape is
 * different (`channelMode: 'coexistence'` with the OAuth triplet). The plugin's
 * Coex branch runs the per-WABA subscription with the Coex subscribed_fields.
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
    private readonly registry: ChannelPluginRegistry,
    private readonly accounts: ChannelAccountRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: ConnectMetaCoexInput): Promise<ConnectMetaCoexOutput> {
    const meta = this.assertConfigured()
    const token = await this.exchange(meta, input.code)
    const channelAccountId = Bun.randomUUIDv7()
    const credentials = await this.runHook({
      channelAccountId,
      coexInput: this.buildCoexCredentials(token, input),
    })
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

  private buildCoexCredentials(
    token: ExchangedToken,
    input: ConnectMetaCoexInput,
  ): {
    channelMode: 'coexistence'
    wabaId: string
    phoneNumberId: string
    accessToken: string
    accessTokenExpiresAt?: string
  } {
    return {
      channelMode: 'coexistence',
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      accessToken: token.accessToken,
      ...(token.accessTokenExpiresAt === undefined
        ? {}
        : { accessTokenExpiresAt: token.accessTokenExpiresAt }),
    }
  }

  private async runHook(args: {
    channelAccountId: string
    coexInput: { channelMode: 'coexistence' } & Record<string, unknown>
  }): Promise<unknown> {
    return this.registry.onAccountCreated(
      META_PLUGIN_ID,
      { channelAccountId: args.channelAccountId, appUrl: this.config.get('appUrl') ?? '' },
      args.coexInput,
    )
  }
}
