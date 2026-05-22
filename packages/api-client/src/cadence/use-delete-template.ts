import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { deleteTemplate } from './template.api'

export function useDeleteTemplate(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateId: string) => deleteTemplate(workspaceId, templateId),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceTemplates, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
