import {
  subscribeAppToMeta,
  subscribeMetaChannel,
  subscribeWabaToMeta,
} from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-subscribe'
import { MetaSubscriptionFailedException } from '@kizunu/api/modules/channel/plugins/meta-whatsapp/meta-subscription-failed.exception'
import { describe, expect, it, vi } from 'vite-plus/test'

function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function makeFetch(responses: { status: number; body?: unknown }[]): {
  fetchFn: ReturnType<
    typeof vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>
  >
} {
  const queue = [...responses]
  const fetchFn = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
    const next = queue.shift() ?? { status: 200, body: { success: true } }
    return new Response(JSON.stringify(next.body ?? {}), {
      status: next.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  return { fetchFn }
}

function bodyParams(init: RequestInit | undefined): URLSearchParams {
  const raw = typeof init?.body === 'string' ? init.body : ''
  return new URLSearchParams(raw)
}

const baseUrl = 'https://graph.example/v21.0'
const callbackUrl = 'https://api.example/webhooks/meta/channel-1'
const verifyToken = 'fixed-verify-token'

describe('subscribeAppToMeta', () => {
  it('POSTs the app subscription with the App Access Token', async () => {
    const { fetchFn } = makeFetch([{ status: 200, body: { success: true } }])

    await subscribeAppToMeta({
      baseUrl,
      fetchFn,
      appId: 'app-1',
      appSecret: 'secret-1',
      callbackUrl,
      verifyToken,
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [input, init] = fetchFn.mock.calls[0]!
    expect(urlOf(input)).toBe(`${baseUrl}/app-1/subscriptions`)
    expect(init?.method).toBe('POST')
    const params = bodyParams(init)
    expect(params.get('object')).toBe('whatsapp_business_account')
    expect(params.get('fields')).toBe('messages')
    expect(params.get('callback_url')).toBe(callbackUrl)
    expect(params.get('verify_token')).toBe(verifyToken)
    expect(params.get('access_token')).toBe('app-1|secret-1')
  })

  it('throws MetaSubscriptionFailedException with app-subscription step on non-2xx', async () => {
    const { fetchFn } = makeFetch([
      { status: 400, body: { error: { message: 'invalid app secret' } } },
    ])

    await expect(
      subscribeAppToMeta({
        baseUrl,
        fetchFn,
        appId: 'app-1',
        appSecret: 'bad',
        callbackUrl,
        verifyToken,
      }),
    ).rejects.toMatchObject({
      code: 'channel.meta-subscription-failed',
      context: { step: 'app-subscription', metaStatus: 400, metaError: 'invalid app secret' },
    })
  })
})

describe('subscribeWabaToMeta', () => {
  it('POSTs the per-WABA subscription with the customer system token', async () => {
    const { fetchFn } = makeFetch([{ status: 200, body: { success: true } }])

    await subscribeWabaToMeta({
      baseUrl,
      fetchFn,
      wabaId: 'waba-1',
      systemToken: 'sys-token-1',
      callbackUrl,
      verifyToken,
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [input, init] = fetchFn.mock.calls[0]!
    expect(urlOf(input)).toBe(`${baseUrl}/waba-1/subscribed_apps`)
    const params = bodyParams(init)
    expect(params.get('override_callback_uri')).toBe(callbackUrl)
    expect(params.get('verify_token')).toBe(verifyToken)
    expect(params.get('subscribed_fields')).toBe('messages')
    expect(params.get('access_token')).toBe('sys-token-1')
  })

  it('treats HTTP 200 with success:false as a failure', async () => {
    const { fetchFn } = makeFetch([
      {
        status: 200,
        body: { success: false, error: { message: 'waba already subscribed elsewhere' } },
      },
    ])

    await expect(
      subscribeWabaToMeta({
        baseUrl,
        fetchFn,
        wabaId: 'waba-1',
        systemToken: 'sys-token-1',
        callbackUrl,
        verifyToken,
      }),
    ).rejects.toBeInstanceOf(MetaSubscriptionFailedException)
  })

  it('extracts the error message from error.error_data.details when error.message is absent', async () => {
    const { fetchFn } = makeFetch([
      {
        status: 400,
        body: { error: { error_data: { details: 'webhook URL unreachable' } } },
      },
    ])

    await expect(
      subscribeWabaToMeta({
        baseUrl,
        fetchFn,
        wabaId: 'waba-1',
        systemToken: 'sys-token-1',
        callbackUrl,
        verifyToken,
      }),
    ).rejects.toMatchObject({
      context: { step: 'waba-subscription', metaError: 'webhook URL unreachable' },
    })
  })
})

describe('subscribeMetaChannel', () => {
  it('runs both calls in order, builds the per-channel callback URL, and returns a fresh verify token', async () => {
    const { fetchFn } = makeFetch([
      { status: 200, body: { success: true } },
      { status: 200, body: { success: true } },
    ])

    const result = await subscribeMetaChannel({
      baseUrl,
      fetchFn,
      appUrl: 'https://api.example/',
      channelAccountId: 'channel-1',
      appId: 'app-1',
      appSecret: 'secret-1',
      wabaId: 'waba-1',
      systemToken: 'sys-token-1',
    })

    expect(fetchFn).toHaveBeenCalledTimes(2)
    const [appCall, wabaCall] = fetchFn.mock.calls
    expect(urlOf(appCall![0])).toBe(`${baseUrl}/app-1/subscriptions`)
    expect(urlOf(wabaCall![0])).toBe(`${baseUrl}/waba-1/subscribed_apps`)
    // Trailing slash on appUrl is normalized away.
    expect(bodyParams(appCall![1]).get('callback_url')).toBe(
      'https://api.example/webhooks/meta/channel-1',
    )
    expect(result.verifyToken).toMatch(/^[0-9a-f]{64}$/)
    // Both calls use the same generated token.
    expect(bodyParams(appCall![1]).get('verify_token')).toBe(result.verifyToken)
    expect(bodyParams(wabaCall![1]).get('verify_token')).toBe(result.verifyToken)
  })

  it('does not call the WABA endpoint when the app subscription fails', async () => {
    const { fetchFn } = makeFetch([
      { status: 400, body: { error: { message: 'invalid app credentials' } } },
    ])

    await expect(
      subscribeMetaChannel({
        baseUrl,
        fetchFn,
        appUrl: 'https://api.example',
        channelAccountId: 'channel-1',
        appId: 'app-1',
        appSecret: 'bad',
        wabaId: 'waba-1',
        systemToken: 'sys-token-1',
      }),
    ).rejects.toMatchObject({ context: { step: 'app-subscription' } })

    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
