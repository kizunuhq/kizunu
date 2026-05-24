import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { revokeOtherSessions } from './sessions.api'

export function useRevokeOtherSessions(options?: UseMutationOptions<void, ApiError>) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: revokeOtherSessions,
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.sessions] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, revokeOtherSessions: mutate }
}
