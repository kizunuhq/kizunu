import { runPipedriveHealth } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive-health'
import { describe, expect, it, vi } from 'vite-plus/test'

const BASE = 'https://api.pipedrive.test/v1'

const credentials = {
  apiToken: 'tok',
  companyDomain: 'acme',
  activityType: 'task',
  webhookToken: 'whk-1',
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

describe('runPipedriveHealth', () => {
  it('reports ready when every check passes', async () => {
    const fetchFn = fetchByPath({
      '/users/me': () =>
        jsonResponse(200, { data: { id: 1, email: 'ada@acme.com', company_domain: 'acme' } }),
      '/pipelines': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/stages': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/dealFields': () => jsonResponse(200, { data: [{ id: 1 }] }),
    })

    const health = await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(health.overall).toBe('ready')
    expect(health.checks.every((check) => check.status === 'ok')).toBe(true)
    expect(health.checks.map((check) => check.id)).toEqual([
      'token',
      'user',
      'pipelines',
      'stages',
      'fields',
      'webhook',
    ])
  })

  it('marks overall unreachable when /users/me returns 401', async () => {
    const fetchFn = fetchByPath({
      '/users/me': () => jsonResponse(401, { error: 'bad' }),
      '/pipelines': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/stages': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/dealFields': () => jsonResponse(200, { data: [{ id: 1 }] }),
    })

    const health = await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(health.overall).toBe('unreachable')
    const token = health.checks.find((check) => check.id === 'token')
    expect(token?.status).toBe('fail')
    expect(token?.detail).toContain('Pipedrive rejected')
  })

  it('marks overall degraded when one collection 5xxs', async () => {
    const fetchFn = fetchByPath({
      '/users/me': () => jsonResponse(200, { data: { id: 1, email: 'ada@acme.com' } }),
      '/pipelines': () => jsonResponse(503, { error: 'down' }),
      '/stages': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/dealFields': () => jsonResponse(200, { data: [{ id: 1 }] }),
    })

    const health = await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(health.overall).toBe('degraded')
    const pipelines = health.checks.find((check) => check.id === 'pipelines')
    expect(pipelines?.status).toBe('fail')
    expect(pipelines?.detail).toBe('GET /pipelines -> 503')
  })

  it('marks pipelines fail when the collection is empty', async () => {
    const fetchFn = fetchByPath({
      '/users/me': () => jsonResponse(200, { data: { id: 1, email: 'ada@acme.com' } }),
      '/pipelines': () => jsonResponse(200, { data: [] }),
      '/stages': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/dealFields': () => jsonResponse(200, { data: [{ id: 1 }] }),
    })

    const health = await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(health.overall).toBe('degraded')
    expect(health.checks.find((check) => check.id === 'pipelines')?.status).toBe('fail')
  })

  it('marks webhook fail when credentials lack a webhookToken', async () => {
    const fetchFn = fetchByPath({
      '/users/me': () => jsonResponse(200, { data: { id: 1, email: 'ada@acme.com' } }),
      '/pipelines': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/stages': () => jsonResponse(200, { data: [{ id: 1 }] }),
      '/dealFields': () => jsonResponse(200, { data: [{ id: 1 }] }),
    })

    const health = await runPipedriveHealth(
      { fetchFn, baseUrlOverride: BASE },
      {
        ...credentials,
        webhookToken: undefined,
      },
    )

    expect(health.overall).toBe('degraded')
    expect(health.checks.find((check) => check.id === 'webhook')?.status).toBe('fail')
  })

  it('marks token fail when /users/me throws (network error)', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch

    const health = await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(health.overall).toBe('degraded')
    const token = health.checks.find((check) => check.id === 'token')
    expect(token?.status).toBe('fail')
    expect(token?.detail).toContain('Pipedrive call threw')
  })

  it('runs the four Pipedrive calls in parallel', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      const body = url.includes('/users/me')
        ? { data: { id: 1, email: 'ada@acme.com' } }
        : { data: [{ id: 1 }] }
      return jsonResponse(200, body)
    }) as unknown as typeof fetch

    await runPipedriveHealth({ fetchFn, baseUrlOverride: BASE }, credentials)

    expect(maxInFlight).toBeGreaterThanOrEqual(4)
  })
})
