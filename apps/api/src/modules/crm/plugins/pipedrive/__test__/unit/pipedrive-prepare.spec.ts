import {
  CrmRequestFailedException,
  PipedriveCompanyDomainUnresolvedException,
  PipedriveTokenInvalidException,
} from '@kizunu/api/modules/crm/core/errors/crm.errors'
import { preparePipedriveCredentials } from '@kizunu/api/modules/crm/plugins/pipedrive/pipedrive-prepare'
import { describe, expect, it, vi } from 'vite-plus/test'

const BASE = 'https://api.pipedrive.test'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('preparePipedriveCredentials', () => {
  it('returns the input verbatim when companyDomain is provided', async () => {
    const fetchFn = vi.fn()

    const result = await preparePipedriveCredentials(
      { fetchFn, baseUrlOverride: BASE },
      { apiToken: 'tok', companyDomain: 'acme', activityType: 'task' },
    )

    expect(result).toEqual({ apiToken: 'tok', companyDomain: 'acme', activityType: 'task' })
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('falls through to /users/me when companyDomain is whitespace', async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(200, { data: { company_domain: 'whitespace-resolved' } }),
    )

    const result = await preparePipedriveCredentials(
      { fetchFn, baseUrlOverride: BASE },
      { apiToken: 'tok', companyDomain: '   ', activityType: 'task' },
    )

    expect(result.companyDomain).toBe('whitespace-resolved')
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('throws PipedriveTokenInvalidException on 401', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(401, { error: 'bad token' }))

    await expect(
      preparePipedriveCredentials(
        { fetchFn, baseUrlOverride: BASE },
        { apiToken: 'tok', activityType: 'task' },
      ),
    ).rejects.toBeInstanceOf(PipedriveTokenInvalidException)
  })

  it('throws PipedriveTokenInvalidException on 403', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(403, { error: 'forbidden' }))

    await expect(
      preparePipedriveCredentials(
        { fetchFn, baseUrlOverride: BASE },
        { apiToken: 'tok', activityType: 'task' },
      ),
    ).rejects.toBeInstanceOf(PipedriveTokenInvalidException)
  })

  it('throws CrmRequestFailedException on other non-2xx', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(500, { error: 'server' }))

    await expect(
      preparePipedriveCredentials(
        { fetchFn, baseUrlOverride: BASE },
        { apiToken: 'tok', activityType: 'task' },
      ),
    ).rejects.toBeInstanceOf(CrmRequestFailedException)
  })

  it('throws PipedriveCompanyDomainUnresolvedException when /users/me has no company_domain', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { data: { name: 'someone' } }))

    await expect(
      preparePipedriveCredentials(
        { fetchFn, baseUrlOverride: BASE },
        { apiToken: 'tok', activityType: 'task' },
      ),
    ).rejects.toBeInstanceOf(PipedriveCompanyDomainUnresolvedException)
  })

  it('returns input with derived companyDomain on 200', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(200, { data: { company_domain: 'derived-co' } }))

    const result = await preparePipedriveCredentials(
      { fetchFn, baseUrlOverride: BASE },
      { apiToken: 'tok', activityType: 'task' },
    )

    expect(result).toEqual({ apiToken: 'tok', companyDomain: 'derived-co', activityType: 'task' })
    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE}/users/me?api_token=tok`,
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
