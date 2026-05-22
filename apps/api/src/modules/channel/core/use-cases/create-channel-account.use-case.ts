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

@Injectable()
export class CreateChannelAccountUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly accounts: ChannelAccountRepository,
  ) {}

  async execute(input: CreateChannelAccountInput): Promise<CreateChannelAccountOutput> {
    const credentials = this.registry.validateCredentials(input.pluginId, input.credentials)
    const { id } = await this.accounts.create({
      workspaceId: input.workspaceId,
      pluginId: input.pluginId,
      name: input.name,
      credentials,
    })
    return { id, pluginId: input.pluginId, name: input.name }
  }
}
