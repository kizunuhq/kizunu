import type { ListConnectorAccountsResponse } from '@kizunu/api-contracts/crm'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listConnectorAccounts } from './crm.api'

export function useWorkspaceConnectors(workspaceId: string | undefined) {
  return useQuery<ListConnectorAccountsResponse>({
    queryKey: [QueryKeys.workspaceConnectors, workspaceId],
    queryFn: workspaceId === undefined ? skipToken : () => listConnectorAccounts(workspaceId),
  })
}
