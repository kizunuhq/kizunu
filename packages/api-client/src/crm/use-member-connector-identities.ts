import type { ListMemberConnectorIdentitiesResponse } from '@kizunu/api-contracts/crm'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listMemberConnectorIdentities } from './member-connector-identity.api'

export function useMemberConnectorIdentities(workspaceId: string, connectorAccountId: string) {
  return useQuery<ListMemberConnectorIdentitiesResponse>({
    queryKey: [QueryKeys.memberConnectorIdentities, workspaceId, connectorAccountId],
    queryFn: () => listMemberConnectorIdentities(workspaceId, connectorAccountId),
    enabled: Boolean(workspaceId) && Boolean(connectorAccountId),
  })
}
