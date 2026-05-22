import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { pauseOwnerJourneys } from './lead-ownership.api'

export function usePauseOwnerJourneys(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => pauseOwnerJourneys(workspaceId, userId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceLeadJourneys, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
}
