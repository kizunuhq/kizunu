import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import type { ApiError } from '../client/api-error'

export interface DirectoryQuery {
  queryKey: readonly unknown[]
  fetcher: () => Promise<DirectoryResult>
  enabled?: boolean
}

export type DirectoryQueryResult = UseQueryResult<DirectoryResult, ApiError> & {
  needsReconnect: boolean
  isRateLimited: boolean
  retryAfterSeconds: number | undefined
}

export function useDirectory(input: DirectoryQuery): DirectoryQueryResult {
  const query = useQuery<DirectoryResult, ApiError>({
    queryKey: input.queryKey,
    queryFn: input.fetcher,
    enabled: input.enabled ?? true,
  })
  const error = query.error
  return {
    ...query,
    needsReconnect: error?.code === 'connector.token-expired',
    isRateLimited: error?.code === 'connector.rate-limited',
    retryAfterSeconds: readRetryAfter(error?.context),
  }
}

function readRetryAfter(context: unknown): number | undefined {
  if (!context || typeof context !== 'object') return undefined
  const value = (context as { retryAfterSeconds?: unknown }).retryAfterSeconds
  return typeof value === 'number' && value > 0 ? value : undefined
}
