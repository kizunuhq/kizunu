import { runMetaHealth } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-health'
import { describe, expect, it, vi } from 'vite-plus/test'

const BASE = 'https://graph.test/v21.0'

const cloudCredentials = {
  channelMode: 'cloud_api' as const,
  appId: 'app',
  appSecret: 'secret',
  wabaId: 'waba-1',
  phoneNumberId: 'phone-1',
  systemToken: 'sys-tok',
  verifyToken: 'vfy-tok',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fetchByPath(routes: Record<string, () => Response>): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    for (const [path, response] of Object.entries(routes)) {
      if (url.includes(path)) return response()
    }
    throw new Error(`Unexpected fetch call: ${url}`)
  }) as unknown as typeof fetch
}

describe('runMetaHealth', () => {
  it('reports ready for cloud_api with all checks passing', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(200, { id: 'me-1' }),
      '/phone-1': () => jsonResponse(200, { id: 'phone-1' }),
    })

    const health = await runMetaHealth({ fetchFn, baseUrl: BASE }, cloudCredentials)

    expect(health.overall).toBe('ready')
    expect(health.checks.map((check) => check.id)).toEqual(['token', 'phoneNumber', 'verifyToken'])
  })

  it('reports unreachable when /me returns 401', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(401, { error: 'bad' }),
      '/phone-1': () => jsonResponse(200, { id: 'phone-1' }),
    })

    const health = await runMetaHealth({ fetchFn, baseUrl: BASE }, cloudCredentials)

    expect(health.overall).toBe('unreachable')
    expect(health.checks.find((check) => check.id === 'token')?.status).toBe('fail')
  })

  it('reports degraded when /phoneNumberId returns 5xx', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(200, { id: 'me-1' }),
      '/phone-1': () => jsonResponse(503, { error: 'down' }),
    })

    const health = await runMetaHealth({ fetchFn, baseUrl: BASE }, cloudCredentials)

    expect(health.overall).toBe('degraded')
    expect(health.checks.find((check) => check.id === 'phoneNumber')?.status).toBe('fail')
  })

  it('reports verifyToken fail when missing on credentials', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(200, { id: 'me-1' }),
      '/phone-1': () => jsonResponse(200, { id: 'phone-1' }),
    })

    const health = await runMetaHealth(
      { fetchFn, baseUrl: BASE },
      {
        ...cloudCredentials,
        verifyToken: '',
      },
    )

    expect(health.overall).toBe('degraded')
    expect(health.checks.find((check) => check.id === 'verifyToken')?.status).toBe('fail')
  })

  it('adds an expiry check when a coexistence token expires inside the buffer', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(200, { id: 'me-1' }),
      '/phone-1': () => jsonResponse(200, { id: 'phone-1' }),
    })
    const soon = new Date(Date.now() + 60_000).toISOString()

    const health = await runMetaHealth(
      { fetchFn, baseUrl: BASE },
      {
        channelMode: 'coexistence',
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        verifyToken: 'vfy',
        accessToken: 'acc',
        accessTokenExpiresAt: soon,
      },
    )

    expect(health.overall).toBe('degraded')
    expect(health.checks.find((check) => check.id === 'expiry')?.status).toBe('fail')
  })

  it('skips the expiry check for cloud_api credentials', async () => {
    const fetchFn = fetchByPath({
      '/me': () => jsonResponse(200, { id: 'me-1' }),
      '/phone-1': () => jsonResponse(200, { id: 'phone-1' }),
    })

    const health = await runMetaHealth({ fetchFn, baseUrl: BASE }, cloudCredentials)

    expect(health.checks.find((check) => check.id === 'expiry')).toBeUndefined()
  })
})
