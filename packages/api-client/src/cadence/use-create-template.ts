import type { CreateTemplateRequest, CreateTemplateResponse } from '@kizunu/api-contracts/cadence'
import { type UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { createTemplate } from './template.api'

export function useCreateTemplate(
  workspaceId: string,
  options?: UseMutationOptions<CreateTemplateResponse, ApiError, CreateTemplateRequest>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTemplateRequest) => createTemplate(workspaceId, body),
    ...options,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.workspaceTemplates, workspaceId] })
      await options?.onSuccess?.(...args)
    },
  })
}
