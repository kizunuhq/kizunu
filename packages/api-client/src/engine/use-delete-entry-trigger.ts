import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { deleteEntryTrigger } from './entry-trigger.api'

export function useDeleteEntryTrigger(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (triggerId: string) => deleteEntryTrigger(workspaceId, triggerId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceEntryTriggers, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
}
