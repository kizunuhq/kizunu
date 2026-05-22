import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { revokeSession } from './sessions.api'

export function useRevokeSession(options?: UseMutationOptions<void, ApiError, string>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeSession,
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.sessions] })
      await options?.onSuccess?.(...args)
    },
  })
}
