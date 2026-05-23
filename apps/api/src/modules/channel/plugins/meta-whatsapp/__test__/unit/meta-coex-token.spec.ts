import {
  exchangeCodeForToken,
  exchangeForRefreshedToken,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-coex-token'
import { MetaConnectFailedException } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-connect-failed.exception'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function makeFetch(responses: { status: number; body?: unknown }[]) {
  const queue = [...responses]
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
    const next = queue.shift() ?? { status: 200, body: {} }
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

const baseUrl = 'https://graph.example/v21.0'
const NOW = new Date('2026-05-22T12:00:00.000Z').getTime()

describe('exchangeCodeForToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('GETs /oauth/access_token with client_id, client_secret, code', async () => {
    const fetchFn = makeFetch([
      { status: 200, body: { access_token: 'biz-token', expires_in: 60 } },
    ])

    const result = await exchangeCodeForToken({
      baseUrl,
      fetchFn,
      appId: 'app-1',
      appSecret: 'secret-1',
      code: 'auth-code-1',
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [input, init] = fetchFn.mock.calls[0]!
    const url = new URL(urlOf(input))
    expect(url.pathname).toBe('/v21.0/oauth/access_token')
    expect(url.searchParams.get('client_id')).toBe('app-1')
    expect(url.searchParams.get('client_secret')).toBe('secret-1')
    expect(url.searchParams.get('code')).toBe('auth-code-1')
    expect(init?.method).toBe('GET')
    expect(result.accessToken).toBe('biz-token')
    expect(result.accessTokenExpiresAt).toBe(new Date(NOW + 60_000).toISOString())
  })

  it('throws MetaConnectFailedException with code-exchange step on non-2xx', async () => {
    const fetchFn = makeFetch([{ status: 400, body: { error: { message: 'invalid code' } } }])

    await expect(
      exchangeCodeForToken({
        baseUrl,
        fetchFn,
        appId: 'app-1',
        appSecret: 'secret-1',
        code: 'bad',
      }),
    ).rejects.toMatchObject({
      code: 'channel.meta-connect-failed',
      context: { step: 'code-exchange', metaStatus: 400, metaError: 'invalid code' },
    })
  })

  it('treats a 200 without access_token as a failure', async () => {
    const fetchFn = makeFetch([{ status: 200, body: { error: { message: 'oops' } } }])

    await expect(
      exchangeCodeForToken({ baseUrl, fetchFn, appId: 'app-1', appSecret: 's', code: 'c' }),
    ).rejects.toBeInstanceOf(MetaConnectFailedException)
  })

  it('returns undefined accessTokenExpiresAt when expires_in is absent', async () => {
    const fetchFn = makeFetch([{ status: 200, body: { access_token: 'biz-token' } }])

    const result = await exchangeCodeForToken({
      baseUrl,
      fetchFn,
      appId: 'a',
      appSecret: 's',
      code: 'c',
    })

    expect(result.accessTokenExpiresAt).toBeUndefined()
  })
})

describe('exchangeForRefreshedToken', () => {
  it('GETs /oauth/access_token with grant_type=fb_exchange_token + the current token', async () => {
    const fetchFn = makeFetch([
      { status: 200, body: { access_token: 'rolled-token', expires_in: 120 } },
    ])

    const result = await exchangeForRefreshedToken({
      baseUrl,
      fetchFn,
      appId: 'app-1',
      appSecret: 'secret-1',
      currentToken: 'old-token',
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const url = new URL(urlOf(fetchFn.mock.calls[0]![0]))
    expect(url.searchParams.get('grant_type')).toBe('fb_exchange_token')
    expect(url.searchParams.get('fb_exchange_token')).toBe('old-token')
    expect(result.accessToken).toBe('rolled-token')
  })

  it('throws MetaConnectFailedException with refresh-exchange step on non-2xx', async () => {
    const fetchFn = makeFetch([{ status: 401, body: { error: { message: 'token expired' } } }])

    await expect(
      exchangeForRefreshedToken({
        baseUrl,
        fetchFn,
        appId: 'a',
        appSecret: 's',
        currentToken: 'expired',
      }),
    ).rejects.toMatchObject({
      context: { step: 'refresh-exchange', metaStatus: 401 },
    })
  })
})
