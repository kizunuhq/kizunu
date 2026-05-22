import { type UseMutationOptions, useMutation } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { resendEmailVerification } from './auth.api'

export function useResendEmailVerification(options?: UseMutationOptions<void, ApiError>) {
  return useMutation({ mutationFn: resendEmailVerification, ...options })
}
