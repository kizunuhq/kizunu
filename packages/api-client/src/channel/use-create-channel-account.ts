import type {
  CreateChannelAccountRequest,
  CreateChannelAccountResponse,
} from '@kizunu/api-contracts/channel'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createChannelAccount } from './channel.api'

export function useCreateChannelAccount(
  workspaceId: string,
  options?: UseMutationOptions<CreateChannelAccountResponse, ApiError, CreateChannelAccountRequest>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: (body: CreateChannelAccountRequest) => createChannelAccount(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceChannels, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, createChannelAccount: mutate }
}
