import type { PipedriveCredentials, PipedriveCredentialsInput } from '@kizunu/api-contracts/crm'
import { z } from 'zod'

import {
  CrmRequestFailedException,
  PipedriveCompanyDomainUnresolvedException,
  PipedriveTokenInvalidException,
} from '../../core/errors/crm.errors'
import type { FetchFn } from './pipedrive-api'

const PIPEDRIVE_API_BASE = 'https://api.pipedrive.com/v1'
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403

const usersMeResponseSchema = z
  .object({
    data: z
      .object({
        company_domain: z.string().optional(),
      })
      .catch({}),
  })
  .catch({ data: {} })

export interface PreparePipedriveContext {
  fetchFn: FetchFn
  baseUrlOverride?: string
}

/**
 * Pipedrive prepareCredentials implementation. When the operator omits
 * `companyDomain`, we resolve it server-side via the domain-independent
 * `GET https://api.pipedrive.com/v1/users/me` endpoint (Pipedrive routes by
 * token rather than by subdomain on that path). A non-empty operator-
 * supplied `companyDomain` is honored verbatim; whitespace-only is treated
 * as omitted so a blanked-out form field auto-derives.
 */
export async function preparePipedriveCredentials(
  ctx: PreparePipedriveContext,
  input: PipedriveCredentialsInput,
): Promise<PipedriveCredentials> {
  const explicitDomain = input.companyDomain?.trim()
  if (explicitDomain && explicitDomain.length > 0) {
    return { ...input, companyDomain: explicitDomain }
  }
  const derived = await fetchCompanyDomain(ctx, input.apiToken)
  return { ...input, companyDomain: derived }
}

async function fetchCompanyDomain(ctx: PreparePipedriveContext, apiToken: string): Promise<string> {
  const base = ctx.baseUrlOverride ?? PIPEDRIVE_API_BASE
  const url = `${base}/users/me?api_token=${apiToken}`
  const response = await ctx.fetchFn(url, { method: 'GET' })
  if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
    throw new PipedriveTokenInvalidException()
  }
  if (!response.ok) {
    throw new CrmRequestFailedException(`Pipedrive GET /users/me -> ${response.status}`)
  }
  const raw: unknown = await response.json().catch(() => ({}))
  const parsed = usersMeResponseSchema.parse(raw)
  const derived = parsed.data.company_domain?.trim() ?? ''
  if (derived.length === 0) {
    throw new PipedriveCompanyDomainUnresolvedException()
  }
  return derived
}
