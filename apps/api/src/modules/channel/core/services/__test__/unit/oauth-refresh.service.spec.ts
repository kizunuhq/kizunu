import type { ChannelPlugin } from '@kizunu/api/modules/channel/core/plugin/channel-plugin'
import { ChannelPluginRegistry } from '@kizunu/api/modules/channel/core/plugin/channel-plugin-registry'
import { OAuthRefreshService } from '@kizunu/api/modules/channel/core/services/oauth-refresh.service'
import type {
  ChannelAccountRepository,
  NearExpiryChannelAccount,
} from '@kizunu/api/modules/channel/persistence/channel-account.repository'
import { describe, expect, it } from 'vite-plus/test'

const NOW = new Date('2026-05-22T12:00:00.000Z')
const REFRESH_BUFFER_MS = 5 * 60_000

interface BuildArgs {
  rows: NearExpiryChannelAccount[]
  plugins: ChannelPlugin[]
  onPersist?: (id: string, credentials: unknown) => void
}

function buildService({ rows, plugins, onPersist }: BuildArgs) {
  const persistCalls: Array<{ id: string; credentials: unknown }> = []
  const accounts = {
    findAllWithCredentials: async () => rows,
    persistCredentials: async (id: string, credentials: unknown) => {
      persistCalls.push({ id, credentials })
      onPersist?.(id, credentials)
    },
  } as unknown as ChannelAccountRepository
  const registry = new ChannelPluginRegistry(plugins)
  const service = new OAuthRefreshService(accounts, registry)
  const refreshDue = () =>
    service.refreshDue({ refreshBufferMs: REFRESH_BUFFER_MS, now: () => NOW })
  return { service, refreshDue, persistCalls }
}

function manifest(id: string): ChannelPlugin['manifest'] {
  return {
    id,
    name: id,
    capabilities: [],
    configSchema: {
      safeParse: () => ({ success: true, data: {} }),
    } as unknown as ChannelPlugin['manifest']['configSchema'],
    credentialFields: { kind: 'flat', fields: [] },
  }
}

function refreshingPlugin(
  id: string,
  refresh: (input: { channelAccountId: string; credentials: unknown }) => Promise<unknown>,
): ChannelPlugin {
  return {
    manifest: manifest(id),
    send: async () => ({ externalMessageId: '', status: 'sent' as const }),
    parseInbound: async () => [],
    validate: () => ({ action: 'error', reason: 'noop' }),
    refreshCredentials: refresh,
  }
}

function staticPlugin(id: string): ChannelPlugin {
  return {
    manifest: manifest(id),
    send: async () => ({ externalMessageId: '', status: 'sent' as const }),
    parseInbound: async () => [],
    validate: () => ({ action: 'error', reason: 'noop' }),
  }
}

describe('OAuthRefreshService.refreshDue', () => {
  it('refreshes a row whose accessTokenExpiresAt lies inside the buffer window', async () => {
    const refreshCalls: string[] = []
    const refreshed = { accessToken: 'new-token', accessTokenExpiresAt: '2026-07-22T00:00:00.000Z' }
    const { refreshDue, persistCalls } = buildService({
      rows: [
        {
          id: 'acc-1',
          pluginId: 'meta-coex',
          credentials: {
            accessToken: 'old-token',
            accessTokenExpiresAt: '2026-05-22T12:02:00.000Z',
          },
        },
      ],
      plugins: [
        refreshingPlugin('meta-coex', async (input) => {
          refreshCalls.push(input.channelAccountId)
          return refreshed
        }),
      ],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 1, failed: 0 })
    expect(refreshCalls).toEqual(['acc-1'])
    expect(persistCalls).toEqual([{ id: 'acc-1', credentials: refreshed }])
  })

  it('skips rows whose plugin does not declare refreshCredentials', async () => {
    const { refreshDue, persistCalls } = buildService({
      rows: [
        {
          id: 'acc-1',
          pluginId: 'static-plugin',
          credentials: {
            accessToken: 'old',
            accessTokenExpiresAt: '2026-05-22T12:02:00.000Z',
          },
        },
      ],
      plugins: [staticPlugin('static-plugin')],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 0, failed: 0 })
    expect(persistCalls).toEqual([])
  })

  it('skips rows whose accessTokenExpiresAt is outside the buffer window', async () => {
    const { refreshDue, persistCalls } = buildService({
      rows: [
        {
          id: 'acc-1',
          pluginId: 'meta-coex',
          credentials: {
            accessToken: 'old',
            accessTokenExpiresAt: '2026-08-22T12:00:00.000Z',
          },
        },
      ],
      plugins: [refreshingPlugin('meta-coex', async () => ({}))],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 0, failed: 0 })
    expect(persistCalls).toEqual([])
  })

  it('skips rows without accessTokenExpiresAt entirely', async () => {
    const { refreshDue, persistCalls } = buildService({
      rows: [{ id: 'acc-1', pluginId: 'meta-coex', credentials: { accessToken: 'old' } }],
      plugins: [refreshingPlugin('meta-coex', async () => ({}))],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 0, failed: 0 })
    expect(persistCalls).toEqual([])
  })

  it('logs and counts a hook failure as failed, leaves the row unchanged', async () => {
    const { refreshDue, persistCalls } = buildService({
      rows: [
        {
          id: 'acc-1',
          pluginId: 'meta-coex',
          credentials: {
            accessToken: 'old',
            accessTokenExpiresAt: '2026-05-22T12:02:00.000Z',
          },
        },
      ],
      plugins: [
        refreshingPlugin('meta-coex', async () => {
          throw new Error('provider 5xx')
        }),
      ],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 0, failed: 1 })
    expect(persistCalls).toEqual([])
  })

  it('processes a mix of due and not-due rows in one pass', async () => {
    const { refreshDue, persistCalls } = buildService({
      rows: [
        {
          id: 'due',
          pluginId: 'meta-coex',
          credentials: {
            accessToken: 'old',
            accessTokenExpiresAt: '2026-05-22T12:01:00.000Z',
          },
        },
        {
          id: 'fresh',
          pluginId: 'meta-coex',
          credentials: {
            accessToken: 'old',
            accessTokenExpiresAt: '2026-12-22T00:00:00.000Z',
          },
        },
      ],
      plugins: [refreshingPlugin('meta-coex', async () => ({ accessToken: 'new' }))],
    })

    const summary = await refreshDue()

    expect(summary).toEqual({ refreshed: 1, failed: 0 })
    expect(persistCalls.map((call) => call.id)).toEqual(['due'])
  })
})
