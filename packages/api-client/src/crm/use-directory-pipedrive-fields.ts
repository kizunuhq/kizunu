import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getConnectorDirectory } from './get-connector-directory.api'

export function useDirectoryPipedriveFields(
  workspaceId: string,
  accountId: string,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'crm', workspaceId, accountId, 'fields'],
    fetcher: () => getConnectorDirectory(workspaceId, accountId, 'fields'),
    enabled: Boolean(workspaceId) && Boolean(accountId),
  })
}
