import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { del, get, post } from '../../api-client'
import { ApiError } from '../../api-error'

interface FakeResponseInit {
  ok?: boolean
  status?: number
  body?: unknown
}

function fakeResponse({ ok = true, status = 200, body = {} }: FakeResponseInit): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

function mockFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api-client request', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('success responses', () => {
    it('returns the parsed JSON body for a 200 response', async () => {
      mockFetch(fakeResponse({ body: { id: 'user-1' } }))

      const result = await get<{ id: string }>('/auth/me')

      expect(result).toEqual({ id: 'user-1' })
    })

    it('returns an empty object for a 204 response without parsing a body', async () => {
      mockFetch(fakeResponse({ status: 204, ok: true }))

      const result = await post<void>('/auth/logout')

      expect(result).toEqual({})
    })

    it('sends the body as JSON with a JSON content-type', async () => {
      const fetchMock = mockFetch(fakeResponse({ body: {} }))

      await post('/auth/login', { email: 'ada@example.com' })

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('POST')
      expect(init.body).toBe(JSON.stringify({ email: 'ada@example.com' }))
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    })

    it('appends defined query params and omits undefined ones', async () => {
      const fetchMock = mockFetch(fakeResponse({ body: {} }))

      await get('/workspaces/ws-1/members', { page: 2, search: undefined })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('/workspaces/ws-1/members?page=2')
      expect(url).not.toContain('search')
    })
  })

  describe('error responses', () => {
    it('throws an ApiError carrying the status, code, message, and context', async () => {
      mockFetch(
        fakeResponse({
          ok: false,
          status: 422,
          body: {
            code: 'workspace.invalid',
            message: 'Invalid input',
            context: { field: 'email' },
          },
        }),
      )

      const result = get('/workspaces/ws-1/members')

      await expect(result).rejects.toMatchObject({
        status: 422,
        code: 'workspace.invalid',
        message: 'Invalid input',
        context: { field: 'email' },
      })
    })

    it('falls back to generic code and message when the error body is empty', async () => {
      mockFetch(fakeResponse({ ok: false, status: 500, body: {} }))

      const result = del('/workspaces/ws-1/members/m-1')

      await expect(result).rejects.toMatchObject({ code: 'unknown', status: 500 })
    })

    it('raises a network ApiError when the request never reaches the server', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new TypeError('Failed to fetch')
        }),
      )

      const result = get('/auth/me')

      await expect(result).rejects.toBeInstanceOf(ApiError)
      await expect(result).rejects.toHaveProperty('status', 0)
    })
  })
})

describe('ApiError semantic getters', () => {
  it('maps HTTP statuses to intent-named flags', () => {
    expect(new ApiError(0, 'x', 'm').isNetworkError).toBe(true)
    expect(new ApiError(401, 'x', 'm').isUnauthorized).toBe(true)
    expect(new ApiError(403, 'x', 'm').isForbidden).toBe(true)
    expect(new ApiError(409, 'x', 'm').isConflict).toBe(true)
    expect(new ApiError(422, 'x', 'm').isValidation).toBe(true)
    expect(new ApiError(423, 'x', 'm').isLocked).toBe(true)
  })
})
