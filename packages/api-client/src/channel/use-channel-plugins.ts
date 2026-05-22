import type { ChannelPluginsResponse } from '@kizunu/api-contracts/channel'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listChannelPlugins } from './channel.api'

export function useChannelPlugins() {
  return useQuery<ChannelPluginsResponse>({
    queryKey: [QueryKeys.channelPlugins],
    queryFn: () => listChannelPlugins(),
  })
}
