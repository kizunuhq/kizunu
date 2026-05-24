import type {
  CreateMemberConnectorIdentityRequest,
  CreateMemberConnectorIdentityResponse,
} from '@kizunu/api-contracts/crm'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createMemberConnectorIdentity } from './member-connector-identity.api'

export function useCreateMemberConnectorIdentity(
  workspaceId: string,
  connectorAccountId: string,
  options?: UseMutationOptions<
    CreateMemberConnectorIdentityResponse,
    ApiError,
    CreateMemberConnectorIdentityRequest
  >,
) {
  const queryClient = useQueryClient()
  const { mutate, ...rest } = useMutation({
    mutationFn: (body: CreateMemberConnectorIdentityRequest) =>
      createMemberConnectorIdentity(workspaceId, connectorAccountId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.memberConnectorIdentities, workspaceId, connectorAccountId],
      })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, createMemberConnectorIdentity: mutate }
}
