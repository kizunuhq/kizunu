import type { RequestPasswordReset } from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { requestPasswordReset } from './auth.api'

export function useRequestPasswordReset(
  options?: UseMutationOptions<void, ApiError, RequestPasswordReset>,
) {
  const { mutate, ...rest } = useMutation({ mutationFn: requestPasswordReset, ...options })
  return { ...rest, requestPasswordReset: mutate }
}
