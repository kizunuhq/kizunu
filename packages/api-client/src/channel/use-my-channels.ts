import type { MyChannelsResponse } from '@kizunu/api-contracts/channel'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { listMyChannels } from './channel.api'

export function useMyChannels() {
  return useQuery<MyChannelsResponse>({
    queryKey: [QueryKeys.myChannels],
    queryFn: () => listMyChannels(),
  })
}
