import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryQueryService } from '@kizunu/api/modules/_shared/directory/directory-query.service'
import { Injectable } from '@nestjs/common'

import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import { ChannelAccountNotFoundException } from '../errors/channel.errors'
import { ChannelPluginRegistry } from '../plugin/channel-plugin-registry'

export interface GetChannelDirectoryInput {
  workspaceId: string
  accountId: string
  resource: string
  params?: Readonly<Record<string, string>>
}

@Injectable()
export class GetChannelDirectoryUseCase {
  constructor(
    private readonly registry: ChannelPluginRegistry,
    private readonly accounts: ChannelAccountRepository,
    private readonly directories: DirectoryQueryService,
  ) {}

  async execute(input: GetChannelDirectoryInput): Promise<DirectoryResult> {
    const account = await this.accounts.findForDirectory(input.accountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ChannelAccountNotFoundException(input.accountId)
    }
    return await this.directories.run({
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      resource: input.resource,
      params: input.params ?? {},
      credentials: account.credentials,
      plugin: this.registry.get(account.pluginId),
    })
  }
}
