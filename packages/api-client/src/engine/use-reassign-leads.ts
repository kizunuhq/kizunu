import type { ReassignLeadsRequest } from '@kizunu/api-contracts/engine'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { reassignLeads } from './lead-ownership.api'

export function useReassignLeads(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, ReassignLeadsRequest>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: (body: ReassignLeadsRequest) => reassignLeads(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceLeadJourneys, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, reassignLeads: mutate }
}
