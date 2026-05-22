import { Injectable } from '@nestjs/common'

import {
  type ConnectorAccountSummary,
  ConnectorAccountRepository,
} from '../../persistence/connector-account.repository'

@Injectable()
export class ListWorkspaceConnectorAccountsUseCase {
  constructor(private readonly accounts: ConnectorAccountRepository) {}

  async execute(workspaceId: string): Promise<ConnectorAccountSummary[]> {
    return await this.accounts.listByWorkspace(workspaceId)
  }
}
