import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getChannelDirectory } from './get-channel-directory.api'

export function useDirectoryMetaTemplates(
  workspaceId: string,
  accountId: string,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'channel', workspaceId, accountId, 'templates'],
    fetcher: () => getChannelDirectory(workspaceId, accountId, 'templates'),
    enabled: Boolean(workspaceId) && Boolean(accountId),
  })
}
