import type { MeResponse } from '@kizunu/api-contracts/identity'
import { useQuery } from '@tanstack/react-query'

import { ApiClientError, apiFetch } from '../lib/api-client'

export function useSession() {
  const query = useQuery({
    queryKey: ['session', 'me'],
    queryFn: async () => {
      try {
        return await apiFetch<MeResponse>('/auth/me')
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    staleTime: 60 * 1000,
  })

  return {
    user: query.data?.user ?? null,
    memberships: query.data?.memberships ?? [],
    activeWorkspaceId: query.data?.activeWorkspaceId ?? null,
    isPending: query.isPending,
    refetch: query.refetch,
  }
}
