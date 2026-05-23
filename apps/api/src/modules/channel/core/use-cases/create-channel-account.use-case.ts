import { randomUUID } from 'node:crypto'

import type { Config } from '@kizunu/api/api.config'
import { ConfigService } from '@kizunu/config-module/config.service'
import { Injectable } from '@nestjs/common'

import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
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
 * configSchema, then pre-mint the row's UUID so plugins whose providers need
 * out-of-band setup (Meta's two-step webhook subscription, feature 029) can
 * embed it in their callback URLs. The optional `onAccountCreated` hook returns
 * the credentials that actually get persisted — typically the input enriched
 * with server-generated fields (e.g. a per-channel verifyToken). When the hook
 * throws, no row is written.
 */
@Injectable()
export class CreateChannelAccountUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly accounts: ChannelAccountRepository,
    private readonly config: ConfigService<Config>,
  ) {}

  async execute(input: CreateChannelAccountInput): Promise<CreateChannelAccountOutput> {
    const validatedClientCredentials = this.registry.validateCredentials(
      input.pluginId,
      input.credentials,
    )
    const channelAccountId = randomUUID()
    const credentialsToPersist = await this.runAccountCreatedHook({
      pluginId: input.pluginId,
      channelAccountId,
      credentials: validatedClientCredentials,
    })
    const { id } = await this.accounts.create({
      id: channelAccountId,
      workspaceId: input.workspaceId,
      pluginId: input.pluginId,
      name: input.name,
      credentials: credentialsToPersist,
    })
    return { id, pluginId: input.pluginId, name: input.name }
  }

  private async runAccountCreatedHook(args: {
    pluginId: string
    channelAccountId: string
    credentials: unknown
  }): Promise<unknown> {
    const plugin = this.registry.get(args.pluginId)
    if (!plugin.onAccountCreated) return args.credentials
    return await plugin.onAccountCreated({
      channelAccountId: args.channelAccountId,
      appUrl: this.config.get('appUrl') ?? '',
      credentials: args.credentials,
    })
  }
}
