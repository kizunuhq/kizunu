import type { ListTemplatesResponse } from '@kizunu/api-contracts/cadence'
import { skipToken, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listTemplates } from './template.api'

export function useTemplates(workspaceId: string | undefined) {
  return useQuery<ListTemplatesResponse>({
    queryKey: [QueryKeys.workspaceTemplates, workspaceId],
    queryFn: workspaceId === undefined ? skipToken : () => listTemplates(workspaceId),
  })
}
