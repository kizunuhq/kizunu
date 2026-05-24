import type { MeResponse } from '@kizunu/api-contracts/identity'
import { useQuery } from '@tanstack/react-query'

import { ApiError } from '../client/api-error'
import { QueryKeys } from '../query-keys'
import { getMe } from './auth.api'

const STALE_TIME_MS = 60 * 1000

/**
 * Resolves the authenticated session. A 401 is treated as "signed out"
 * (`user === null`) rather than an error, so guards can branch on `user`
 * without try/catch.
 */
export function useCurrentUser() {
  const query = useQuery<MeResponse | null>({
    queryKey: [QueryKeys.currentUser],
    queryFn: async () => {
      try {
        return await getMe()
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) return null
        throw error
      }
    },
    staleTime: STALE_TIME_MS,
  })

  return {
    user: query.data?.user ?? null,
    memberships: query.data?.memberships ?? [],
    connectorIdentities: query.data?.connectorIdentities ?? [],
    activeWorkspaceId: query.data?.activeWorkspaceId ?? null,
    isPending: query.isPending,
    refetch: query.refetch,
  }
}
