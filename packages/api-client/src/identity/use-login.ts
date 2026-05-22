import type { LoginRequest, LoginResponse } from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { login } from './auth.api'

export function useLogin(options?: UseMutationOptions<LoginResponse, ApiError, LoginRequest>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.currentUser] })
      await options?.onSuccess?.(...args)
    },
  })
}
