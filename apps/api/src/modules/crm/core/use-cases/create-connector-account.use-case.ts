import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'

export interface CreateConnectorAccountInput {
  workspaceId: string
  connectorId: string
  name: string
  credentials: unknown
}

export interface CreateConnectorAccountOutput {
  id: string
  connectorId: string
  name: string
}

@Injectable()
export class CreateConnectorAccountUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly accounts: ConnectorAccountRepository,
  ) {}

  async execute(input: CreateConnectorAccountInput): Promise<CreateConnectorAccountOutput> {
    const credentials = this.registry.validateCredentials(input.connectorId, input.credentials)
    const { id } = await this.accounts.create({
      workspaceId: input.workspaceId,
      connectorId: input.connectorId,
      name: input.name,
      credentials,
    })
    return { id, connectorId: input.connectorId, name: input.name }
  }
}
