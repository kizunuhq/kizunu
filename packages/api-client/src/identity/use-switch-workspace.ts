import type {
  SwitchWorkspaceRequest,
  SwitchWorkspaceResponse,
} from '@kizunu/api-contracts/identity'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { switchWorkspace } from './auth.api'

export function useSwitchWorkspace(
  options?: UseMutationOptions<SwitchWorkspaceResponse, ApiError, SwitchWorkspaceRequest>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: switchWorkspace,
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.currentUser] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, switchWorkspace: mutate }
}
