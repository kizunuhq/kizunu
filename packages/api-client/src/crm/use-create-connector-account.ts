import type {
  CreateConnectorAccountRequest,
  CreateConnectorAccountResponse,
} from '@kizunu/api-contracts/crm'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createConnectorAccount } from './crm.api'

export function useCreateConnectorAccount(
  workspaceId: string,
  options?: UseMutationOptions<
    CreateConnectorAccountResponse,
    ApiError,
    CreateConnectorAccountRequest
  >,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateConnectorAccountRequest) => createConnectorAccount(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.workspaceConnectors, workspaceId],
      })
      await options?.onSuccess?.(...args)
    },
  })
}
