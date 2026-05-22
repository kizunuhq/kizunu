import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { grantChannelAccess } from './channel.api'

interface GrantChannelAccessInput {
  accountId: string
  userId: string
}

export function useGrantChannelAccess(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, GrantChannelAccessInput>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, userId }: GrantChannelAccessInput) =>
      grantChannelAccess(workspaceId, accountId, { userId }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceChannels, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
