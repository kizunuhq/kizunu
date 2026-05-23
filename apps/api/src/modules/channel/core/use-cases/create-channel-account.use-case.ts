import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import type { ChannelPlugin } from '../plugin/channel-plugin'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface CreateChannelAccountInput {
  workspaceId: string
  pluginId: string
  name: string
  credentials: unknown
}

export interface CreateChannelAccountOutput {
  id: string
  pluginId: string
  name: string
}

/**
 * Create flow: validate the operator-supplied credentials with the plugin's
 * configSchema, pre-mint the row's UUIDv7 (same generator the Drizzle defaults
 * use) so plugins whose providers need out-of-band setup — Meta's two-step
 * webhook subscription, feature 029 — can embed it in their callback URLs, and
 * run the optional `onAccountCreated` hook. The hook returns the credentials
 * that get persisted (typically the input enriched with server-generated
 * fields); when it throws, no row is written.
 */
@Injectable()
export class CreateChannelAccountUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly accounts: ChannelAccountRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: CreateChannelAccountInput): Promise<CreateChannelAccountOutput> {
    const validated = this.registry.validateCredentials(input.pluginId, input.credentials)
    const plugin = this.registry.get(input.pluginId)
    const channelAccountId = Bun.randomUUIDv7()
    const credentials = await this.enrich(plugin, channelAccountId, validated)
    await this.accounts.create({
      id: channelAccountId,
      workspaceId: input.workspaceId,
      pluginId: input.pluginId,
      name: input.name,
      credentials,
    })
    return { id: channelAccountId, pluginId: input.pluginId, name: input.name }
  }

  private async enrich(
    plugin: ChannelPlugin,
    channelAccountId: string,
    credentials: unknown,
  ): Promise<unknown> {
    if (!plugin.onAccountCreated) return credentials
    return await plugin.onAccountCreated({
      channelAccountId,
      appUrl: this.config.get('appUrl') ?? '',
      credentials,
    })
  }
}
