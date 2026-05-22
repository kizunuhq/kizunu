import type { CadenceResponse, ListCadencesResponse } from '@kizunu/api-contracts/cadence'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getCadence, listCadences } from './cadence.api'

export function useCadences(workspaceId: string | undefined) {
  return useQuery<ListCadencesResponse>({
    queryKey: [QueryKeys.workspaceCadences, workspaceId],
    queryFn: workspaceId === undefined ? skipToken : () => listCadences(workspaceId),
  })
}

export function useCadence(workspaceId: string | undefined, cadenceId: string | undefined) {
  return useQuery<CadenceResponse>({
    queryKey: [QueryKeys.cadence, workspaceId, cadenceId],
    queryFn:
      workspaceId === undefined || cadenceId === undefined
        ? skipToken
        : () => getCadence(workspaceId, cadenceId),
  })
}
