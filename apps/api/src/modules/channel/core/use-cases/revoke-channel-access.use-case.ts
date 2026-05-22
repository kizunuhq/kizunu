import { Injectable } from '@nestjs/common'

import { ChannelAccessRepository } from '../../persistence/channel-access.repository'
import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import { ChannelAccountNotFoundException } from '../errors/channel.errors'

export interface RevokeChannelAccessInput {
  workspaceId: string
  channelAccountId: string
  userId: string
}

@Injectable()
export class RevokeChannelAccessUseCase {
  constructor(
    private readonly accounts: ChannelAccountRepository,
    private readonly access: ChannelAccessRepository,
  ) {}

  async execute(input: RevokeChannelAccessInput): Promise<void> {
    const account = await this.accounts.findByIdInWorkspace(
      input.channelAccountId,
      input.workspaceId,
    )
    if (!account) throw new ChannelAccountNotFoundException(input.channelAccountId)

    await this.access.revoke(input.channelAccountId, input.userId)
  }
}
