import type { LeadJourneyStatusValue, ListLeadJourneysResponse } from '@kizunu/api-contracts/engine'
import { Routes } from '@kizunu/api-contracts/routes'
import { skipToken, useQuery } from '@tanstack/react-query'

import { get } from '../client/api-client'
import { QueryKeys } from '../query-keys'

export function useLeadJourneys(workspaceId: string | undefined, status?: LeadJourneyStatusValue) {
  return useQuery<ListLeadJourneysResponse>({
    queryKey: [QueryKeys.workspaceLeadJourneys, workspaceId, status],
    queryFn:
      workspaceId === undefined
        ? skipToken
        : () =>
            get<ListLeadJourneysResponse>(Routes.leadJourneys.collection(workspaceId), { status }),
  })
}
