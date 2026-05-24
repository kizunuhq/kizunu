import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { deleteMemberConnectorIdentity } from './member-connector-identity.api'

export function useDeleteMemberConnectorIdentity(
  workspaceId: string,
  connectorAccountId: string,
  options?: UseMutationOptions<void, ApiError, { identityId: string }>,
) {
  const queryClient = useQueryClient()
  const { mutate, ...rest } = useMutation({
    mutationFn: ({ identityId }: { identityId: string }) =>
      deleteMemberConnectorIdentity(workspaceId, connectorAccountId, identityId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.memberConnectorIdentities, workspaceId, connectorAccountId],
      })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, deleteMemberConnectorIdentity: mutate }
}
