import type { CadenceRequest } from '@kizunu/api-contracts/cadence'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { updateCadence } from './cadence.api'

interface UpdateCadenceInput {
  cadenceId: string
  body: CadenceRequest
}

export function useUpdateCadence(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, UpdateCadenceInput>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cadenceId, body }: UpdateCadenceInput) =>
      updateCadence(workspaceId, cadenceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceCadences, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
