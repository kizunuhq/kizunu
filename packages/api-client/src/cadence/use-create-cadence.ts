import type { CadenceRequest, CreateCadenceResponse } from '@kizunu/api-contracts/cadence'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createCadence } from './cadence.api'

export function useCreateCadence(
  workspaceId: string,
  options?: UseMutationOptions<CreateCadenceResponse, ApiError, CadenceRequest>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: (body: CadenceRequest) => createCadence(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceCadences, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, createCadence: mutate }
}
