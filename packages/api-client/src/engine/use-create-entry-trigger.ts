import type {
  CreateEntryTriggerRequest,
  CreateEntryTriggerResponse,
} from '@kizunu/api-contracts/engine'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createEntryTrigger } from './entry-trigger.api'

export function useCreateEntryTrigger(
  workspaceId: string,
  options?: UseMutationOptions<CreateEntryTriggerResponse, ApiError, CreateEntryTriggerRequest>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateEntryTriggerRequest) => createEntryTrigger(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceEntryTriggers, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
}
