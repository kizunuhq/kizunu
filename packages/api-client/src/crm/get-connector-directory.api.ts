import type { GetConnectorDirectoryResponse } from '@kizunu/api-contracts/crm'
import { Routes } from '@kizunu/api-contracts/routes'

import { get } from '../client/api-client'

export const getConnectorDirectory = (
  workspaceId: string,
  accountId: string,
  resource: string,
  params?: Record<string, string>,
): Promise<GetConnectorDirectoryResponse> =>
  get<GetConnectorDirectoryResponse>(
    Routes.connectorAccounts.directory(workspaceId, accountId, resource),
    params,
  )
