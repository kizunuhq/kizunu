import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryQueryService } from '@kizunu/api/modules/_shared/directory/directory-query.service'
import { ConnectorDirectoryUnsupportedException } from '@kizunu/api/modules/_shared/directory/directory.errors'
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
    const connector = this.registry.get(account.connectorId)
    if (!connector.directory) {
      throw new ConnectorDirectoryUnsupportedException({
        connectorId: connector.manifest.id,
        resource: input.resource,
      })
    }
    const directoryFn = connector.directory.bind(connector)
    return this.directories.run({
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      resource: input.resource,
      params: input.params ?? {},
      connectorId: connector.manifest.id,
      resources: connector.manifest.directoryResources,
      invoke: (params) =>
        directoryFn({
          accountId: input.accountId,
          resource: input.resource,
          credentials: account.credentials,
          params,
        }),
    })
  }
}
