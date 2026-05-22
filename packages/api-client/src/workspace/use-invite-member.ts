import type { InviteMemberRequest, InviteMemberResponse } from '@kizunu/api-contracts/workspace'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { inviteMember } from './workspace.api'

export function useInviteMember(
  workspaceId: string,
  options?: UseMutationOptions<InviteMemberResponse, ApiError, InviteMemberRequest>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: InviteMemberRequest) => inviteMember(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.members, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
