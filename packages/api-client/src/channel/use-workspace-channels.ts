import type { ListChannelAccountsResponse } from '@kizunu/api-contracts/channel'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listChannelAccounts } from './channel.api'

export function useWorkspaceChannels(workspaceId: string | undefined) {
  return useQuery<ListChannelAccountsResponse>({
    queryKey: [QueryKeys.workspaceChannels, workspaceId],
    queryFn: workspaceId === undefined ? skipToken : () => listChannelAccounts(workspaceId),
  })
}
