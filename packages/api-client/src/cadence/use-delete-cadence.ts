import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { deleteCadence } from './cadence.api'

export function useDeleteCadence(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: (cadenceId: string) => deleteCadence(workspaceId, cadenceId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceCadences, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, deleteCadence: mutate }
}
