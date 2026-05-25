import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getConnectorHealth } from './crm.api'

export function useConnectorHealth(workspaceId: string | undefined, accountId: string | undefined) {
  return useQuery<ConnectorHealth>({
    queryKey: [QueryKeys.connectorHealth, workspaceId, accountId],
    queryFn:
      workspaceId && accountId ? () => getConnectorHealth(workspaceId, accountId) : skipToken,
    staleTime: 30_000,
  })
}
