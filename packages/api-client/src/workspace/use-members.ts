import type { ListMembersResponse } from '@kizunu/api-contracts/workspace'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listMembers } from './workspace.api'

export function useMembers(workspaceId: string | undefined) {
  return useQuery<ListMembersResponse>({
    queryKey: [QueryKeys.members, workspaceId],
    // skipToken disables the query while no workspace is selected and narrows
    // workspaceId to string inside the fetcher — no cast at the call site.
    queryFn: workspaceId === undefined ? skipToken : () => listMembers(workspaceId),
  })
}
