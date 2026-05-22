import type { SessionsResponse } from '@kizunu/api-contracts/identity'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getSessions } from './sessions.api'

export function useSessions() {
  return useQuery<SessionsResponse>({
    queryKey: [QueryKeys.sessions],
    queryFn: getSessions,
  })
}
