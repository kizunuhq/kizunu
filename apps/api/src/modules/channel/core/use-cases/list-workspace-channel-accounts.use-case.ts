import { Injectable } from '@nestjs/common'

import {
  type ChannelAccountSummary,
  ChannelAccountRepository,
} from '../../persistence/channel-account.repository'

@Injectable()
export class ListWorkspaceChannelAccountsUseCase {
  constructor(private readonly accounts: ChannelAccountRepository) {}

  async execute(workspaceId: string): Promise<ChannelAccountSummary[]> {
    return await this.accounts.listByWorkspace(workspaceId)
  }
}
