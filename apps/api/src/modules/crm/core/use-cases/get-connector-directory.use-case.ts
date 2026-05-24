import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryQueryService } from '@kizunu/api/modules/_shared/directory/directory-query.service'
import { Injectable } from '@nestjs/common'

import { ConnectorAccountRepository } from '../../persistence/connector-account.repository'
import { CrmConnectorRegistry } from '../connector/crm-connector-registry'
import { ConnectorAccountNotFoundException } from '../errors/crm.errors'

export interface GetConnectorDirectoryInput {
  workspaceId: string
  accountId: string
  resource: string
  params?: Readonly<Record<string, string>>
}

@Injectable()
export class GetConnectorDirectoryUseCase {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly accounts: ConnectorAccountRepository,
    private readonly directories: DirectoryQueryService,
  ) {}

  async execute(input: GetConnectorDirectoryInput): Promise<DirectoryResult> {
    const account = await this.accounts.findById(input.accountId)
    if (!account || account.workspaceId !== input.workspaceId) {
      throw new ConnectorAccountNotFoundException(input.accountId)
    }
    return await this.directories.run({
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      resource: input.resource,
      params: input.params ?? {},
      credentials: account.credentials,
      plugin: this.registry.get(account.connectorId),
    })
  }
}
