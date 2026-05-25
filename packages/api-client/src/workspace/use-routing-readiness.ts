import type { RoutingReadinessResponse } from '@kizunu/api-contracts/workspace'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getRoutingReadiness } from './workspace.api'

export function useRoutingReadiness(workspaceId: string | undefined) {
  return useQuery<RoutingReadinessResponse>({
    queryKey: [QueryKeys.routingReadiness, workspaceId],
    queryFn: workspaceId ? () => getRoutingReadiness(workspaceId) : skipToken,
    staleTime: 30_000,
  })
}
