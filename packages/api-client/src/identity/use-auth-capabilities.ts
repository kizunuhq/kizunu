import type { AuthCapabilitiesResponse } from '@kizunu/api-contracts/identity'
import { useQuery } from '@tanstack/react-query'

import { QueryKeys } from '../query-keys'
import { getAuthCapabilities } from './auth.api'

const STALE_TIME_MS = 5 * 60 * 1000

/**
 * Public instance auth capabilities (e.g. whether public registration is open).
 * Long stale time: the flag is env-backed and only changes on a redeploy.
 */
export function useAuthCapabilities() {
  return useQuery<AuthCapabilitiesResponse>({
    queryKey: [QueryKeys.authCapabilities],
    queryFn: getAuthCapabilities,
    staleTime: STALE_TIME_MS,
  })
}
