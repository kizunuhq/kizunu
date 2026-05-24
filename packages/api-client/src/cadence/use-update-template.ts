import type { UpdateTemplateRequest } from '@kizunu/api-contracts/cadence'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { updateTemplate } from './template.api'

interface UpdateTemplateInput {
  templateId: string
  patch: UpdateTemplateRequest
}

export function useUpdateTemplate(
  workspaceId: string,
  options?: UseMutationOptions<void, ApiError, UpdateTemplateInput>,
) {
  const queryClient = useQueryClient()

  const { mutate, ...rest } = useMutation({
    mutationFn: ({ templateId, patch }: UpdateTemplateInput) =>
      updateTemplate(workspaceId, templateId, patch),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceTemplates, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
  return { ...rest, updateTemplate: mutate }
}
