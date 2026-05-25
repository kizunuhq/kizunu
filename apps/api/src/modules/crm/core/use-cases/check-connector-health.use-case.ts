import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'

export interface CheckConnectorHealthInput {
  workspaceId: string
  accountId: string
}

@Injectable()
export class CheckConnectorHealthUseCase {
  constructor(
    private readonly accounts: ConnectorAccountRepository,
    private readonly registry: CrmConnectorRegistry,
  ) {}

  async execute(input: CheckConnectorHealthInput): Promise<ConnectorHealth> {
    const account = await this.accounts.findById(input.accountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ConnectorAccountNotFoundException(input.accountId)
    }
    return this.registry.checkHealth(account.connectorId, account.credentials)
  }
}
