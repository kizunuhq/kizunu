import type { RegisterRequest, RegisterResponse } from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { register } from './auth.api'

export function useRegister(
  options?: UseMutationOptions<RegisterResponse, ApiError, RegisterRequest>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: register,
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.currentUser] })
      await options?.onSuccess?.(...args)
    },
  })
}
