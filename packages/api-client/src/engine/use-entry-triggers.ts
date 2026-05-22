import type { ListEntryTriggersResponse } from '@kizunu/api-contracts/engine'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listEntryTriggers } from './entry-trigger.api'

export function useEntryTriggers(workspaceId: string | undefined) {
  return useQuery<ListEntryTriggersResponse>({
    queryKey: [QueryKeys.workspaceEntryTriggers, workspaceId],
    queryFn: workspaceId === undefined ? skipToken : () => listEntryTriggers(workspaceId),
  })
}
