import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getConnectorDirectory } from './get-connector-directory.api'

export function useDirectoryPipedriveStages(
  workspaceId: string,
  accountId: string,
  pipelineId: string | undefined,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'crm', workspaceId, accountId, 'stages', pipelineId ?? null],
    fetcher: () =>
      getConnectorDirectory(workspaceId, accountId, 'stages', { pipelineId: pipelineId ?? '' }),
    enabled: Boolean(workspaceId) && Boolean(accountId) && Boolean(pipelineId),
  })
}
