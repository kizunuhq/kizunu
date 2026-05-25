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
    const manifest = this.registry.get(account.connectorId).manifest
    return this.directories.run({
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      resource: input.resource,
      params: input.params ?? {},
      connectorId: manifest.id,
      resources: manifest.directoryResources,
      invoke: (params) =>
        this.registry.directory(
          account.connectorId,
          { accountId: input.accountId, resource: input.resource, params },
          account.credentials,
        ),
    })
  }
}
