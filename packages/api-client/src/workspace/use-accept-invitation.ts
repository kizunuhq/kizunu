import type {
  AcceptInvitationRequest,
  AcceptInvitationResponse,
} from '@kizunu/api-contracts/workspace'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { acceptInvitation } from './workspace.api'

export function useAcceptInvitation(
  options?: UseMutationOptions<AcceptInvitationResponse, ApiError, AcceptInvitationRequest>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: acceptInvitation,
    ...options,
    onSuccess: async (...args) => {
      // Accepting an invitation changes the caller's memberships.
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.currentUser] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, acceptInvitation: mutate }
}
