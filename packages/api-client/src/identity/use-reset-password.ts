import type { ConfirmPasswordReset } from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { confirmPasswordReset } from './auth.api'

export function useResetPassword(
  options?: UseMutationOptions<void, ApiError, ConfirmPasswordReset>,
) {
  return useMutation({ mutationFn: confirmPasswordReset, ...options })
}
