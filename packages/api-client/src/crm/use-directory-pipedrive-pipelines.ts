import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getConnectorDirectory } from './get-connector-directory.api'

export function useDirectoryPipedrivePipelines(
  workspaceId: string,
  accountId: string,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'crm', workspaceId, accountId, 'pipelines'],
    fetcher: () => getConnectorDirectory(workspaceId, accountId, 'pipelines'),
    enabled: Boolean(workspaceId) && Boolean(accountId),
  })
}
