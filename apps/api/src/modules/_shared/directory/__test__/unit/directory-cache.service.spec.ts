import type { DirectoryResult } from '@kizunu/api-contracts/shared'
import { DirectoryCacheService } from '@kizunu/api/modules/_shared/directory/directory-cache.service'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const NOW = new Date('2026-05-24T12:00:00.000Z')
const TTL_MS = 60_000

const KEY = {
  workspaceId: 'ws-1',
  accountId: 'acc-1',
  resource: 'users',
  params: {},
}

const RESULT: DirectoryResult = {
  items: [{ value: 'u-1', label: 'Ada Lovelace' }],
  meta: { truncated: false },
}

const ALT_RESULT: DirectoryResult = {
  items: [{ value: 'u-2', label: 'Grace Hopper' }],
  meta: { truncated: false },
}

describe('DirectoryCacheService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the cached value within ttl and calls the loader only once', async () => {
    const cache = new DirectoryCacheService()
    const loader = vi.fn(async () => RESULT)

    const first = await cache.getOrLoad(KEY, loader, TTL_MS)
    const second = await cache.getOrLoad(KEY, loader, TTL_MS)

    expect(first).toBe(RESULT)
    expect(second).toBe(RESULT)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('reloads after the ttl has elapsed', async () => {
    const cache = new DirectoryCacheService()
    const loader = vi.fn(async () => RESULT)

    await cache.getOrLoad(KEY, loader, TTL_MS)
    vi.setSystemTime(new Date(NOW.getTime() + TTL_MS + 1))
    await cache.getOrLoad(KEY, loader, TTL_MS)

    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('isolates entries that differ only in workspaceId', async () => {
    const cache = new DirectoryCacheService()
    const loaderA = vi.fn(async () => RESULT)
    const loaderB = vi.fn(async () => ALT_RESULT)

    const resultA = await cache.getOrLoad({ ...KEY, workspaceId: 'ws-1' }, loaderA, TTL_MS)
    const resultB = await cache.getOrLoad({ ...KEY, workspaceId: 'ws-2' }, loaderB, TTL_MS)

    expect(resultA).toBe(RESULT)
    expect(resultB).toBe(ALT_RESULT)
    expect(loaderA).toHaveBeenCalledTimes(1)
    expect(loaderB).toHaveBeenCalledTimes(1)
  })

  it('treats keys with the same params in different insertion order as equal', async () => {
    const cache = new DirectoryCacheService()
    const loader = vi.fn(async () => RESULT)

    await cache.getOrLoad({ ...KEY, params: { pipelineId: 'p-1', limit: '50' } }, loader, TTL_MS)
    await cache.getOrLoad({ ...KEY, params: { limit: '50', pipelineId: 'p-1' } }, loader, TTL_MS)

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('invalidate removes only entries matching the predicate', async () => {
    const cache = new DirectoryCacheService()
    const usersLoader = vi.fn(async () => RESULT)
    const stagesLoader = vi.fn(async () => ALT_RESULT)

    await cache.getOrLoad({ ...KEY, resource: 'users' }, usersLoader, TTL_MS)
    await cache.getOrLoad({ ...KEY, resource: 'stages' }, stagesLoader, TTL_MS)

    cache.invalidate((key) => key.resource === 'users')

    await cache.getOrLoad({ ...KEY, resource: 'users' }, usersLoader, TTL_MS)
    await cache.getOrLoad({ ...KEY, resource: 'stages' }, stagesLoader, TTL_MS)

    expect(usersLoader).toHaveBeenCalledTimes(2)
    expect(stagesLoader).toHaveBeenCalledTimes(1)
  })
})
