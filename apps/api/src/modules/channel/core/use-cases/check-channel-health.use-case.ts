import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { Injectable } from '@nestjs/common'

import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import { ChannelAccountNotFoundException } from '../errors/channel.errors'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface CheckChannelHealthInput {
  workspaceId: string
  accountId: string
}

@Injectable()
export class CheckChannelHealthUseCase {
  constructor(
    private readonly accounts: ChannelAccountRepository,
    private readonly registry: ChannelPluginRegistry,
  ) {}

  async execute(input: CheckChannelHealthInput): Promise<ConnectorHealth> {
    const account = await this.accounts.findForDirectory(input.accountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ChannelAccountNotFoundException(input.accountId)
    }
    return this.registry.checkHealth(account.pluginId, account.credentials)
  }
}
