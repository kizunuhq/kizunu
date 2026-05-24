import type { DirectoryResult, DirectoryRow } from '@kizunu/api-contracts/shared'

import {
  ConnectorDirectoryFailedException,
  ConnectorRateLimitedException,
  ConnectorTokenExpiredException,
} from './directory.errors'

const UNAUTHORIZED = 401
const TOO_MANY = 429
const DEFAULT_TRUNCATION_LIMIT = 500

interface AssertOkInput {
  response: Response
  accountId: string
  resource: string
  scope: 'crm' | 'channel'
}

export function assertProviderOk(input: AssertOkInput): void {
  const { response, accountId, resource, scope } = input
  if (response.ok) return
  if (response.status === UNAUTHORIZED) {
    throw new ConnectorTokenExpiredException({ accountId, scope })
  }
  if (response.status === TOO_MANY) {
    throw new ConnectorRateLimitedException({
      accountId,
      ...readRetryAfter(response.headers),
    })
  }
  throw new ConnectorDirectoryFailedException({
    accountId,
    resource,
    detail: `${resource} -> ${response.status}`,
  })
}

export function toTruncatedResult(
  rows: readonly DirectoryRow[],
  limit: number = DEFAULT_TRUNCATION_LIMIT,
): DirectoryResult {
  if (rows.length > limit) {
    return { items: rows.slice(0, limit), meta: { truncated: true } }
  }
  return { items: [...rows], meta: { truncated: false } }
}

function readRetryAfter(headers: Headers): { retryAfterSeconds?: number } {
  const raw = headers.get('retry-after')
  if (!raw) return {}
  const seconds = Number.parseInt(raw, 10)
  return Number.isFinite(seconds) && seconds > 0 ? { retryAfterSeconds: seconds } : {}
}
