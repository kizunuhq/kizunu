import type { ConnectMetaCoexRequest, ConnectMetaCoexResponse } from '@kizunu/api-contracts/channel'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { connectMetaCoex } from './channel.api'

export function useConnectMetaCoex(
  workspaceId: string,
  options?: UseMutationOptions<ConnectMetaCoexResponse, ApiError, ConnectMetaCoexRequest>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ConnectMetaCoexRequest) => connectMetaCoex(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceChannels, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
