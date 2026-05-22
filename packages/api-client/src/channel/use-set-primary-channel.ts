import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { setPrimaryChannel } from './channel.api'

export function useSetPrimaryChannel(options?: UseMutationOptions<void, ApiError, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountId: string) => setPrimaryChannel(accountId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.myChannels] })
      await options?.onSuccess?.(...args)
    },
  })
}
