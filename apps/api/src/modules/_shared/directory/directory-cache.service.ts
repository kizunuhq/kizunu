import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { Injectable } from '@nestjs/common'

import type { DirectoryCacheKey } from './directory-cache-key'

interface CacheEntry {
  value: DirectoryResult
  expiresAt: number
}

/**
 * In-process directory memoizer. Keys carry `workspaceId` so two workspaces
 * holding accounts with overlapping external IDs cannot bleed into each other
 * even if a higher layer's scoping check regresses. Eviction is lazy on read.
 * Per-pod only — a second API replica will not share entries. Tracked in
 * `.specs/codebase/CONCERNS.md` for the next scale-up.
 */
@Injectable()
export class DirectoryCacheService {
  private readonly store = new Map<string, CacheEntry>()

  async getOrLoad(
    key: DirectoryCacheKey,
    loader: () => Promise<DirectoryResult>,
    ttlMs: number,
  ): Promise<DirectoryResult> {
    const serialized = serializeKey(key)
    const now = Date.now()
    const hit = this.store.get(serialized)
    if (hit && hit.expiresAt > now) {
      return hit.value
    }
    const value = await loader()
    this.store.set(serialized, { value, expiresAt: now + ttlMs })
    return value
  }

  invalidate(predicate: (key: DirectoryCacheKey) => boolean): void {
    for (const [serialized] of this.store) {
      if (predicate(deserializeKey(serialized))) {
        this.store.delete(serialized)
      }
    }
  }
}

function serializeKey(key: DirectoryCacheKey): string {
  const sortedParams = Object.keys(key.params)
    .sort()
    .map((name) => `${name}=${key.params[name]}`)
    .join('&')
  return `${key.workspaceId}|${key.accountId}|${key.resource}|${sortedParams}`
}

function deserializeKey(serialized: string): DirectoryCacheKey {
  const [workspaceId, accountId, resource, paramsTail] = serialized.split('|')
  const params: Record<string, string> = {}
  if (paramsTail) {
    for (const pair of paramsTail.split('&')) {
      const equalsIndex = pair.indexOf('=')
      if (equalsIndex > 0) {
        params[pair.slice(0, equalsIndex)] = pair.slice(equalsIndex + 1)
      }
    }
  }
  return {
    workspaceId: workspaceId ?? '',
    accountId: accountId ?? '',
    resource: resource ?? '',
    params,
  }
}
