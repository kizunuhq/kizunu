import type { ConnectorHealth } from '@kizunu/api-contracts/crm'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getChannelHealth } from './channel.api'

export function useChannelHealth(workspaceId: string | undefined, accountId: string | undefined) {
  return useQuery<ConnectorHealth>({
    queryKey: [QueryKeys.channelHealth, workspaceId, accountId],
    queryFn: workspaceId && accountId ? () => getChannelHealth(workspaceId, accountId) : skipToken,
    staleTime: 30_000,
  })
}
