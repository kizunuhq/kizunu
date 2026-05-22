import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { revokeChannelAccess } from './channel.api'

interface RevokeChannelAccessInput {
  accountId: string
  userId: string
}

export function useRevokeChannelAccess(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, RevokeChannelAccessInput>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, userId }: RevokeChannelAccessInput) =>
      revokeChannelAccess(workspaceId, accountId, userId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceChannels, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
