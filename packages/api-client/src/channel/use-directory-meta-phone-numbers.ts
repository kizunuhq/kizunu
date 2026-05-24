import { useDirectory, type DirectoryQueryResult } from '../directory/use-directory'
import { QueryKeys } from '../query-keys'
import { getChannelDirectory } from './get-channel-directory.api'

export function useDirectoryMetaPhoneNumbers(
  workspaceId: string,
  accountId: string,
): DirectoryQueryResult {
  return useDirectory({
    queryKey: [QueryKeys.directory, 'channel', workspaceId, accountId, 'phoneNumbers'],
    fetcher: () => getChannelDirectory(workspaceId, accountId, 'phoneNumbers'),
    enabled: Boolean(workspaceId) && Boolean(accountId),
  })
}
