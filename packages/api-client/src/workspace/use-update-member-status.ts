import type { UpdateMemberRequest, UpdateMemberResponse } from '@kizunu/api-contracts/workspace'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { updateMemberStatus } from './workspace.api'

interface UpdateMemberStatusInput {
  membershipId: string
  status: UpdateMemberRequest['status']
}

export function useUpdateMemberStatus(
  workspaceId: string,
  options?: UseMutationOptions<UpdateMemberResponse, ApiError, UpdateMemberStatusInput>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: ({ membershipId, status }: UpdateMemberStatusInput) =>
      updateMemberStatus(workspaceId, membershipId, { status }),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.members, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, updateMemberStatus: mutate }
}
