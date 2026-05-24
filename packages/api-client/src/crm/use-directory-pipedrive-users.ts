import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getConnectorDirectory } from './get-connector-directory.api'

export function useDirectoryPipedriveUsers(
  workspaceId: string,
  accountId: string,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'crm', workspaceId, accountId, 'users'],
    fetcher: () => getConnectorDirectory(workspaceId, accountId, 'users'),
    enabled: Boolean(workspaceId) && Boolean(accountId),
  })
}
