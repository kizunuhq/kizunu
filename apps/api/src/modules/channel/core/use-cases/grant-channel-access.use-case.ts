import { WorkspaceMemberRepository } from '@kizunu/api/modules/workspace/persistence/workspace-member.repository'
import { Injectable } from '@nestjs/common'

import { ChannelAccessRepository } from '../../persistence/channel-access.repository'
import { ChannelAccountRepository } from '../../persistence/channel-account.repository'
import {
  ChannelAccountNotFoundException,
  UserNotInWorkspaceException,
} from '../errors/channel.errors'

export interface GrantChannelAccessInput {
  workspaceId: string
  channelAccountId: string
  userId: string
}

@Injectable()
export class GrantChannelAccessUseCase {
  constructor(
    private readonly accounts: ChannelAccountRepository,
    private readonly access: ChannelAccessRepository,
    private readonly members: WorkspaceMemberRepository,
  ) {}

  async execute(input: GrantChannelAccessInput): Promise<void> {
    const account = await this.accounts.findByIdInWorkspace(
      input.channelAccountId,
      input.workspaceId,
    )
    if (!account) throw new ChannelAccountNotFoundException(input.channelAccountId)

    const membership = await this.members.findExistingMembership(input.userId, input.workspaceId)
    if (!membership) throw new UserNotInWorkspaceException(input.userId)

    await this.access.grant(input.channelAccountId, input.userId)
  }
}
