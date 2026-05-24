import type { ConfirmEmailVerification } from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { confirmEmailVerification } from './auth.api'

export function useConfirmEmailVerification(
  options?: UseMutationOptions<void, ApiError, ConfirmEmailVerification>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: confirmEmailVerification,
    ...options,
    onSuccess: async (...args) => {
      // Verifying flips me.emailVerifiedAt, which drives the unverified banner.
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.currentUser] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, confirmEmailVerification: mutate }
}
