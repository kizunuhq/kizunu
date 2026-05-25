import type { ListAuditEventsResponse } from '@kizunu/api-contracts/engine'
import { Routes } from '@kizunu/api-contracts/routes'
import { skipToken, useQuery } from '@tanstack/react-query'

import { get } from '../client/api-client'
import { QueryKeys } from '../query-keys'

export function useAuditEvents(workspaceId: string | undefined) {
  return useQuery<ListAuditEventsResponse>({
    queryKey: [QueryKeys.auditEvents, workspaceId],
    queryFn: workspaceId
      ? () => get<ListAuditEventsResponse>(Routes.auditEvents.collection(workspaceId))
      : skipToken,
  })
}
